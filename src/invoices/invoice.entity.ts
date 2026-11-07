import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Room } from '../rooms/room.entity';
import { Tenant } from '../tenants/tenant.entity';

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE';

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // HD-202410-101

  @Column()
  roomId: number;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  period: string; // 'YYYY-MM'

  @Column() rent: number; // tiền phòng
  @Column() electricKwh: number; // số điện tiêu thụ
  @Column() electric: number; // tiền điện
  @Column() water: number; // tiền nước
  @Column() service: number; // rác + vệ sinh + internet
  @Column() total: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: InvoiceStatus;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  method: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
