import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of, switchMap, EMPTY } from 'rxjs';
import { environment } from '../api/api.config';
import {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  User,
} from './auth.models';

/** Ответ на /auth/refresh — только accessToken (refresh-токен в httpOnly cookie) */
interface RefreshResponse {
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);

  /** Текущий пользователь (только для чтения) */
  readonly currentUser = this._user.asReadonly();

  /** true если пользователь аутентифицирован */
  readonly isAuthenticated = computed(() => this._user() !== null);

  /** Access-токен хранится только в памяти, не в localStorage */
  private accessToken: string | null = null;

  // ─── Публичные методы для управления состоянием ────────────────────────────

  /** Возвращает текущий access-токен (используется interceptor'ом) */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Устанавливает токен и данные пользователя после успешной аутентификации */
  setAuth(token: string, user: User): void {
    this.accessToken = token;
    this._user.set(user);
  }

  /** Очищает токен и данные пользователя (logout / 401) */
  clearAuth(): void {
    this.accessToken = null;
    this._user.set(null);
  }

  // ─── HTTP-методы ──────────────────────────────────────────────────────────

  /** POST /auth/login — вход, сохраняет токен и пользователя */
  login(data: LoginRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, data)
      .pipe(
        tap((res) => this.setAuth(res.accessToken, res.user)),
        map(() => undefined),
      );
  }

  /** POST /auth/register — регистрация, сохраняет токен и пользователя */
  register(data: RegisterRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap((res) => this.setAuth(res.accessToken, res.user)),
        map(() => undefined),
      );
  }

  /** POST /auth/logout — выход, очищает состояние */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/auth/logout`, {})
      .pipe(
        tap(() => {
          this.clearAuth();
          void this.router.navigate(['/login']);
        }),
        catchError(() => {
          // Даже если запрос не прошёл — очищаем локальное состояние
          this.clearAuth();
          void this.router.navigate(['/login']);
          return EMPTY;
        }),
      );
  }

  /**
   * POST /auth/refresh — обновление access-токена через httpOnly cookie.
   * Вызывается interceptor'ом при 401 и APP_INITIALIZER при старте.
   */
  refresh(): Observable<void> {
    return this.http
      .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, {})
      .pipe(
        tap((res) => {
          this.accessToken = res.accessToken;
        }),
        // После получения нового access-токена загружаем профиль
        map(() => undefined),
      );
  }

  /** PATCH /users/me — обновление профиля */
  updateProfile(data: UpdateProfileRequest): Observable<void> {
    return this.http
      .patch<User>(`${environment.apiUrl}/users/me`, data)
      .pipe(
        tap((user) => this._user.set(user)),
        map(() => undefined),
      );
  }

  /** POST /users/me/password — смена пароля */
  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http
      .post<void>(`${environment.apiUrl}/users/me/password`, data);
  }

  /** GET /users/me — загрузка профиля текущего пользователя */
  fetchMe(): Observable<void> {
    return this.http
      .get<User>(`${environment.apiUrl}/users/me`)
      .pipe(
        tap((user) => this._user.set(user)),
        map(() => undefined),
      );
  }

  /**
   * Инициализация сессии при старте приложения.
   * Пытается обновить access-токен через refresh cookie, затем загружает профиль.
   * Если refresh не удался — пользователь остаётся гостем (без ошибки).
   *
   * switchMap гарантирует, что fetchMe() выполнится после refresh() и
   * APP_INITIALIZER дождётся завершения всей цепочки.
   */
  init(): Observable<void> {
    return this.refresh().pipe(
      switchMap(() => this.fetchMe()),
      catchError(() => {
        // Refresh не удался — пользователь не залогинен, это нормально
        return of(undefined);
      }),
    );
  }
}