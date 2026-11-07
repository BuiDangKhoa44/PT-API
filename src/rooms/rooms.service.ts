import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Invoice } from '../invoices/invoice.entity';
import { refreshOverdue } from '../invoices/invoices.helpers';
import { fmtDate } from '../common/utils';
import { Room } from './room.entity';
import { CreateRoomDto, ListRoomsQuery, SetRoomStatusDto } from './rooms.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private roomsRepository: Repository<Room>,
    @InjectRepository(Invoice) private invoicesRepository: Repository<Invoice>,
  ) {}

  // GET /rooms?floor=&status=&q= -> { items, stats, floors }
  async list(query: ListRoomsQuery) {
    const where: FindOptionsWhere<Room> = {};
    if (query.floor) where.floor = query.floor;
    if (query.status) where.status = query.status;

    await refreshOverdue(this.invoicesRepository);
    const [rooms, allRooms, overdueInvoices] = await Promise.all([
      this.roomsRepository.find({ where, relations: { tenants: true }, order: { code: 'ASC' } }),
      this.roomsRepository.find(), // không lọc, để tính thống kê
      this.invoicesRepository.find({ where: { status: 'OVERDUE' }, select: { roomId: true } }),
    ]);
    const overdueRoomIds = new Set(overdueInvoices.map((i) => i.roomId));

    let items = rooms.map((r) => {
      const tenant = r.tenants?.find((t) => t.isStaying);
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        floor: r.floor,
        area: r.area,
        price: r.price,
        status: r.status,
        tenantName: tenant?.fullName ?? null,
        phone: tenant?.phone ?? null,
        dueText: tenant ? `Ngày ${String(tenant.dueDay).padStart(2, '0')} hàng tháng` : null,
        overdue: overdueRoomIds.has(r.id),
        note: r.note,
        reason: r.reason,
        expectedDone: fmtDate(r.expectedDone),
        technician: r.technician,
      };
    });

    // Tìm kiếm theo mã phòng / tên khách / SĐT (khách nằm ở bảng khác nên lọc ở đây)
    if (query.q) {
      const s = query.q.toLowerCase();
      items = items.filter((r) =>
        [r.code, r.tenantName, r.phone].some((v) => v?.toLowerCase().includes(s)),
      );
    }

    const count = (st: string) => allRooms.filter((r) => r.status === st).length;
    const floorMap = new Map<number, number>();
    allRooms.forEach((r) => floorMap.set(r.floor, (floorMap.get(r.floor) ?? 0) + 1));

    return {
      items,
      stats: {
        total: allRooms.length,
        rented: count('RENTED'),
        vacant: count('VACANT'),
        maintenance: count('MAINTENANCE'),
      },
      floors: [...floorMap.entries()].sort((a, b) => a[0] - b[0]).map(([floor, n]) => ({ floor, count: n })),
    };
  }

  // POST /rooms
  async create(dto: CreateRoomDto) {
    const exists = await this.roomsRepository.findOneBy({ code: dto.code });
    if (exists) throw new ConflictException(`Mã phòng ${dto.code} đã tồn tại`);
    const room = this.roomsRepository.create({ ...dto, status: 'VACANT' });
    return this.roomsRepository.save(room);
  }

  // PATCH /rooms/:id/status
  async setStatus(id: number, dto: SetRoomStatusDto) {
    const room = await this.roomsRepository.findOneBy({ id });
    if (!room) throw new NotFoundException(`Không tìm thấy phòng ${id}`);
    room.status = dto.status;
    if (dto.status === 'MAINTENANCE') {
      room.reason = dto.reason ?? null;
      room.expectedDone = dto.expectedDone ?? null;
      room.technician = dto.technician ?? null;
    } else {
      // Hết bảo trì -> xóa thông tin sửa chữa cũ
      room.reason = null;
      room.expectedDone = null;
      room.technician = null;
    }
    return this.roomsRepository.save(room);
  }
}
