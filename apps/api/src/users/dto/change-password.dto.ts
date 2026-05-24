import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Новый пароль должен содержать не менее 8 символов' })
  @MaxLength(128)
  newPassword!: string;
}
