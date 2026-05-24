import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @ValidateIf((o: UpdateProjectDto) => o.description !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
