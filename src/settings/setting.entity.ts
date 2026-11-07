import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Bảng chỉ có 1 dòng: cấu hình toàn hệ thống
@Entity()
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' }) facilityName: string;
  @Column({ default: '' }) address: string;
  @Column({ default: '' }) ownerName: string;
  @Column({ default: '' }) ownerPhone: string;
  @Column({ default: '' }) bankName: string;
  @Column({ default: '' }) bankAccount: string;
  @Column({ default: '' }) bankHolder: string;

  @Column({ default: 3500 }) electricPrice: number; // đ/kWh
  @Column({ default: 18000 }) waterPrice: number; // đ/m3
  @Column({ default: 100000 }) waterPerPerson: number; // khoán nước theo người
  @Column({ default: 50000 }) servicePrice: number; // rác + vệ sinh / phòng / tháng
  @Column({ default: 80000 }) internetPrice: number; // internet / phòng / tháng

  @Column({ default: 25 }) meterCloseDay: number;
  @Column({ default: 1 }) rentDueFrom: number;
  @Column({ default: 5 }) rentDueTo: number;
}
