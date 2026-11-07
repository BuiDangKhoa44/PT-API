import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between, DataSource, FindOptionsWhere, LessThan, Like, MoreThan, Repository,
} from 'typeorm';
import { addDays, fmtDate, toIsoDate } from '../common/utils';
import { Room } from '../rooms/room.entity';
import { CreateTenantDto, ListTenantsQuery } from './tenants.dto';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantsRepository: Repository<Tenant>,
    @InjectRepository(Room) private roomsRepository: Repository<Room>,
    private dataSource: DataSource,
  ) {}

  /** Trạng thái hợp đồng tính từ ngày hết hạn */
  private contractStatus(endDate: string): 'ACTIVE' | 'EXPIRING' | 'EXPIRED' {
    const today = toIsoDate(new Date());
    const in30 = toIsoDate(addDays(new Date(), 30));
    if (endDate < today) return 'EXPIRED';
    if (endDate <= in30) return 'EXPIRING';
    return 'ACTIVE';
  }

  // GET /tenants?q=&status=&page=&limit= -> { items, total, page, pages, stats }
  async list(query: ListTenantsQuery) {
    const { q, status, page = 1, limit = 6 } = query;
    const today = toIsoDate(new Date());
    const in30 = toIsoDate(addDays(new Date(), 30));

    const base: FindOptionsWhere<Tenant> = { isStaying: true };
    if (status === 'EXPIRED') base.contractEndDate = LessThan(today);
    if (status === 'EXPIRING') base.contractEndDate = Between(today, in30);
    if (status === 'ACTIVE') base.contractEndDate = MoreThan(in30);

    // Mảng where = điều kiện OR: tìm theo tên HOẶC CCCD HOẶC SĐT (mỗi nhánh vẫn giữ điều kiện base)
    const where: FindOptionsWhere<Tenant> | FindOptionsWhere<Tenant>[] = q
      ? [
          { ...base, fullName: Like(`%${q}%`) },
          { ...base, idCard: Like(`%${q}%`) },
          { ...base, phone: Like(`%${q}%`) },
        ]
      : base;

    const [rows, total] = await this.tenantsRepository.findAndCount({
      where,
      relations: { room: true },
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const staying = await this.tenantsRepository.find({ where: { isStaying: true } });
    const roomCount = await this.roomsRepository.count();

    return {
      items: rows.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        idCard: t.idCard,
        phone: t.phone,
        roomCode: `P.${t.room.code}`,
        moveInDate: fmtDate(t.moveInDate),
        deposit: t.deposit,
        contractStatus: this.contractStatus(t.contractEndDate),
      })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        staying: staying.reduce((n, t) => n + t.people, 0), // tổng số người đang ở
        capacity: roomCount * 2, // giả định mỗi phòng tối đa 2 người; sửa theo thực tế
        activeContracts: staying.filter((t) => this.contractStatus(t.contractEndDate) !== 'EXPIRED').length,
        expiringSoon: staying.filter((t) => this.contractStatus(t.contractEndDate) === 'EXPIRING').length,
        totalDeposit: staying.reduce((n, t) => n + t.deposit, 0),
      },
    };
  }

  // POST /tenants : tiếp nhận khách. Tạo khách + chuyển phòng sang RENTED phải cùng thành công -> transaction
  async create(dto: CreateTenantDto) {
    if (dto.contractEndDate <= dto.moveInDate) {
      throw new BadRequestException('Ngày hết hạn hợp đồng phải sau ngày vào ở');
    }
    return this.dataSource.transaction(async (manager) => {
      const room = await manager.findOneBy(Room, { id: dto.roomId });
      if (!room) throw new NotFoundException(`Không tìm thấy phòng ${dto.roomId}`);
      if (room.status !== 'VACANT') {
        throw new BadRequestException(`Phòng ${room.code} hiện không trống`);
      }
      const tenant = await manager.save(Tenant, manager.create(Tenant, { ...dto, isStaying: true }));
      await manager.update(Room, { id: room.id }, { status: 'RENTED' });
      return tenant;
    });
  }

  // POST /tenants/:id/checkout : trả phòng. Khách rời đi + phòng về VACANT -> transaction
  async checkout(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const tenant = await manager.findOneBy(Tenant, { id });
      if (!tenant) throw new NotFoundException(`Không tìm thấy khách thuê ${id}`);
      if (!tenant.isStaying) throw new BadRequestException('Khách này đã trả phòng rồi');
      tenant.isStaying = false;
      await manager.save(tenant);
      await manager.update(Room, { id: tenant.roomId }, { status: 'VACANT' });
      return { id: tenant.id, checkedOut: true };
    });
  }
}
