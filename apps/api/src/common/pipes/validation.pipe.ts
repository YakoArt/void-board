import { ValidationPipe } from '@nestjs/common';

/**
 * Настроенный глобальный ValidationPipe.
 * - whitelist: true — удаляет свойства без декораторов
 * - transform: true — автоматически преобразует типы
 * - forbidNonWhitelisted: true — выбрасывает ошибку при лишних полях
 */
export const globalValidationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
});
