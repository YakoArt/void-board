import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl должен быть корректным URL' })
  @MaxLength(2048)
  avatarUrl?: string;
}
