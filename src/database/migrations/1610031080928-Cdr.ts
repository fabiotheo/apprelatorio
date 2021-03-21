import { MigrationInterface, QueryRunner, Table } from 'typeorm';

// eslint-disable-next-line import/prefer-default-export
export class Cdr1610031080928 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'cdr',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                    },
                    {
                        name: 'caldate',
                        type: 'datetime',
                    },
                    {
                        name: 'clid',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'src',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'dst',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'dcontext',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'channel',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'dstchannel',
                        type: 'varchar(80)',
                        isPrimary: true,
                    },
                    {
                        name: 'lastapp',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'lastdata',
                        type: 'varchar(80)',
                    },
                    {
                        name: 'duration',
                        type: 'int(11)',
                    },
                    {
                        name: 'billsec',
                        type: 'int(11)',
                    },
                    {
                        name: 'disposition',
                        type: 'varchar(45)',
                    },
                    {
                        name: 'amaflags',
                        type: 'int(20)',
                    },
                    {
                        name: 'accountcode',
                        type: 'varchar(20)',
                    },
                    {
                        name: 'uniqueid',
                        type: 'varchar(32)',
                    },
                    {
                        name: 'userfield',
                        type: 'varchar(255)',
                    },
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('cdr');
    }
}
