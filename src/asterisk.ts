import 'babel-polyfill';
import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Asterisk from 'asterisk-manager';

import asteriskConfig from './config/asterisk';
import DeleteDuplicateService from './services/DeleteDuplicateService';

const ami = new Asterisk(asteriskConfig.port, asteriskConfig.host, asteriskConfig.login, asteriskConfig.password, true);

ami.on('error', (err: any) => {
    console.log(err);
});

ami.keepConnected();

ami.on('managerevent', async (events: any) => {
    if (events.event === 'Cdr') {
        const {
            uniqueid,
            billableseconds,
            destination,
            destinationchannel,
            destinationcontext,
            disposition,
            duration,
            lastapplication,
            lastdata,
            userfield,
        } = events;
        console.log('Eventro de Entrada no CDR');
        console.log(events);

        // Ligação Atendida na Fila
        if (disposition === 'ANSWERED' && lastapplication === 'Queue' && destinationchannel) {
            console.log('executeAnswared');
            console.log(events);

            if (lastapplication && uniqueid && disposition && destinationchannel && userfield) {
                const deleteDuplicateService = new DeleteDuplicateService();
                await deleteDuplicateService.executeAnswared({ uniqueid, destinationchannel });
            }
        }

        // Ligação Atendida na Fila e Transferida pelo *2
        else if (destinationcontext === 'transferencias' && !lastapplication) {
            console.log('executeTransferred - Transferencias');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeTransferred({ uniqueid });
        }

        // Ligação Atendida na Fila e Transferida pelo *1, alterando registro da transferencia
        else if (
            billableseconds === '0' &&
            duration === '0' &&
            !destinationchannel &&
            lastapplication === 'Hangup' &&
            destinationcontext === 'transferencias'
        ) {
            console.log('executeTransferredAlterStatus');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeTransferredAlterStatus({ uniqueid });
        }

        // Ligação Atendida na Fila e Transferida pelo *2, deletando registro de transferência na fila
        else if (billableseconds === '0' && duration === '0' && !destinationchannel && lastapplication === 'Dial') {
            console.log('executeTransfferredDelete');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeTransfferredDelete({ uniqueid });
        }

        // Ligação Não atendida na Fila - Tempo Limite Atingido
        else if (disposition === 'ANSWERED' && lastapplication === 'Hangup' && !lastdata && !destinationchannel) {
            console.log('executeNotAnswaredTimeLimit');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeNotAnswaredTimeLimit({ uniqueid });
        }

        // Ligação Atendida mas com Evento de Não Atendida
        if (disposition === 'NO ANSWER' && lastapplication === 'Queue') {
            console.log('executeAnsweredWhereNotAnswered');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeAnsweredWhereNotAnswered({ uniqueid });
        }

        // Ligação Atendida mas com Evento de Ocupada
        else if (disposition === 'BUSY' && lastapplication === 'Queue') {
            console.log('executeAnsweredWhereNotAnswered');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeAnsweredWhereNotAnswered({ uniqueid });
        }

        // Ligação Entrou na Fila com agentes offline ou em pausa (joinempty=strict)
        // filaOut é o audio da musica que toca antes de desligar a ligação
        else if (lastapplication === 'Playback' && lastdata === 'filaOut') {
            console.log('executePlayback');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executePlayback({ uniqueid });
        }

        // Ligação Entrou esta na fila e Transferiu errado
        else if (disposition === 'ANSWERED' && lastapplication === 'AppDial' && !destination && !userfield) {
            console.log('executeTransferredError');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeTransferredError({ uniqueid });
        }

        // Ligação Entrou na fila, marcada como atendida mas não tem destinationchannel, isto é, não foi atendida
        else if (lastapplication === 'Queue' && destination && disposition === 'ANSWERED' && !destinationchannel) {
            console.log('executeChangeAnswerToNotAnswer');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeChangeAnswerToNotAnswer({ uniqueid });
        }

        // Ligação entrou na fila, e saiu com status JOINEMPTY
        else if (!destinationchannel && disposition === 'ANSWERED' && lastapplication === 'Dial') {
            console.log('executeJoinEmpty');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeJoinEmpty({ uniqueid });
        } else if (destination && destinationcontext === 'transferencias' && lastapplication === 'Dial') {
            console.log('executeTransferredNormal');
            console.log(events);

            const deleteDuplicateService = new DeleteDuplicateService();
            await deleteDuplicateService.executeTransferredNormal({ uniqueid });
        }
    }
});
