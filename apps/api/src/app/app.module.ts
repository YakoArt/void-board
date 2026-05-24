import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { validate } from '../config/env.validation.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    // Глобальная конфигурация с валидацией env-переменных при старте
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // Ограничение частоты запросов (rate limiting)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 10),
        },
      ],
    }),

    // Глобальный Prisma-клиент (DI доступен везде без импорта)
    PrismaModule,

    // Аутентификация: JWT-стратегия, guards, сервис
    AuthModule,

    // Управление профилем пользователя
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JWT guard глобально — все маршруты защищены по умолчанию, @Public() открывает
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Rate limiting guard глобально
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
