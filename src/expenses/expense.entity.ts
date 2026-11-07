import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Chi phí vận hành (bảo trì, sửa chữa...) — dùng cho Dashboard và Báo cáo
@Entity()
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  period: string; // 'YYYY-MM'

  @Column({ default: 'MAINTENANCE' })
  category: string;

  @Column()
  amount: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
