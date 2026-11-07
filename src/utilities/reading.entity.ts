import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Room } from '../rooms/room.entity';

// Chỉ số công tơ của 1 phòng trong 1 kỳ. Mỗi (phòng, kỳ) chỉ có 1 dòng.
@Entity()
@Index(['roomId', 'period'], { unique: true })
export class Reading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: number;

  @ManyToOne(() => Room, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column()
  period: string; // 'YYYY-MM'

  @Column() elecOld: number;
  @Column({ type: 'int', nullable: true }) elecNew: number | null;
  @Column() waterOld: number;
  @Column({ type: 'int', nullable: true }) waterNew: number | null;
}
