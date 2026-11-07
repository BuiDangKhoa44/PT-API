import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './expenses.dto';

// Controller nhỏ: frontend chưa có màn hình nhập chi phí, nhưng cần API để có dữ liệu cho báo cáo.
@Controller('expenses')
export class ExpensesController {
  constructor(@InjectRepository(Expense) private expensesRepository: Repository<Expense>) {}

  @Get()
  list(@Query('period') period?: string) {
    return this.expensesRepository.find({
      where: period ? { period } : {},
      order: { id: 'DESC' },
    });
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesRepository.save(this.expensesRepository.create(dto));
  }
}
