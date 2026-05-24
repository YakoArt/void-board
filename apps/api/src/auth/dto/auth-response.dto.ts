export interface UserPayload {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

/** Внутренний результат login/register — содержит оба токена. */
export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
}

/** Ответ клиенту — refresh-токен уходит в httpOnly-куку, не в тело. */
export interface AuthResponseDto {
  accessToken: string;
  user: UserPayload;
}

/** Внутренний результат refresh — содержит оба токена. */
export interface RefreshTokensResult {
  accessToken: string;
  refreshToken: string;
}

/** Ответ клиенту на /refresh — только accessToken. */
export interface RefreshResponseDto {
  accessToken: string;
}
