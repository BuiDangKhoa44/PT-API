import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string; // đã băm bằng bcrypt, KHÔNG lưu mật khẩu thô

  @Column()
  fullName: string;

  @Column({ default: 'ADMIN' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;
}
