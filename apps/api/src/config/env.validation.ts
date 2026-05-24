import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Схема валидации переменных окружения.
 * Приложение упадёт при старте, если обязательные переменные не заданы.
 */
export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL!: string;

  @IsString()
  JWT_REFRESH_TTL!: string;

  @IsString()
  COOKIE_DOMAIN!: string;

  @IsString()
  COOKIE_SECURE!: string;

  @IsInt()
  @Min(0)
  THROTTLE_TTL!: number;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT!: number;

  @IsUrl({ require_tld: false })
  CORS_ORIGIN!: string;

  @IsEnum(NodeEnv)
  NODE_ENV!: NodeEnv;
}

/**
 * Функция валидации для ConfigModule.
 * Выбрасывает ошибку со списком проблем при невалидных переменных окружения.
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Ошибка валидации переменных окружения:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
