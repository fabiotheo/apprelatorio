import '../database';
import 'dotenv/config';
import { getRepository } from 'typeorm';
import Cdr from '../models/Cdr';

interface RequestDTO {
    uniqueid: string;
}

interface RequestAnswerdDTO {
    uniqueid: string;
    destinationchannel: string;
}

class DeleteDuplicateService {
    public async executeAnswared({ uniqueid, destinationchannel }: RequestAnswerdDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });

        if (cdrAll) {
            await cdrAll.map(async cdrOneRow => {
                const { disposition, lastapp, dstchannel } = cdrOneRow;
                if (disposition === 'NO ANSWER' && lastapp === 'Queue') {
                    await table.delete(cdrOneRow);
                    console.log(`Register deleted uniqueid ${uniqueid}`);
                } else if (disposition === 'ANSWERED' && lastapp === 'Queue') {
                    const [channel] = destinationchannel.split('-');
                    const [, peer] = channel.split('/');

                    // Se for ligação com transferência, ajustar o ramal que atendeu
                    if (peer.includes('@transferencias')) {
                        // const [peerTransferred] = peer.split('@');
                        // peer = peerTransferred;
                        // cdrOneRow.dst = peer;
                        // await table.save(cdrOneRow);
                        console.log(`Deleting ANSWERED ${uniqueid}`);
                        await table.delete(cdrOneRow);
                    } else if (!peer.includes('@transferencias') && !dstchannel.includes('@transferencias')) {
                        cdrOneRow.dst = peer;
                        await table.save(cdrOneRow);
                    }
                }
            });
        }
    }

    public async executeAnsweredWhereNotAnswered({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        let existsAnswerRow: Cdr[] = [];

        if (cdrAll) {
            existsAnswerRow = cdrAll.filter(row => {
                if (row.disposition === 'ANSWERED' && row.lastapp === 'Queue') {
                    return row;
                }
                return false;
            });
        }

        if (existsAnswerRow.length) {
            console.log('Ajustando ligação atendida na validação de não atendida');
            const cdrAll2 = await table.find({ where: { uniqueid } });
            if (cdrAll2) {
                await cdrAll2.map(async row => {
                    const { lastapp, disposition, dcontext } = row;
                    if (lastapp === 'Queue' && disposition === 'NO ANSWER') {
                        await table.delete(row);
                        console.log(`Register deleted after validation uniqueid ${row}`);
                    } else if (lastapp === 'Queue' && disposition === 'BUSY') {
                        await table.delete(row);
                        console.log(`Register deleted after validation uniqueid ${row}`);
                    } else if (lastapp === 'Dial' && dcontext === 'transferencias' && disposition === 'NO ANSWER') {
                        row.accountcode = '8';
                        await table.save(row);
                        console.log(`Register altered after validation uniqueid ${row}`);
                    }
                });
            }
        }
    }

    public async executeNotAnswaredTimeLimit({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        if (cdrAll) {
            await cdrAll.map(async cdrOneRow => {
                const { lastapp, dstchannel, lastdata, disposition, dcontext, duration, billsec } = cdrOneRow;
                if (
                    lastapp === 'Hangup' &&
                    !dstchannel &&
                    !lastdata &&
                    disposition === 'ANSWERED' &&
                    dcontext !== 'default' &&
                    duration !== 0 &&
                    billsec !== 0
                ) {
                    cdrOneRow.disposition = 'NO ANSWER';
                    await table.save(cdrOneRow);
                    console.log(`Register altered uniqueid ${uniqueid}`);
                }
            });
        }
    }

    public async executeTransferredAlterStatus({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        if (cdrAll) {
            await cdrAll.map(async cdrOneRow => {
                const { lastapp, duration, billsec, dcontext } = cdrOneRow;
                if (lastapp === 'Hangup' && duration === 0 && billsec === 0 && dcontext === 'transferencias') {
                    // cdrOneRow.disposition = 'NO ANSWER';
                    // await table.save(cdrOneRow);
                    // console.log(`Register altered uniqueid ${uniqueid}`);
                    await table.delete(cdrOneRow);
                    console.log(`executeTransferredAlterStatus: Register deleted uniqueid ${uniqueid}`);
                }
            });
        }
    }

    public async executeTransfferredDelete({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        if (cdrAll) {
            await cdrAll.map(async cdrOneRow => {
                const { lastapp, duration, billsec } = cdrOneRow;
                if (lastapp === 'Dial' && duration === 0 && billsec === 0) {
                    await table.delete(cdrOneRow);
                    console.log(`Register removed uniqueid: ${uniqueid}`);
                }
            });
        }
    }

    public async executeTransferred({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });

        if (cdrAll) {
            await cdrAll.map(async cdrOneRow => {
                await table.delete(cdrOneRow);
                console.log(`Register deleted uniqueid ${uniqueid}`);
            });
        }
    }

    public async executePlayback({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });

        await cdrAll.map(async cdrOneRow => {
            cdrOneRow.disposition = 'NO ANSWER';
            await table.save(cdrOneRow);
        });
    }

    public async executeTransferredError({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        await cdrAll.map(async cdrOneRow => {
            const { dst, userfield } = cdrOneRow;
            if (!dst && !userfield) {
                await table.delete(cdrOneRow);
                console.log(`Register removed uniqueid ${uniqueid}`);
            }
        });
    }

    public async executeChangeAnswerToNotAnswer({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        await cdrAll.map(async cdrOneRow => {
            const { dstchannel, lastapp, disposition } = cdrOneRow;
            if (!dstchannel && lastapp === 'Queue' && disposition === 'ANSWERED') {
                cdrOneRow.disposition = 'NO ANSWER';
                await table.save(cdrOneRow);
                console.log(`Register altered uniqueid ${uniqueid}`);
            }
        });
    }

    public async executeJoinEmpty({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        await cdrAll.map(async cdrOneRow => {
            const { dstchannel, lastapp, disposition } = cdrOneRow;
            if (!dstchannel && lastapp === 'Dial' && disposition === 'ANSWERED') {
                cdrOneRow.disposition = 'NO ANSWER';
                await table.save(cdrOneRow);
                console.log(`Register altered uniqueid ${uniqueid}`);
            }
        });
    }

    public async executeTransferredNormal({ uniqueid }: RequestDTO): Promise<void> {
        const table = getRepository(Cdr);
        const cdrAll = await table.find({ where: { uniqueid } });
        await cdrAll.map(async cdrOneRow => {
            const { lastapp, dcontext, dstchannel } = cdrOneRow;
            if (dstchannel && dcontext === 'transferencias' && lastapp === 'Dial') {
                cdrOneRow.accountcode = '8';
                await table.save(cdrOneRow);
                console.log(`executeTransferredNormal: Register altered uniqueid ${uniqueid}`);
            }
        });
    }
}

export default DeleteDuplicateService;
