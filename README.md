# apprelatorio

Descrição: Esse é um programa feito em Nodejs para ajustar os relatórios do Snep.

Devido à falhas de status no relatório do Snep, essa aplicação analisa a tabela `snep.cdr` em tempo real de cada ligação recebido na fila de atendimento. 

Esse App foi testado com as seguintes configurações:

Linux: Debian 9

Banco de Dados: MariaDB

Versão do Snep: 3.07

### Instalação:

Baixe o app em uma posta onde ele ficará para ser executado pelo seu Linux:

`git clone https://github.com/fabiotheo/apprelatorio.git`

Instalando o nodejs versão 12 para Debian 9 e PM2:

```bash
curl -sL https://deb.nodesource.com/setup_12.x | bash -
apt-get install -y nodejs

curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get -y update && sudo apt-get install yarn

npm install pm2@latest -g
pm2 startup systemd
pm2 install pm2-logrotate
pm2 set pm2-logrotate:retain 5
pm2 reloadLogs
```

Segundo passo é criar um usuário no banco de dados, por questão de segurança, caso você queira alterar o usuário do banco de dados, é só configurar o arquivo localizado na fonte do app em `/ligacaoduplicada/ormconfig.json` e alterar o usuário e senha, por padrão, vamos usar o usuário `relatorio` e a senha `relatoriopass123`. Caso queria alterar é só mudar esse arquivo de configuração no caminho a cima, alterando `username` e `password`:

```json
{
  "name": "default",
  "type": "mysql",
  "host": "127.0.0.1",
  "port": 3306,
  "username": "relatorio",
  "password": "relatoriopass123",
  "database": "snep",
  "synchronize": true,
  "entities": [
    "./dist/models/*.js"
  ],
  "migrations": [
    "./dist/database/migrations/*.js"
  ],
  "cli": {
    "migrationsDir": "./dist/database/migrations/"
  }
}
```

Inserindo Centro de Custo 8 - Transferências. Isso é necessário para pegar as ligações transferidas da fila para outro ramal. caso queira mudar esse código, ele vai estar no arquivo `ligacaoduplicada/src/services/DeleteDuplicateService.ts` linha 203.

```bash
mysql -u relatorio -p -D snep -e "INSERT INTO ccustos (codigo, tipo, nome, descricao)
VALUES ('8', 'O', 'Transferencias', 'Transferencias')"
```

Configurando o AMI do seu Snep:

`/etc/asterisk/manager` adicionar o seguinte usuário:

```
[relatorio]
secret=relatoriopass123
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.0.0.0
writetimeout=5000
read=system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan,originate
write=system,call,log,verbose,command,agent,user,config,command,dtmf,reporting,cdr,dialplan,originate
displayconnects=no
```

Por questão de segurança se quiser alterar login e senha eles estão disponíveis em `~/apprelatorio/src/config/asterisk.ts` 

```jsx
export default {
    port: 5038,
    host: '127.0.0.1',
    login: 'relatorio',
    password: 'relatoriopass123',
};
```

Finalmente, vamos botar seu programa para rodar:

```bash
cd ~/apprelatorio
yarn install
yarn build
pm2 start dist/asterisk.js --name ajusteRelatorioSnep
```

Caso queira acompanhar os log's do programa execute:

```bash
pm2 logs -f ajusteRelatorioSnep
```

### Configurando o seu Snep:

**O primeiro passo** é criar uma regra para a entrada da ligação no Snep, essa regra vai funcionar somente quando a ligação será enviada para a fila de atendimento:

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/594383b1-157e-4f0f-a2cc-4d461869abfc/Captura_de_Tela_2021-02-21_as_15.25.56.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/594383b1-157e-4f0f-a2cc-4d461869abfc/Captura_de_Tela_2021-02-21_as_15.25.56.png)

*Atente-se para a correta criação dos centros de custo, cada fila deve ter um centro de custo separado.* 

**O segundo passo** para corrigir isso, ao mandar uma ligação para a fila, devemos criar um novo contexto, de acordo com o contexto enviado na regra criada logo a cima. 

```bash
[filaSuporte]
exten => _.,1,NoOp(Contexto de envio de ligação para fila Suporte)
exten => _.,n,Answer()
exten => _.,n,Queue(suporte,t,,,180)
exten => _.,n,NoOp(O Status da Ligação é: ${QUEUESTATUS})
exten => _.,n,NoOp(001 Disposition da Ligação é: ${CDR(disposition)})
exten => _.,n,Playback(filaOut)
exten => _.,n,NoOp(002 Disposition da Ligação é: ${CDR(disposition)})
exten => _.,n,Hangup()
```

**Explicação:**

**Answer →** Atende a ligacão
**Queue(suporte,t,,,180) →** Envia a ligação para a fila suporte com 180 segudos de timeout
**Playback(filaOut) →** Musica avisando que não existe nenhum agente disponível, caso o status da fila seja ***TIMEOUT*** ou ***JOINEMPTY***
**Hangup() →** desliga a ligação

**Exemplo de como fica o relatório:**

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/d7e4cea1-2249-40a6-ac42-c32c4a414754/Captura_de_Tela_2021-02-21_as_15.24.56.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/d7e4cea1-2249-40a6-ac42-c32c4a414754/Captura_de_Tela_2021-02-21_as_15.24.56.png)

Se a ligação não é atendida, o destino fica original. Se a ligação é atendida, o destino é o ramal que atendeu. 

### Exemplo de como se cria uma fila dentro do asterisk:

Dentro de /etc/asterisk/queues.conf criar a seguinte fila:

```bash
[suporte]
musicclass=default
;strategy=linear
strategy=ringall
timeout=30
servicelevel=30
joinempty=strict
memberdelay=0
maxlen=0
announce-frequency=40
min-announce-frequency=15
announce-holdtime=no
announce-position=yes
reportholdtime=no
ringinuse=no
queue-youarenext=queue-youarenext
queue-thereare=queue-thereare
;queue-callswaiting=queue-callswaiting
;queue-holdtime=queue-holdtime
;queue-minutes=queue-minutes
queue-thankyou=
wrapuptime=5
member=SIP/1000
member=SIP/9999
member=SIP/9998
;member=SIP/9000
```

joinempty é para que não entre ligações na fila quando não tem agentes/ramais onlines. 

Exemplo no qual o joinempty vai funcionar:

```bash
suporte has 0 calls (max unlimited) in 'ringall' strategy (2s holdtime, 3s talktime), W:0, C:3, A:1, SL:100.0% within 30s
Members: 
      SIP/9998 (ringinuse disabled) (Unavailable) has taken no calls yet
      SIP/9999 (ringinuse disabled) (Unavailable) has taken 3 calls (last was 9927 secs ago)
      SIP/1000 (ringinuse disabled) (Unavailable) has taken no calls yet
   No Callers
```

Quando o status do ramal for Unavailable ou quando não tiver ramais/agentes na fila. 

# Segunda opção de funcionamento

**Essa opção eu ainda não está validada por completo.** 

Nesse segundo cenário caso o cliente deseje que após a ligação saia da fila, por não atendimento, essa ligação seja enviada para um outro ramal, ou outra fila. 

Criar o seguinte contexto ao invés do primeiro:

```bash
[suporte]
exten => _.,1,NoOp(Contexto de envio de ligação para fila Suporte)
exten => _.,n,Answer()
exten => _.,n,Queue(IPCOM,t,,,180)
exten => _.,n,NoOp(O Status da Ligação é: ${QUEUESTATUS})
exten => _.,n,NoOp(001 Disposition da Ligação é: ${CDR(disposition)})
exten => _.,n,NoOp(Verificando o status da Ligação)
exten => _.,n,GotoIf($["${CDR(disposition)}" = "NO ANSWER"]?noanswer)
exten => _.,n,Hangup()
exten => _.,n(noanswer),Goto(default,naoatendido,1)
exten => _.,n,Hangup()
```

Nesse caso, caso a ligação seja marcada como não atendida caso ela não seja atendida na fila. Sendo assim caso isso seja verdadeiro, a ligação será enviada para o contexto default, e nesse caso para o destino ***naoatendido***. 

No snep iremos criar a seguinte regra:

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/e9d7eb61-8e87-4eec-ac93-3d6ad478a70b/Captura_de_Tela_2021-02-21_as_15.44.42.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/e9d7eb61-8e87-4eec-ac93-3d6ad478a70b/Captura_de_Tela_2021-02-21_as_15.44.42.png)

Problemas dessa configuração, no relatório não irá aparecer as ligações enviada para a fila, somente para para o contexto não atendido. Exemplo:

![https://s3-us-west-2.amazonaws.com/secure.notion-static.com/1a816dea-3542-4ece-b772-74e64d7097c9/Captura_de_Tela_2021-02-21_as_15.46.08.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/1a816dea-3542-4ece-b772-74e64d7097c9/Captura_de_Tela_2021-02-21_as_15.46.08.png)

Nesse caso, criamos um centro de custo ***Não Atendidas Fila 1*** para sinalizar que essas ligações vieram da fila 1.
