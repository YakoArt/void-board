import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser = require('cookie-parser');
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { globalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Graceful shutdown — корректное закрытие соединений (Prisma, HTTP) при SIGTERM/SIGINT.
  // Вызывает OnModuleDestroy хуки (PrismaService.$disconnect и т.д.).
  app.enableShutdownHooks();

  // CORS — только фронтенд из env, с поддержкой httpOnly-кук
  const corsOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:4200';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Парсинг cookies (для refresh_token в httpOnly-куке)
  app.use(cookieParser());

  // Глобальный префикс API
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Глобальный ValidationPipe — whitelist + transform + forbidNonWhitelisted
  app.useGlobalPipes(globalValidationPipe);

  // Глобальный фильтр исключений — единый формат ошибок для ВСЕХ ошибок,
  // включая необработанные runtime-ошибки (TypeError, Prisma errors и т.д.)
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(
    `Приложение запущено: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
