import { BadRequestException } from '@nestjs/common';
import slugify from 'slugify';

/**
 * Генерирует уникальный slug из названия.
 *
 * Алгоритм:
 * 1. Преобразует строку через slugify (транслитерация, замена пробелов на дефисы)
 * 2. Приводит к нижнему регистру
 * 3. Обрезает до 50 символов
 * 4. Добавляет суффикс `-xxxx` (4 символа a-z0-9) для уникальности
 *
 * @throws {BadRequestException} Если после slugify строка оказалась пустой
 *
 * @example generateSlug('My Project')  → 'my-project-a1b2'
 * @example generateSlug('Проект')      → 'proekt-x9y3'
 */
export function generateSlug(name: string): string {
  const base = slugify(name, { lower: true, strict: true });

  if (!base) {
    throw new BadRequestException(
      'Название должно содержать хотя бы одну букву или цифру',
    );
  }

  const truncated = base.slice(0, 50);
  const suffix = generateSuffix();

  return `${truncated}-${suffix}`;
}

/** Генерирует случайный суффикс из 4 символов a-z0-9. */
function generateSuffix(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}
