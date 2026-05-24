/**
 * Парсит TTL-строку формата "<число><единица>" в миллисекунды.
 * Поддерживает: s (секунды), m (минуты), h (часы), d (дни).
 *
 * @example parseTtlToMs('15m') → 900_000
 * @example parseTtlToMs('7d')  → 604_800_000
 */
export function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);

  if (!match) {
    throw new Error(
      `Неверный формат TTL: "${ttl}". Ожидается: <число><s|m|h|d>`,
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';

  const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
  };

  return value * multipliers[unit];
}

/** Парсит TTL-строку в Date (текущее время + TTL). */
export function parseTtlToDate(ttl: string): Date {
  return new Date(Date.now() + parseTtlToMs(ttl));
}
