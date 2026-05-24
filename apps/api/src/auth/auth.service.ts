import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';

import { parseTtlToDate } from '../common/utils/parse-ttl.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AuthTokensResult,
  RefreshTokensResult,
  UserPayload,
} from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

/** Стоимость bcrypt — 10 раундов обеспечивают ~100мс на современном железе. */
const BCRYPT_ROUNDS = 10;

/** Заглушка-хеш для timing-safe сравнения при несуществующем email. */
const DUMMY_HASH =
  '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Регистрация нового пользователя.
   * Создание пользователя и refresh-токена обёрнуты в транзакцию —
   * если генерация токена упадёт, пользователь не останется в БД без сессии.
   */
  async register(dto: RegisterDto): Promise<AuthTokensResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
      });

      const tokens = await this.generateTokens(tx, user.id, user.email);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.toUserPayload(user),
      };
    });
  }

  /**
   * Вход пользователя.
   * bcrypt.compare выполняется всегда — даже если email не найден (dummy-хеш).
   * Это предотвращает timing-атаки для определения существования аккаунта.
   */
  async login(dto: LoginDto): Promise<AuthTokensResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(dto.password, hashToCompare);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.prisma.$transaction(async (tx) => {
      const tokens = await this.generateTokens(tx, user.id, user.email);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: this.toUserPayload(user),
      };
    });
  }

  /**
   * Ротация refresh-токена.
   * Удаление старого и создание нового токена в одной транзакции —
   * гарантирует атомарность ротации.
   */
  async refresh(refreshToken: string): Promise<RefreshTokensResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh-токен отсутствует');
    }

    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh-токен истёк');
    }

    return this.prisma.$transaction(async (tx) => {
      // Ротация: удаляем старый токен, создаём новый.
      // Если тот же токен придёт повторно — он уже не существует → 401.
      await tx.refreshToken.delete({ where: { id: stored.id } });
      const tokens = await this.generateTokens(
        tx,
        stored.user.id,
        stored.user.email,
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.deleteMany({
      where: { token: tokenHash },
    });
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  /**
   * Генерирует пару access + refresh токенов.
   * Принимает транзакционный клиент для атомарности с вызывающей операцией.
   */
  private async generateTokens(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({ sub: userId, email });

    const rawRefreshToken = randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshTtl = this.configService.getOrThrow<string>('JWT_REFRESH_TTL');
    const expiresAt = parseTtlToDate(refreshTtl);

    await tx.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  /** SHA-256 хеш токена для безопасного хранения в БД. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toUserPayload(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    createdAt: Date;
  }): UserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }
}
