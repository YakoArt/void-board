# Спецификация модуля: Аутентификация

> Живой документ — обновляется при изменениях в коде.

---

## Обзор

Модуль аутентификации реализует полный цикл: регистрация, вход, выход, JWT-сессии с ротацией refresh-токенов, защищённые маршруты, страница профиля.

---

## Модель данных

### User (`users`)

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID | Первичный ключ |
| `email` | String (unique) | Email пользователя |
| `passwordHash` | String | bcrypt-хеш пароля (10 раундов) |
| `name` | String | Имя пользователя |
| `avatarUrl` | String? | URL аватара |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

### RefreshToken (`refresh_tokens`)

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID | Первичный ключ |
| `token` | String (unique) | SHA-256 хеш refresh-токена |
| `userId` | UUID (FK → User) | Владелец токена |
| `expiresAt` | DateTime | Срок действия |
| `createdAt` | DateTime | Дата создания |

Индексы: `userId`, `expiresAt`. Cascade delete при удалении User.

---

## API-эндпоинты

### AuthController (`/api/auth`)

| Метод | Путь | Доступ | Rate Limit | Описание |
|---|---|---|---|---|
| POST | `/auth/register` | Public | 3/мин | Регистрация. Возвращает `{ accessToken, user }`, ставит refresh cookie |
| POST | `/auth/login` | Public | 5/мин | Вход. Возвращает `{ accessToken, user }`, ставит refresh cookie |
| POST | `/auth/refresh` | Public | — | Обновление access-токена. Читает refresh cookie, ротирует, возвращает `{ accessToken }` |
| POST | `/auth/logout` | Auth | — | Выход. Удаляет refresh-токен из БД, чистит cookie. Статус 204 |

### UsersController (`/api/users`)

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/users/me` | Auth | Профиль текущего пользователя |
| PATCH | `/users/me` | Auth | Обновление name/avatarUrl |
| POST | `/users/me/password` | Auth | Смена пароля. Статус 204 |

---

## Безопасность

### JWT

- **Access-токен**: JWT, подписан HS256, TTL 15 мин (настраивается через `JWT_ACCESS_TTL`)
- **Refresh-токен**: `crypto.randomUUID()`, хранится в БД как SHA-256 хеш, TTL 7 дней
- Access-токен передаётся в `Authorization: Bearer` header
- Refresh-токен передаётся в httpOnly cookie

### Cookie-опции refresh-токена

```
httpOnly: true
secure: из env (COOKIE_SECURE)
sameSite: 'strict'
path: '/api/auth'
maxAge: из JWT_REFRESH_TTL
```

### Timing-safe аутентификация

При логине bcrypt.compare выполняется всегда — даже если email не найден (используется dummy-хеш). Это предотвращает timing-атаки для определения существования аккаунта.

### Ротация refresh-токенов

При каждом `/auth/refresh` старый токен удаляется из БД, создаётся новый. Повторное использование старого токена возвращает 401. Удаление и создание обёрнуты в Prisma-транзакцию для атомарности.

### Транзакции

Все операции, включающие создание/удаление refresh-токена совместно с другими записями, обёрнуты в `$transaction`:
- `register()` — создание пользователя + генерация токенов
- `login()` — генерация токенов
- `refresh()` — удаление старого + создание нового токена

### Глобальные guards

- `JwtAuthGuard` (APP_GUARD) — все маршруты защищены по умолчанию
- `ThrottlerGuard` (APP_GUARD) — rate limiting на все маршруты
- `@Public()` декоратор — открывает маршрут для неаутентифицированных

### JwtStrategy — проверка в БД

`validate()` проверяет существование пользователя в БД при каждом запросе. Если пользователь удалён — его JWT немедленно перестаёт работать (не нужно ждать истечения TTL).

### passwordHash

Никогда не возвращается в ответах API. Маппинг через `toUserPayload()` / `toResponseDto()`.

---

## Бэкенд-модули

### AuthModule (`apps/api/src/auth/`)

```
auth/
├── auth.module.ts          — NestJS модуль (PassportModule, JwtModule)
├── auth.service.ts         — бизнес-логика (register, login, refresh, logout) с $transaction
├── auth.controller.ts      — HTTP-эндпоинты
├── strategies/
│   └── jwt.strategy.ts     — Passport JWT strategy (проверяет пользователя в БД)
├── guards/
│   └── jwt-auth.guard.ts   — глобальный guard с поддержкой @Public()
├── decorators/
│   ├── public.decorator.ts     — @Public() через SetMetadata
│   └── current-user.decorator.ts — @CurrentUser() через createParamDecorator
└── dto/
    ├── register.dto.ts         — email, password (min 8), name
    ├── login.dto.ts            — email, password
    └── auth-response.dto.ts    — AuthResponseDto, AuthTokensResult, RefreshTokensResult
```

### UsersModule (`apps/api/src/users/`)

```
users/
├── users.module.ts         — NestJS модуль, экспортирует UsersService
├── users.service.ts        — CRUD: getProfile, updateProfile, changePassword
├── users.controller.ts     — HTTP-эндпоинты (/users/me)
└── dto/
    ├── user-response.dto.ts    — UserResponseDto (без passwordHash)
    ├── update-profile.dto.ts   — name?, avatarUrl?
    └── change-password.dto.ts  — currentPassword, newPassword (min 8)
```

### Common (`apps/api/src/common/`)

```
common/
├── filters/
│   ├── all-exceptions.filter.ts  — @Catch() для ВСЕХ ошибок (включая runtime)
│   └── http-exception.filter.ts  — (устаревший, заменён на all-exceptions)
├── pipes/
│   └── validation.pipe.ts        — глобальный ValidationPipe
└── utils/
    └── parse-ttl.ts              — parseTtlToMs(), parseTtlToDate()
```

### PrismaModule (`apps/api/src/prisma/`)

```
prisma/
├── prisma.module.ts    — @Global() модуль
└── prisma.service.ts   — extends PrismaClient, $connect/$disconnect
```

---

## Фронтенд

### AuthService (`apps/web/src/app/core/auth/auth.service.ts`)

- **Состояние**: `signal<User | null>` + computed `isAuthenticated`
- **Access-токен**: хранится в памяти (приватная переменная), не в localStorage
- **Методы**: `login()`, `register()`, `logout()`, `refresh()`, `updateProfile()`, `changePassword()`, `fetchMe()`, `init()`
- **APP_INITIALIZER**: при старте вызывает `init()` → `refresh()` → `switchMap(fetchMe())` для восстановления сессии (цепочка через switchMap, не вложенный subscribe)

### Auth Interceptor (`auth.interceptor.ts`)

- Подставляет `Authorization: Bearer` если есть токен
- `withCredentials: true` для запросов к `/api/auth/`
- При 401 — retry через `refresh()`, при повторном 401 — `clearAuth()` + редирект на `/login`
- Не перехватывает 401 на `/auth/refresh` (защита от зацикливания)
- **Защита от параллельных refresh**: если несколько запросов получают 401 одновременно, только первый вызывает `refresh()`, остальные ждут результат через `BehaviorSubject`

### Guards

- `authGuard` — пропускает только аутентифицированных, иначе → `/login`
- `guestGuard` — пропускает только гостей, иначе → `/`

### Страницы

| Путь | Компонент | Guard | Описание |
|---|---|---|---|
| `/login` | `LoginComponent` | guestGuard | Форма входа (email, password) |
| `/register` | `RegisterComponent` | guestGuard | Форма регистрации (name, email, password, confirm) |
| `/profile` | `ProfileComponent` | authGuard | Профиль + смена пароля |
| `/` | — | — | Редирект на `/login` |

### Header (`HeaderComponent`)

PrimeNG Toolbar. Слева — лого «Voidboard». Справа — имя + Logout (для залогиненных) или Login/Register (для гостей).

---

## Конфигурация

### Переменные окружения (бэкенд)

| Переменная | Обязательна | По умолчанию | Описание |
|---|---|---|---|
| `DATABASE_URL` | Да | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Да | — | Секрет для подписи JWT |
| `JWT_ACCESS_TTL` | Да | — | TTL access-токена (напр. `15m`) |
| `JWT_REFRESH_TTL` | Да | — | TTL refresh-токена (напр. `7d`) |
| `COOKIE_SECURE` | Да | — | `true` для HTTPS, `false` для dev |
| `COOKIE_DOMAIN` | Да | — | Домен cookie |
| `THROTTLE_TTL` | Да | — | Окно rate limiting (мс) |
| `THROTTLE_LIMIT` | Да | — | Лимит запросов в окне |
| `CORS_ORIGIN` | Да | — | Разрешённый origin |
| `NODE_ENV` | Да | — | `development` / `production` / `test` |

Валидация через `class-validator` в `env.validation.ts`. Приложение падает при старте если переменные невалидны.

---

## Инфраструктура

### Graceful Shutdown

`app.enableShutdownHooks()` в `main.ts` — при SIGTERM/SIGINT корректно закрываются Prisma-соединения через `OnModuleDestroy` хуки.

### Глобальный фильтр исключений

`AllExceptionsFilter` (`@Catch()`) — ловит ВСЕ исключения, включая необработанные runtime-ошибки. Логирует стек неожиданных ошибок, клиенту возвращает 500 в едином формате.

### Утилиты

`common/utils/parse-ttl.ts` — общая функция парсинга TTL-строк (`15m`, `7d`) в миллисекунды/Date. Используется в AuthService и AuthController (DRY).

---

## Зависимости (добавлены)

### Production

`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/config`, `@nestjs/throttler`, `bcryptjs`, `class-validator`, `class-transformer`, `cookie-parser`

### Dev

`@types/bcryptjs`, `@types/passport-jwt`, `@types/cookie-parser`
