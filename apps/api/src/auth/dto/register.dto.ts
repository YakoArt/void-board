import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254) // RFC 5321 максимальная длина email
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128) // ограничиваем длину для защиты от DoS через дорогой bcrypt
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
