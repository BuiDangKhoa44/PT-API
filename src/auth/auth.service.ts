import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private toPublic(u: User) {
    return { id: u.id, fullName: u.fullName, username: u.username, role: u.role };
  }

  async login(username: string, password: string) {
    const user = await this.usersRepository.findOneBy({ username });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return { accessToken, user: this.toPublic(user) };
  }

  async me(userId: number) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }
}
