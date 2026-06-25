import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { ChangePasswordDto } from '../auth/dto/change-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Post('password')
  changePassword(@Req() request: Request, @Body() dto: ChangePasswordDto) {
    const user = request.user as { sub: number };
    return this.authService.changePassword(user.sub, dto);
  }
}
