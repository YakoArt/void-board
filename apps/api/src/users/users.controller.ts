import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';

import {
  CurrentUser,
  type JwtUser,
} from '../auth/decorators/current-user.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/users/me — профиль текущего пользователя */
  @Get('me')
  async getMe(@CurrentUser() user: JwtUser): Promise<UserResponseDto> {
    return this.usersService.getProfile(user.id);
  }

  /** PATCH /api/users/me — обновление имени и/или аватара */
  @Patch('me')
  async updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.id, dto);
  }

  /** POST /api/users/me/password — смена пароля */
  @Post('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(user.id, dto);
  }
}
