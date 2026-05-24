import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254) // RFC 5321 максимальная длина email
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128) // ограничиваем длину для защиты от DoS через дорогой bcrypt
  password!: string;
}
