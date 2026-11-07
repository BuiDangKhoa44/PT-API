// Nạp dữ liệu mẫu: npm run seed        (chỉ nạp nếu DB đang trống)
//                  npm run seed:reset  (XÓA SẠCH bảng rồi nạp lại)
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { User } from './auth/user.entity';
import { Room } from './rooms/room.entity';
import { Tenant } from './tenants/tenant.entity';
import { Reading } from './utilities/reading.entity';
import { Invoice } from './invoices/invoice.entity';
import { Expense } from './expenses/expense.entity';
import { InvoicesService } from './invoices/invoices.service';
import { SettingsService } from './settings/settings.service';
import { addDays, toIsoDate } from './common/utils';

const PERIODS = ['2024-06', '2024-07', '2024-08', '2024-09', '2024-10'];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const ds = app.get(DataSource);
  const reset = process.argv.includes('--reset');

  if (reset) {
    await ds.synchronize(true); // drop + tạo lại toàn bộ bảng
    console.log('Đã xóa và tạo lại các bảng.');
  } else if ((await ds.getRepository(User).count()) > 0) {
    console.log('Database đã có dữ liệu. Dùng "npm run seed:reset" nếu muốn nạp lại từ đầu.');
    await app.close();
    return;
  }

  // 1. Tài khoản
  await ds.getRepository(User).save({
    username: 'admin',
    password: await bcrypt.hash('123456', 10),
    fullName: 'Quản trị viên',
    role: 'ADMIN',
  });

  // 2. Cấu hình
  await app.get(SettingsService).update({
    facilityName: 'Dãy trọ An Bình',
    address: 'Số 128/4 Đỗ Xuân Hợp, Phường Phước Long B, TP. Thủ Đức, TP.HCM',
    ownerName: 'Trần Quốc Bảo',
    ownerPhone: '0908 123 456',
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    bankAccount: '0388 999 888 777',
    bankHolder: 'TRAN QUOC BAO',
    electricPrice: 3500,
    waterPrice: 18000,
    waterPerPerson: 100000,
    servicePrice: 50000,
    internetPrice: 80000,
    meterCloseDay: 25,
    rentDueFrom: 1,
    rentDueTo: 5,
  });

  // 3. Phòng (12 phòng, 3 tầng)
  const roomData: Partial<Room>[] = [
    { code: '101', name: 'Phòng Studio', floor: 1, area: 25, price: 3400000, status: 'RENTED' },
    { code: '102', name: 'Phòng Gác lửng', floor: 1, area: 28, price: 3600000, status: 'VACANT', note: 'Đã vệ sinh hoàn tất' },
    { code: '103', name: 'Phòng Cơ bản', floor: 1, area: 20, price: 2900000, status: 'RENTED' },
    { code: '104', name: 'Phòng Gác lửng', floor: 1, area: 28, price: 3500000, status: 'MAINTENANCE',
      reason: 'Sửa máy lạnh & Vòi sen', expectedDone: toIsoDate(addDays(new Date(), 3)), technician: 'Chú Bảy Thợ Điện' },
    { code: '201', name: 'Ban công thoáng', floor: 2, area: 30, price: 4200000, status: 'RENTED' },
    { code: '202', name: 'Phòng Gác lửng', floor: 2, area: 28, price: 3300000, status: 'VACANT', note: 'Đã sơn sửa mới' },
    { code: '203', name: 'Phòng Ban công', floor: 2, area: 28, price: 3800000, status: 'RENTED' },
    { code: '204', name: 'Phòng Cơ bản', floor: 2, area: 22, price: 3000000, status: 'RENTED' },
    { code: '301', name: 'Phòng Cửa sổ lớn', floor: 3, area: 24, price: 3200000, status: 'RENTED' },
    { code: '302', name: 'Phòng Studio', floor: 3, area: 26, price: 3500000, status: 'RENTED' },
    { code: '303', name: 'Phòng Ban công', floor: 3, area: 28, price: 4000000, status: 'RENTED' },
    { code: '304', name: 'Phòng Gác lửng', floor: 3, area: 28, price: 3600000, status: 'MAINTENANCE',
      reason: 'Thay máy bơm & phao điện', expectedDone: toIsoDate(addDays(new Date(), 7)), technician: 'Anh Tư Thợ Nước' },
  ];
  const rooms = await ds.getRepository(Room).save(roomData.map((r) => ds.getRepository(Room).create(r)));
  const roomByCode = new Map(rooms.map((r) => [r.code, r]));

  // 4. Khách thuê (mỗi phòng RENTED 1 khách). daysLeft = số ngày còn lại của hợp đồng (từ hôm nay)
  const tenantData = [
    { room: '101', fullName: 'Nguyễn Văn An', idCard: '001201004928', phone: '0912 345 678', moveIn: '2023-03-15', daysLeft: 200, deposit: 3500000, people: 2, dueDay: 5 },
    { room: '103', fullName: 'Lê Thị Hoàng Yến', idCard: '079195001122', phone: '0974 119 502', moveIn: '2023-08-01', daysLeft: 150, deposit: 2900000, people: 1, dueDay: 2 },
    { room: '201', fullName: 'Vũ Minh Đức', idCard: '001194002341', phone: '0945 123 789', moveIn: '2022-11-10', daysLeft: 10, deposit: 4200000, people: 2, dueDay: 5 },
    { room: '203', fullName: 'Ngô Thanh Vân', idCard: '034199008215', phone: '0988 224 781', moveIn: '2023-05-20', daysLeft: 120, deposit: 3800000, people: 1, dueDay: 10 },
    { room: '204', fullName: 'Phạm Thu Hương', idCard: '079195006674', phone: '0938 998 877', moveIn: '2023-09-12', daysLeft: 90, deposit: 3000000, people: 2, dueDay: 5 },
    { room: '301', fullName: 'Đinh Hoàng Long', idCard: '031190005512', phone: '0932 771 849', moveIn: '2023-01-05', daysLeft: -5, deposit: 3200000, people: 1, dueDay: 8 },
    { room: '302', fullName: 'Trần Anh Quân', idCard: '025188001192', phone: '0918 423 882', moveIn: '2023-06-18', daysLeft: 300, deposit: 3500000, people: 3, dueDay: 5 },
    { room: '303', fullName: 'Lê Hoàng Nam', idCard: '025188009913', phone: '0903 112 233', moveIn: '2023-04-02', daysLeft: 20, deposit: 4000000, people: 2, dueDay: 5 },
  ];
  const tenants: Tenant[] = [];
  for (let i = 0; i < tenantData.length; i++) {
    const t = tenantData[i];
    tenants.push(
      await ds.getRepository(Tenant).save({
        fullName: t.fullName,
        idCard: t.idCard,
        phone: t.phone,
        roomId: roomByCode.get(t.room).id,
        moveInDate: t.moveIn,
        contractEndDate: toIsoDate(addDays(new Date(), t.daysLeft)),
        deposit: t.deposit,
        people: t.people,
        dueDay: t.dueDay,
        elecStart: 1000 + i * 150,
        waterStart: 50 + i * 10,
        isStaying: true,
      }),
    );
  }

  // 5. Chỉ số điện nước 5 kỳ. Kỳ 2024-10: 2 phòng cuối CHƯA chốt (để Dashboard hiện việc cần làm)
  for (let i = 0; i < tenants.length; i++) {
    let elec = tenants[i].elecStart;
    let water = tenants[i].waterStart;
    for (let pi = 0; pi < PERIODS.length; pi++) {
      const elecNew = elec + 60 + ((i * 7 + pi * 13) % 70);
      const waterNew = water + 4 + ((i * 3 + pi * 5) % 9);
      const skip = PERIODS[pi] === '2024-10' && i >= tenants.length - 2;
      if (!skip) {
        await ds.getRepository(Reading).save({
          roomId: tenants[i].roomId, period: PERIODS[pi],
          elecOld: elec, elecNew, waterOld: water, waterNew,
        });
      }
      elec = elecNew;
      water = waterNew;
    }
  }

  // 6. Hóa đơn: dùng đúng hàm generate() của service để số tiền khớp công thức thật
  const invoicesService = app.get(InvoicesService);
  for (const p of PERIODS) await invoicesService.generate(p);

  const invRepo = ds.getRepository(Invoice);
  for (const p of PERIODS.slice(0, -1)) {
    await invRepo.update({ period: p }, { status: 'PAID', paidAt: new Date(), method: 'Chuyển khoản (VietQR)' });
  }
  const latest = await invRepo.find({ where: { period: '2024-10' }, order: { id: 'ASC' } });
  const methods = ['Chuyển khoản (VietQR)', 'Tiền mặt trực tiếp', 'Chuyển khoản liên NH'];
  for (let i = 0; i < latest.length; i++) {
    const inv = latest[i];
    if (i < latest.length - 2) {
      await invRepo.update(inv.id, { status: 'PAID', paidAt: new Date(), method: methods[i % 3] });
    } else if (i === latest.length - 2) {
      // PENDING: dời hạn thu sang tương lai để không bị tự chuyển OVERDUE
      await invRepo.update(inv.id, { status: 'PENDING', dueDate: toIsoDate(addDays(new Date(), 5)) });
    } else {
      await invRepo.update(inv.id, { status: 'OVERDUE' }); // hạn thu năm 2024 -> đã quá hạn
    }
  }

  // 7. Chi phí bảo trì mỗi kỳ
  const costs = [450000, 650000, 1200000, 900000, 2430000];
  await ds.getRepository(Expense).save(
    PERIODS.map((p, i) => ({
      period: p, category: 'MAINTENANCE', amount: costs[i],
      note: i === PERIODS.length - 1 ? 'Thay máy bơm & phao điện' : 'Bảo trì định kỳ',
    })),
  );

  console.log('Nạp dữ liệu mẫu xong. Đăng nhập: admin / 123456');
  await app.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
