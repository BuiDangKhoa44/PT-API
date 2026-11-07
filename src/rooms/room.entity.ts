import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export type RoomStatus = 'RENTED' | 'VACANT' | 'MAINTENANCE';

@Entity()
export class Room {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string; // '101'

  @Column()
  name: string; // 'Phòng Studio'

  @Column()
  floor: number;

  @Column()
  area: number; // m2

  @Column()
  price: number; // tiền thuê / tháng (VNĐ)

  @Column({ type: 'varchar', default: 'VACANT' })
  status: RoomStatus;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  // Thông tin khi phòng đang bảo trì
  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ type: 'date', nullable: true })
  expectedDone: string | null;

  @Column({ type: 'varchar', nullable: true })
  technician: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Tenant, (tenant) => tenant.room)
  tenants: Tenant[];
}
