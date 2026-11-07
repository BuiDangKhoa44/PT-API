import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';
import { UpdateSettingDto } from './update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private settingsRepository: Repository<Setting>) {}

  /** Lấy cấu hình; nếu chưa có thì tạo bản mặc định */
  async get(): Promise<Setting> {
    const found = await this.settingsRepository.find({ order: { id: 'ASC' }, take: 1 });
    if (found.length) return found[0];
    return this.settingsRepository.save(
      this.settingsRepository.create({
        facilityName: 'Nhà trọ của tôi',
        address: '',
        ownerName: '',
        ownerPhone: '',
        bankName: '',
        bankAccount: '',
        bankHolder: '',
        electricPrice: 3500,
        waterPrice: 18000,
        waterPerPerson: 100000,
        servicePrice: 50000,
        internetPrice: 80000,
        meterCloseDay: 25,
        rentDueFrom: 1,
        rentDueTo: 5,
      }),
    );
  }

  async update(dto: UpdateSettingDto) {
    const setting = await this.get();
    Object.assign(setting, dto);
    return this.settingsRepository.save(setting);
  }
}
