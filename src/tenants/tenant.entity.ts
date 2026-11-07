import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Room } from '../rooms/room.entity';

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullName: string;

  @Column()
  idCard: string; // CCCD

  @Column()
  phone: string;

  @Column()
  roomId: number;

  @ManyToOne(() => Room, (room) => room.tenants, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'date' })
  moveInDate: string;

  @Column({ type: 'date' })
  contractEndDate: string;

  @Column({ default: 0 })
  deposit: number;

  @Column({ default: 1 })
  people: number; // số người ở

  @Column({ default: 5 })
  dueDay: number; // ngày đóng tiền hàng tháng

  // Chỉ số công tơ lúc nhận phòng (dùng làm "chỉ số cũ" của kỳ đầu tiên)
  @Column({ default: 0 })
  elecStart: number;

  @Column({ default: 0 })
  waterStart: number;

  @Column({ default: true })
  isStaying: boolean; // false = đã trả phòng

  @CreateDateColumn()
  createdAt: Date;
}
