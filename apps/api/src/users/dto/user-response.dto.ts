/** Представление пользователя в ответах API (без чувствительных данных) */
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}
