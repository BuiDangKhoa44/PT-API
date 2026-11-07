# TrọManager Pro – Backend (NestJS + TypeORM + MySQL)

Backend này viết khớp 100% với frontend `demo-master` (đúng route, đúng tên field trong `mockData.js`).
Cách làm bám theo Chương 07 (TypeORM, Entity, Repository, quan hệ, phân trang, transaction, seed).

---

## PHẦN 1 – Chuẩn bị (làm 1 lần)

### 1.1 Cài phần mềm
| Phần mềm | Kiểm tra | Ghi chú |
|---|---|---|
| Node.js 18 trở lên (nên 20/22) | `node -v` | https://nodejs.org (bản LTS) |
| MySQL Server 8 | `mysql --version` | nhớ mật khẩu `root` đặt lúc cài |
| MySQL Workbench (hoặc DBeaver) | | để xem dữ liệu |

### 1.2 Tạo database (TypeORM KHÔNG tự tạo database)
Mở MySQL Workbench → kết nối `localhost:3306` bằng `root` → chạy:

```sql
CREATE DATABASE tromanagerdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```
(`utf8mb4` để lưu được tiếng Việt có dấu.)

---

## PHẦN 2 – Chạy backend

```bash
cd tromanager-api
npm install
```

Tạo file `.env` (copy từ `.env.example`):

```bash
# Windows:  copy .env.example .env
# Mac/Linux: cp .env.example .env
```

Mở `.env` và điền:

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_NAME=tromanagerdb
JWT_SECRET=mot-chuoi-bi-mat-dai-tuy-y-abc123xyz789
JWT_EXPIRES_IN=1d
```

Chạy:

```bash
npm run start:dev
```
Thấy dòng `API chạy tại http://localhost:3000/api` là thành công. Lần đầu chạy, TypeORM
(`synchronize: true`) tự tạo các bảng: `user, setting, room, tenant, reading, invoice, expense`.

Nạp dữ liệu mẫu (mở terminal thứ 2):

```bash
npm run seed
```
→ tạo tài khoản `admin / 123456`, 12 phòng, 8 khách, điện nước + hóa đơn 5 kỳ (06→10/2024).
Muốn xóa sạch nạp lại: `npm run seed:reset`.

### Kiểm tra nhanh bằng Postman / curl
```bash
# 1. Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'
# -> {"accessToken":"eyJ...","user":{...}}

# 2. Gọi API có token (thay TOKEN)
curl http://localhost:3000/api/rooms -H "Authorization: Bearer TOKEN"
```
Trong Postman: tab **Authorization → Bearer Token** → dán accessToken.

---

## PHẦN 3 – Nối frontend

```bash
cd demo-master
npm install
cp .env.example .env
```
Sửa `.env` của **frontend**:
```
VITE_USE_MOCK=false
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:3000
```
Chạy `npm run dev` → mở http://localhost:5173 → đăng nhập `admin / 123456`.
(Phải **tắt rồi bật lại** `npm run dev` sau khi sửa `.env`.)

> Frontend đang ghi cứng kỳ `2024-10` ở các trang → dữ liệu seed cũng là 2024-10 nên hiển thị đúng.
> Khi dùng thật: sửa `const period = '2024-10'` trong `Utilities.jsx`, `Dashboard.jsx`, `Invoices.jsx` thành kỳ hiện tại.

### Sửa nút xuất Excel (bắt buộc nếu muốn nút hoạt động)
Thẻ `<a href=...>` không gửi được token nên sẽ bị 401. Sửa 2 chỗ:

**`src/api/endpoints.js`** – đổi dòng import và thay `exportUrl`:
```js
import { http, USE_MOCK, tokenStore, API_URL } from './client.js';
// ...
export const reportsApi = {
  revenue: (months = 4) => (USE_MOCK ? mock(M.mockReport) : http.get('/reports/revenue', { months })),
  async download(format) {
    const res = await fetch(`${API_URL}/reports/export?format=${format}`, {
      headers: { Authorization: `Bearer ${tokenStore.get()}` },
    });
    if (!res.ok) throw new Error('Không xuất được file');
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url; a.download = `bao-cao.${format}`; a.click();
    URL.revokeObjectURL(url);
  },
};
```
**`src/pages/Reports.jsx`** (dòng ~51-52) – đổi 2 thẻ `<a>`:
```jsx
<button className="btn btn-sm" onClick={() => reportsApi.download('xlsx')}><Table2 size={12} className="c-green" /> Excel</button>
```
(Xuất PDF chưa làm: backend trả lỗi 400 "Hiện chỉ hỗ trợ xuất file xlsx".)

---

## PHẦN 4 – Cấu trúc code (đọc theo thứ tự này để hiểu)

```
src/
  main.ts            Khởi động: prefix /api, ValidationPipe, CORS
  app.module.ts      Kết nối MySQL (đọc .env qua forRootAsync) + guard JWT toàn cục
  seed.ts            Nạp dữ liệu mẫu
  common/utils.ts    Hàm ngày tháng, kỳ 'YYYY-MM', định dạng tiền
  auth/              Đăng nhập, JWT, @Public()
  settings/          Cấu hình (1 dòng duy nhất)
  rooms/             Phòng
  tenants/           Khách thuê
  utilities/         Đơn giá + chỉ số điện nước
  invoices/          Hóa đơn
  expenses/          Chi phí bảo trì (phục vụ báo cáo)
  dashboard/         Tổng quan
  reports/           Báo cáo + xuất xlsx
```
Mỗi thư mục tuần tự: `*.entity.ts` (bảng) → `*.dto.ts` (kiểm tra dữ liệu vào) → `*.service.ts`
(nghiệp vụ, dùng Repository) → `*.controller.ts` (route) → `*.module.ts`.

### Sơ đồ bảng (thiết kế dữ liệu – trọng tâm Chương 07)
```
room 1 ──< N tenant        (tenant.roomId)
room 1 ──< N reading       (reading.roomId, duy nhất theo roomId + period)
room 1 ──< N invoice       (invoice.roomId)
tenant 1 ──< N invoice     (invoice.tenantId)
setting  (1 dòng)    user    expense (theo period)
```
Các quan hệ đều là **1-N** (`@ManyToOne` ở phía "nhiều" + cột khóa ngoại `roomId`/`tenantId`).

### Bảng ánh xạ API ↔ code
| Route | File xử lý | Điểm đáng học |
|---|---|---|
| POST `/auth/login`, GET `/auth/me` | auth/ | bcrypt so mật khẩu, ký JWT |
| GET `/rooms` | rooms.service | `find` + `where`, thống kê, floors |
| POST `/rooms`, PATCH `/rooms/:id/status` | rooms.service | 409 trùng mã, 404 |
| GET `/tenants` | tenants.service | phân trang `skip/take`, `findAndCount`, `Like`, where dạng mảng (OR) |
| POST `/tenants`, POST `/tenants/:id/checkout` | tenants.service | **transaction** (khách + trạng thái phòng) |
| GET `/utilities/rates` | utilities.service | lấy từ bảng setting |
| GET/PUT `/utilities/readings` | utilities.service | chỉ số cũ = chỉ số mới kỳ trước; transaction; kiểm tra mới ≥ cũ |
| GET `/invoices` | invoices.service | lọc + thống kê + đếm theo trạng thái |
| PATCH `/invoices/:id/confirm-payment` | invoices.service | |
| POST `/invoices/generate` | invoices.service | backend **tự tính lại tiền** theo đơn giá |
| POST `/invoices/notify` | invoices.service | tạm chỉ đếm số hóa đơn cần nhắc |
| GET `/dashboard/summary` | dashboard.service | tổng hợp nhiều bảng |
| GET `/reports/revenue`, `/reports/export` | reports.service | tổng hợp + ExcelJS |
| GET/PUT `/settings` | settings.service | |
| GET/POST `/expenses` | expenses.controller | nhập chi phí (chưa có giao diện) |

### Công thức tính hóa đơn (invoices.service → generate)
```
tiền điện = (chỉ số điện mới − cũ) × giá điện
tiền nước = (chỉ số nước mới − cũ) × giá nước
dịch vụ   = phí rác/vệ sinh + internet
tổng      = tiền phòng + điện + nước + dịch vụ
```
Frontend hiển thị cột "Dịch vụ" = nước + rác + internet nên API trả `service = water + service`.

### Trạng thái hóa đơn OVERDUE
Hóa đơn `PENDING` có `dueDate` < hôm nay sẽ tự chuyển `OVERDUE` mỗi khi gọi danh sách hóa đơn / dashboard / báo cáo
(hàm `refreshOverdue`).

---

## PHẦN 5 – Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách sửa |
|---|---|
| `ER_ACCESS_DENIED_ERROR` | Sai `DB_USERNAME`/`DB_PASSWORD` trong `.env` |
| `ER_BAD_DB_ERROR: Unknown database` | Chưa chạy `CREATE DATABASE tromanagerdb;` |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL chưa chạy (mở Services / `brew services start mysql`) |
| `Config key "JWT_SECRET" does not exist` | Chưa điền `JWT_SECRET` trong `.env` |
| Frontend báo lỗi mạng / 404 | Quên `VITE_USE_MOCK=false`, hoặc backend chưa chạy, hoặc chưa restart `npm run dev` |
| Đăng nhập xong bị đá về `/login` | Token sai/hết hạn → xóa `localStorage` rồi đăng nhập lại |
| Danh sách trống | Chưa chạy `npm run seed` |
| Lỗi `Port 3000 is already in use` | Đổi `PORT` trong `.env` **và** `VITE_PROXY_TARGET` của frontend |
| Tiếng Việt thành `???` | Database chưa tạo bằng `utf8mb4` (tạo lại bằng lệnh ở mục 1.2) |

---

## PHẦN 6 – Lưu ý & hướng phát triển

- `synchronize: true` chỉ dùng khi học/dev. Khi chạy thật phải tắt và dùng migration.
- Không commit file `.env` (đã nằm trong `.gitignore`).
- Chưa có: xuất PDF, gửi Zalo/SMS thật, phân quyền theo vai trò (chỉ có 1 role ADMIN), đổi mật khẩu.
- `capacity` ở trang Khách thuê đang tính = số phòng × 2 (giả định). Sửa trong `tenants.service.ts` nếu khác.
- Muốn thêm phòng/khách từ giao diện: frontend cần làm modal/form rồi gọi `roomsApi.create`, `tenantsApi.create`
  (backend đã sẵn).
