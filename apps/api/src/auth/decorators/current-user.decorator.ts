import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface JwtUser {
  id: string;
  email: string;
}

/** Извлекает текущего пользователя из request.user (заполняется JWT-стратегией). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtUser }>();
    return request.user;
  },
);
