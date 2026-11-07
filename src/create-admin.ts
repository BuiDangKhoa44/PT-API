// Tạo hoặc ĐẶT LẠI mật khẩu tài khoản, không ảnh hưởng dữ liệu khác.
// Dùng: npm run create-admin
//   hoặc npm run create-admin -- tenDangNhap matKhauMoi
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { User } from './auth/user.entity';

async function run() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || '123456';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const repo = app.get(DataSource).getRepository(User);
  const hash = await bcrypt.hash(password, 10);

  const user = await repo.findOneBy({ username });
  if (user) {
    user.password = hash; // tài khoản đã có (kể cả dòng bạn tự tạo) -> ghi đè bằng mật khẩu đã băm
    await repo.save(user);
    console.log(`Đã đặt lại mật khẩu cho "${username}".`);
  } else {
    await repo.save(
      repo.create({ username, password: hash, fullName: 'Quản trị viên', role: 'ADMIN' }),
    );
    console.log(`Đã tạo tài khoản "${username}".`);
  }
  await app.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});