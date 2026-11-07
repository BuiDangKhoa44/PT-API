import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/auth/login  body {username,password} -> {accessToken,user}
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  // GET /api/auth/me
  @Get('me')
  me(@Req() req: { user: { id: number } }) {
    return this.authService.me(req.user.id);
  }
}
