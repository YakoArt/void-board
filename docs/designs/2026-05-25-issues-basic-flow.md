# Design: Issues — базовый flow

> Дата: 2026-05-25
> Статус: утверждён
> Автор: Claude + Саша

---

## Цель

Реализовать базовый CRUD Issues внутри Project: создание, просмотр, обновление, удаление. Kanban-доска с drag-and-drop для визуализации и смены статусов.

---

## Scope

### Входит

- CRUD Issues (title, description, status, priority)
- Порядковый номер Issue внутри проекта (#1, #2, #3...)
- 5 статусов: backlog → todo → in_progress → in_review → done
- 4 приоритета: low, medium, high, urgent
- Kanban-доска с колонками по статусам
- Drag-and-drop между колонками (Angular CDK)
- Автоматическое управление `closedAt` при переходе в/из done
- Reporter — автоматически текущий пользователь

### НЕ входит

- ❌ Assignee (назначение исполнителя)
- ❌ Labels (метки)
- ❌ Comments (комментарии)
- ❌ Фильтрация и поиск
- ❌ Пагинация
- ❌ acceptanceCriteria и aiSuggested (AI-фичи)
- ❌ Сортировка карточек внутри колонки
- ❌ Мобильная адаптация
- ❌ Хлебные крошки

---

## Изменения в Prisma-схеме

Добавляем поле `number` в модель `Issue`:

```prisma
model Issue {
  // ... существующие поля ...
  number    Int          // порядковый номер внутри проекта

  @@unique([projectId, number])
}
```

**Генерация номера:** При создании Issue — в транзакции: `MAX(number)` для `projectId` + 1. Первый Issue получает номер `1`.

**Миграция:** `add-issue-number`. Существующих Issues нет (MVP), миграция просто добавляет колонку.

---

## Backend API

### Эндпоинты

Все роуты вложены в проект: `/api/projects/:slug/issues`

| Метод | URL | Описание | HTTP код |
|---|---|---|---|
| `POST` | `/projects/:slug/issues` | Создать Issue | 201 |
| `GET` | `/projects/:slug/issues` | Список Issues проекта | 200 |
| `GET` | `/projects/:slug/issues/:number` | Получить Issue по номеру | 200 |
| `PATCH` | `/projects/:slug/issues/:number` | Обновить Issue | 200 |
| `DELETE` | `/projects/:slug/issues/:number` | Удалить Issue | 204 |

### DTOs

**CreateIssueDto:**

```typescript
{
  title: string             // required, 1–200 символов
  description?: string      // optional
  priority?: IssuePriority  // optional, default: medium (на уровне БД)
  status?: IssueStatus      // optional, default: backlog (на уровне БД)
}
```

**UpdateIssueDto:**

```typescript
{
  title?: string
  description?: string | null   // null = очистить
  priority?: IssuePriority
  status?: IssueStatus
}
```

**IssueResponseDto:**

```typescript
{
  id: string
  number: number
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  reporter: { id: string, name: string }
  closedAt: string | null
  createdAt: string
  updatedAt: string
}
```

### Логика сервиса

- **Ownership:** Перед любой операцией — находим проект через `ProjectsService.findBySlug(userId, slug)`. Если проект не найден или не принадлежит пользователю — 404.
- **Создание номера:** В транзакции: `findFirst({ where: { projectId }, orderBy: { number: 'desc' } })` → `number + 1` (или `1` если первый).
- **Reporter:** Автоматически — `currentUser.id`.
- **Смена статуса на done:** Автоматически ставим `closedAt: new Date()`. При уходе из done — `closedAt: null`.
- **Список:** Все Issues проекта, сортировка по `createdAt desc`. Пагинация — не в этом scope.

### Структура модуля

```
apps/api/src/issues/
├── dto/
│   ├── create-issue.dto.ts
│   ├── update-issue.dto.ts
│   └── issue-response.dto.ts
├── issues.controller.ts
├── issues.service.ts
└── issues.module.ts
```

`IssuesModule` импортирует `ProjectsModule` (для `ProjectsService`), регистрируется в `AppModule`.

---

## Frontend

### Роуты

| URL | Компонент | Описание |
|---|---|---|
| `/projects/:slug` | `ProjectDetailComponent` | Kanban-доска встроена вместо плейсхолдера |
| `/projects/:slug/issues/new` | `IssueCreateComponent` | Форма создания |
| `/projects/:slug/issues/:number` | `IssueDetailComponent` | Просмотр + редактирование |

### Компоненты

```
apps/web/src/app/features/issues/
├── issue-board/
│   ├── issue-board.component.ts
│   ├── issue-board.component.html
│   └── issue-board.component.scss
├── issue-card/
│   ├── issue-card.component.ts
│   ├── issue-card.component.html
│   └── issue-card.component.scss
├── issue-create/
│   ├── issue-create.component.ts
│   ├── issue-create.component.html
│   └── issue-create.component.scss
└── issue-detail/
    ├── issue-detail.component.ts
    ├── issue-detail.component.html
    └── issue-detail.component.scss
```

- **`IssueBoardComponent`** — Kanban-доска. 5 колонок по статусам. Получает `slug` от родителя, загружает Issues, группирует по статусу. CDK DragDrop между колонками.
- **`IssueCardComponent`** — Карточка внутри колонки: `#number`, `title`, бейдж приоритета. Клик → навигация на detail.
- **`IssueCreateComponent`** — Форма: title, description, priority, status. После создания — редирект на доску + toast.
- **`IssueDetailComponent`** — Просмотр + inline-редактирование. Удаление с подтверждением.

### Сервис

```
apps/web/src/app/core/issues/
├── issues.models.ts    // интерфейсы
└── issues.service.ts   // HttpClient, CRUD
```

### Drag & Drop

Angular CDK `DragDropModule`. При перетаскивании карточки:

1. **Оптимистичный UI** — карточка сразу в новой колонке
2. `PATCH /projects/:slug/issues/:number` с новым `status`
3. При ошибке — откат + toast

---

## UI/UX

### Kanban-колонки

| Статус | Заголовок | Цвет-акцент |
|---|---|---|
| `backlog` | Backlog | серый (surface) |
| `todo` | Todo | голубой (info) |
| `in_progress` | In Progress | жёлтый (warn) |
| `in_review` | In Review | фиолетовый |
| `done` | Done | зелёный (success) |

Каждая колонка показывает количество карточек: **"In Progress (3)"**.
Колонки — равные доли ширины. Горизонтальный скролл на узких экранах.

### Карточка Issue

```
┌─────────────────────────┐
│ #12  ·  🔴 urgent       │
│                         │
│ Fix login redirect loop │
└─────────────────────────┘
```

- Номер + бейдж приоритета (цветная точка + текст)
- Title (max 2 строки, обрезка)
- Hover: подсветка `surface-hover`
- Курсор: `grab` / `grabbing`

### Бейджи приоритета

| Priority | Цвет |
|---|---|
| urgent | красный |
| high | оранжевый |
| medium | жёлтый |
| low | серый |

Простые цветные точки, без иконок.

### Форма создания

Отдельная страница. Кнопка «+ New Issue» над доской.

- **Title** — `p-inputText`, обязательное, max 200
- **Description** — `p-textarea`, autoResize
- **Priority** — `p-select`, default: medium
- **Status** — `p-select`, default: backlog
- Кнопки: «Создать» (primary), «Отмена»

### Детальный просмотр

Два режима: просмотр и редактирование.

**Просмотр:** заголовок `#N — Title`, поля read-only (status, priority, description, reporter, даты). Кнопки: «Редактировать», «Удалить», «← Назад».

**Редактирование:** поля как формы. Кнопки: «Сохранить», «Отмена».

---

## Обработка ошибок

### Backend

| Ситуация | Ответ |
|---|---|
| Проект не найден / чужой | 404 |
| Issue не найден | 404 |
| Невалидный title | 400 |
| Невалидный status / priority | 400 |
| `:number` не число | 400 |
| Гонка при создании номера | Транзакция с retry |

### Frontend

| Ситуация | Поведение |
|---|---|
| Загрузка Issues | `p-progressSpinner` на доске |
| Пустой проект | Пустые колонки + «Нет Issues. Создайте первый!» |
| Ошибка загрузки | `p-message` severity error |
| DnD — ошибка сервера | Откат карточки + toast |
| Валидация формы | Inline-ошибки (`isFieldInvalid`) |
| Удаление | `p-confirmDialog` |
| 404 при открытии Issue | Редирект на доску + toast |

---

## Статусы — свободные переходы

Любой статус можно сменить на любой другой. Единственная автоматика:

- Переход **→ done**: `closedAt = new Date()`
- Переход **done →** любой: `closedAt = null`