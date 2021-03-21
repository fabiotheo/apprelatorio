import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
/* eslint camelcase:0 */

@Entity('cdr')
class Cdr {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: '0000-00-00 00:00:00' })
    calldate: Date;

    @Column({ length: 80, nullable: false })
    clid: string;

    @Column({ length: 80, nullable: false })
    src: string;

    @Column({ length: 80, nullable: false })
    dst: string;

    @Column({ length: 80, nullable: false })
    dcontext: string;

    @Column({ length: 80, nullable: true })
    channel: string;

    @Column({ length: 80, nullable: false })
    dstchannel: string;

    @Column({ length: 80, nullable: false })
    lastapp: string;

    @Column({ length: 80, nullable: false })
    lastdata: string;

    @Column({ nullable: false })
    duration: number;

    @Column({ nullable: false })
    billsec: number;

    @Column({ length: 45, nullable: false })
    disposition: string;

    @Column({ nullable: false })
    amaflags: number;

    @Column({ length: 20, nullable: true })
    accountcode: string;

    @Column({ length: 32, nullable: false })
    uniqueid: string;

    @Column({ length: 255, nullable: true })
    userfield: string;
}

export default Cdr;
