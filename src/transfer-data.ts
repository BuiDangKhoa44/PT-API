// Chép dữ liệu từ DB local (SRC_*) sang DB Aiven (DB_*), TRỪ bảng user.
// CẢNH BÁO: xóa sạch dữ liệu room, tenant, reading, invoice, expense, setting trên Aiven trước khi chép.
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './auth/user.entity';
import { Setting } from './settings/setting.entity';
import { Room } from './rooms/room.entity';
import { Tenant } from './tenants/tenant.entity';
import { Reading } from './utilities/reading.entity';
import { Invoice } from './invoices/invoice.entity';
import { Expense } from './expenses/expense.entity';

dotenv.config();
const env = process.env;
console.log('SRC:', env.SRC_HOST, env.SRC_PORT, env.SRC_USERNAME, env.SRC_DB_NAME);
console.log('DB :', env.DB_HOST, env.DB_PORT, env.DB_USERNAME, env.DB_NAME);
const entities = [User, Setting, Room, Tenant, Reading, Invoice, Expense];

const source = new DataSource({
  type: 'mysql',
  host: env.SRC_HOST || 'localhost',
  port: Number(env.SRC_PORT || 3306),
  username: env.SRC_USERNAME || 'root',
  password: env.SRC_PASSWORD,
  database: env.SRC_DB_NAME || 'tromanagerdb',
  charset: 'utf8mb4',
  entities,
  synchronize: false,
});

const target = new DataSource({
  type: 'mysql',
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  ssl: { rejectUnauthorized: false }, // Aiven bắt buộc SSL
  entities,
  synchronize: false,
});

// Thứ tự: bảng cha trước, bảng con sau (invoice phụ thuộc room và tenant)
const ORDER = [Setting, Room, Tenant, Reading, Expense, Invoice];

async function run() {
  if (
    env.SRC_HOST === env.DB_HOST &&
    Number(env.SRC_PORT || 3306) === Number(env.DB_PORT) &&
    env.SRC_DB_NAME === env.DB_NAME
  ) {
    throw new Error('Nguồn và đích là CÙNG một database. Kiểm tra lại SRC_* và DB_* trong .env');
  }

  await source.initialize();
  await target.initialize();
  console.log(`Nguồn: ${env.SRC_HOST || 'localhost'}/${env.SRC_DB_NAME || 'tromanagerdb'}`);
  console.log(`Đích : ${env.DB_HOST}/${env.DB_NAME}`);

  const qr = target.createQueryRunner();
  await qr.connect();
  try {
    await qr.query('SET FOREIGN_KEY_CHECKS=0');

    // 1. Xóa dữ liệu cũ trên đích (bảng con trước)
    for (const E of [...ORDER].reverse()) await qr.manager.clear(E);

    // 2. Chép từng bảng, giữ nguyên id
    for (const E of ORDER) {
      const rows = await source.getRepository(E).find();
      for (let i = 0; i < rows.length; i += 200) {
        await qr.manager.getRepository(E).insert(rows.slice(i, i + 200) as any);
      }
      console.log(`  ${source.getMetadata(E).tableName}: ${rows.length} dòng`);
    }
    await qr.query('SET FOREIGN_KEY_CHECKS=1');

    // 3. So sánh số dòng
    console.log('Kiểm tra số dòng (nguồn -> đích):');
    for (const E of ORDER) {
      const a = await source.getRepository(E).count();
      const b = await target.getRepository(E).count();
      console.log(`  ${source.getMetadata(E).tableName}: ${a} -> ${b} ${a === b ? 'OK' : '<<< KHÔNG KHỚP'}`);
    }
  } finally {
    await qr.release();
    await source.destroy();
    await target.destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});