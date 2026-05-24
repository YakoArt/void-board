# Спецификация модуля: Projects

> Живой документ — обновляется при изменениях в коде.

---

## Обзор

Модуль проектов реализует полный CRUD: создание, список, просмотр, редактирование, удаление. Текущий пользователь автоматически становится owner. Slug генерируется автоматически из name при создании и не меняется при обновлении. Навигация: `/projects` — главная страница приложения.

---

## Модель данных

### Project (`projects`)

| Поле | Тип | Описание |
|---|---|---|
| `id` | UUID | Первичный ключ |
| `slug` | String (unique) | URL-friendly идентификатор, генерируется из name |
| `name` | String | Название проекта (1–100 символов) |
| `description` | String? | Описание проекта (до 2000 символов) |
| `ownerId` | UUID (FK → User) | Владелец проекта |
| `createdAt` | DateTime | Дата создания |
| `updatedAt` | DateTime | Дата обновления |

**Индексы:** `slug` (unique), `ownerId` (index).

**Каскадное удаление:** При удалении проекта автоматически удаляются все связанные `Issue` и `Label` (настроено в Prisma-схеме через `onDelete: Cascade`).

---

## Slug-генерация

- **Библиотека:** `slugify` (npm)
- **Алгоритм:** `slugify(name, { lower: true, strict: true })` → обрезка до 50 символов → суффикс `-xxxx` (4 случайных символа a-z0-9)
- **Транслитерация:** Кириллица автоматически транслитерируется (`Мой проект` → `moj-proekt-a1b2`)
- **Коллизии:** Retry до 5 попыток при нарушении уникальности slug
- **Валидация:** Если после slugify строка пустая (name из одних спецсимволов) — `BadRequestException`
- **Неизменяемость:** Slug не пересоздаётся при обновлении name

**Файл:** `apps/api/src/common/utils/generate-slug.ts`

---

## API-эндпоинты

Все эндпоинты защищены JWT (глобальный `JwtAuthGuard`). Пользователь видит только свои проекты — ownership проверяется через `ownerId === user.id`. При попытке доступа к чужому проекту возвращается 404 (не 403) для предотвращения утечки информации.

| Метод | Путь | Описание | Код ответа |
|---|---|---|---|
| `POST` | `/api/projects` | Создать проект | 201 Created |
| `GET` | `/api/projects` | Список проектов пользователя | 200 OK |
| `GET` | `/api/projects/:slug` | Получить проект по slug | 200 OK |
| `PATCH` | `/api/projects/:slug` | Обновить проект | 200 OK |
| `DELETE` | `/api/projects/:slug` | Удалить проект | 204 No Content |

### Тело запроса: POST /api/projects

```json
{
  "name": "string (required, 1-100)",
  "description": "string (optional, max 2000)"
}
```

### Тело запроса: PATCH /api/projects/:slug

```json
{
  "name": "string (optional, 1-100)",
  "description": "string | null (optional, max 2000, null очищает поле)"
}
```

Отправляются только изменённые поля.

### Тело ответа: ProjectResponseDto

```json
{
  "id": "uuid",
  "slug": "string",
  "name": "string",
  "description": "string | null",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

Без `ownerId` — пользователь видит только свои проекты.

---

## Бэкенд-структура

```
apps/api/src/projects/
├── dto/
│   ├── create-project.dto.ts    # CreateProjectDto (class-validator)
│   ├── update-project.dto.ts    # UpdateProjectDto (class-validator)
│   └── project-response.dto.ts  # ProjectResponseDto (interface)
├── projects.controller.ts       # REST-контроллер
├── projects.service.ts          # Бизнес-логика
└── projects.module.ts           # NestJS-модуль

apps/api/src/common/utils/
└── generate-slug.ts             # Утилита генерации slug
```

- **PrismaService** — глобальный, инжектируется напрямую без импорта модуля
- **ProjectsModule** — зарегистрирован в `AppModule.imports`
- **ProjectsService** — экспортируется (для будущего использования в Issues)

---

## Фронтенд

### Сервис и модели

```
apps/web/src/app/core/projects/
├── projects.models.ts   # Интерфейсы: Project, CreateProjectRequest, UpdateProjectRequest
└── projects.service.ts  # HTTP-сервис (providedIn: 'root')
```

### Компоненты

```
apps/web/src/app/features/projects/
├── project-list/        # Список проектов (карточки, empty state, ошибки)
├── project-create/      # Форма создания (ReactiveFormsModule)
├── project-detail/      # Страница проекта (шапка, кнопки, плейсхолдер issues)
└── project-edit/        # Форма редактирования (предзаполненная)
```

Все компоненты — standalone, используют signals для состояния, PrimeNG для UI.

### Маршруты

| Путь | Компонент | Guard |
|---|---|---|
| `/projects` | ProjectListComponent | authGuard |
| `/projects/new` | ProjectCreateComponent | authGuard |
| `/projects/:slug` | ProjectDetailComponent | authGuard |
| `/projects/:slug/edit` | ProjectEditComponent | authGuard |

- `/` и `**` редиректят на `/projects`
- `guestGuard` редиректит залогиненных на `/projects`
- В хедере добавлена ссылка «Проекты» для авторизованных пользователей

---

## Обработка ошибок

### Бэкенд

| Ситуация | Исключение | HTTP-код |
|---|---|---|
| Проект не найден / чужой проект | `NotFoundException` | 404 |
| Невалидные данные | `BadRequestException` (validation pipe) | 400 |
| Пустой slug после slugify | `BadRequestException` | 400 |
| Коллизия slug после 5 попыток | `ConflictException` | 409 |

### Фронтенд

- **Загрузка:** `p-progressSpinner` во всех компонентах
- **Ошибка загрузки:** `p-message` + кнопка «Повторить» (список)
- **404 при просмотре/редактировании:** toast + redirect на `/projects`
- **Ошибка создания/обновления:** `p-message` над формой
- **Удаление:** `p-confirmDialog` с предупреждением о каскадном удалении, toast при ошибке
- **Валидация форм:** Inline-ошибки под полями (required, maxLength)