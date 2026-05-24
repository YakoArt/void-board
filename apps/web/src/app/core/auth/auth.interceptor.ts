import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpInterceptorFn,
} from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

/** URL эндпоинта обновления токена — исключается из перехвата 401 */
const REFRESH_URL = '/auth/refresh';

/**
 * Флаг: идёт ли сейчас refresh-запрос.
 * Если несколько запросов получат 401 одновременно, только первый вызовет refresh(),
 * остальные подождут результат через refreshSubject$.
 */
let isRefreshing = false;

/**
 * Subject для координации параллельных 401-ответов.
 * null — refresh ещё не завершён, true — refresh успешен.
 */
const refreshSubject$ = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const modifiedReq = addAuthHeaders(req, authService);

  return next(modifiedReq).pipe(
    catchError((error: unknown) => {
      // Перехватываем только 401 и только если это не сам refresh-запрос
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes(REFRESH_URL)
      ) {
        return handle401(req, next, authService, router);
      }

      return throwError(() => error);
    }),
  );
};

/**
 * Обработка 401: если refresh уже идёт — ждём его завершения,
 * иначе запускаем refresh и повторяем оригинальный запрос.
 */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    // Refresh уже идёт — ждём его завершения и повторяем запрос
    return refreshSubject$.pipe(
      filter((result) => result !== null),
      take(1),
      switchMap((success) => {
        if (success) {
          return next(addAuthHeaders(req, authService));
        }
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }),
    );
  }

  // Первый 401 — запускаем refresh
  isRefreshing = true;
  refreshSubject$.next(null);

  return authService.refresh().pipe(
    switchMap(() => {
      isRefreshing = false;
      refreshSubject$.next(true);
      // Refresh успешен — повторяем оригинальный запрос с новым токеном
      return next(addAuthHeaders(req, authService));
    }),
    catchError((refreshError: unknown) => {
      isRefreshing = false;
      refreshSubject$.next(false);
      // Refresh тоже завершился с ошибкой — очищаем сессию и редиректим
      authService.clearAuth();
      void router.navigate(['/login']);
      return throwError(() => refreshError);
    }),
  );
}

/**
 * Добавляет Authorization header если есть токен.
 * Добавляет withCredentials для запросов к /api/auth/ (для httpOnly cookie с refresh-токеном).
 */
function addAuthHeaders(
  req: HttpRequest<unknown>,
  authService: AuthService,
): HttpRequest<unknown> {
  const token = authService.getAccessToken();
  const isAuthEndpoint = req.url.includes('/api/auth/');

  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  return req.clone({
    headers,
    withCredentials: isAuthEndpoint ? true : req.withCredentials,
  });
}
