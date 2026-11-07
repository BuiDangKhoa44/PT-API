import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateRoomDto, ListRoomsQuery, SetRoomStatusDto } from './rooms.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get()
  list(@Query() query: ListRoomsQuery) {
    return this.roomsService.list(query);
  }

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: SetRoomStatusDto) {
    return this.roomsService.setStatus(id, dto);
  }
}
