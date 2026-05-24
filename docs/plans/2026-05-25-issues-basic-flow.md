# План реализации: Issues — базовый flow

Дизайн: `docs/designs/2026-05-25-issues-basic-flow.md`

---

## Фаза 1 — Фундамент (схема, зависимости, общие типы)

*Без зависимостей. Выполняется до любого кода backend/frontend.*

### Задача 1.1: Prisma-схема — добавить поле `number` в Issue

**Скиллы:** —

- [ ] Добавить поле `number Int` в модель `Issue` в `schema.prisma`
- [ ] Добавить `@@unique([projectId, number])` constraint
- [ ] Создать миграцию: `npx prisma migrate dev --name add-issue-number`
- [ ] Сгенерировать клиент: `npx prisma generate`
- [ ] Убедиться, что миграция применилась без ошибок

**Файлы:** `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/*/`

### Задача 1.2: Установить `@angular/cdk`

**Скиллы:** —

- [ ] Установить `@angular/cdk` (`npm install @angular/cdk` в корне monorepo)
- [ ] Убедиться, что версия совместима с текущей версией Angular в `package.json`

**Файлы:** `package.json`, `package-lock.json`

---

## Фаза 2 — Backend + Frontend core (параллельно)

*Зависит от: Фазы 1 (Prisma-клиент сгенерирован, CDK установлен)*

### Задача 2.1: Backend — DTOs

**Скиллы:** `nestjs-best-practices`

- [ ] Создать `apps/api/src/issues/dto/create-issue.dto.ts` — class-validator: `title` (IsString, IsNotEmpty, MaxLength(200)), `description` (IsOptional, IsString), `priority` (IsOptional, IsEnum(IssuePriority)), `status` (IsOptional, IsEnum(IssueStatus))
- [ ] Создать `apps/api/src/issues/dto/update-issue.dto.ts` — все поля опциональные, `description` допускает `null` (ValidateIf)
- [ ] Создать `apps/api/src/issues/dto/issue-response.dto.ts` — interface `IssueResponse` с полями: id, number, title, description, status, priority, reporter: { id, name }, closedAt, createdAt, updatedAt

**Файлы:** `apps/api/src/issues/dto/create-issue.dto.ts`, `apps/api/src/issues/dto/update-issue.dto.ts`, `apps/api/src/issues/dto/issue-response.dto.ts`

### Задача 2.2: Backend — Service + Controller + Module

**Скиллы:** `nestjs-best-practices`

- [ ] Создать `apps/api/src/issues/issues.service.ts`:
  - Инжектировать `PrismaService` и `ProjectsService`
  - `create(userId, slug, dto)` — найти проект через `ProjectsService`, в `$transaction`: получить max number + создать Issue с reporter = userId
  - `findAll(userId, slug)` — найти проект, вернуть все Issues с `include: { reporter: { select: { id, name } } }`, сортировка `createdAt: 'desc'`
  - `findOne(userId, slug, number)` — найти проект, найти Issue по `{ projectId, number }`, include reporter
  - `update(userId, slug, number, dto)` — найти проект, найти Issue, логика closedAt (если status меняется на done — ставим closedAt, если уходит из done — сбрасываем), обновить
  - `remove(userId, slug, number)` — найти проект, найти Issue, удалить
  - Приватный `toResponseDto()` — маппинг Prisma → IssueResponse
- [ ] Создать `apps/api/src/issues/issues.controller.ts`:
  - `@Controller('projects/:slug/issues')` — nested route
  - `@Post()` → create, `@HttpCode(HttpStatus.CREATED)`
  - `@Get()` → findAll
  - `@Get(':number')` → findOne, парсинг `:number` как int (ParseIntPipe)
  - `@Patch(':number')` → update
  - `@Delete(':number')` → remove, `@HttpCode(HttpStatus.NO_CONTENT)`
  - Все методы используют `@CurrentUser() user: JwtUser` и `@Param('slug') slug: string`
- [ ] Создать `apps/api/src/issues/issues.module.ts` — imports: [ProjectsModule], controllers: [IssuesController], providers: [IssuesService]
- [ ] Зарегистрировать `IssuesModule` в `apps/api/src/app/app.module.ts` (добавить в imports после ProjectsModule)

**Файлы:** `apps/api/src/issues/issues.service.ts`, `apps/api/src/issues/issues.controller.ts`, `apps/api/src/issues/issues.module.ts`, `apps/api/src/app/app.module.ts`

### Задача 2.3: Frontend — core (модели + сервис)

**Скиллы:** `angular-developer`

- [ ] Создать `apps/web/src/app/core/issues/issues.models.ts`:
  - `IssueStatus` enum (backlog, todo, in_progress, in_review, done)
  - `IssuePriority` enum (low, medium, high, urgent)
  - `Issue` interface (id, number, title, description, status, priority, reporter: { id, name }, closedAt, createdAt, updatedAt)
  - `CreateIssueRequest` interface (title, description?, priority?, status?)
  - `UpdateIssueRequest` interface (title?, description?, priority?, status?)
- [ ] Создать `apps/web/src/app/core/issues/issues.service.ts`:
  - `@Injectable({ providedIn: 'root' })`
  - `private readonly http = inject(HttpClient)`
  - `getIssues(slug: string): Observable<Issue[]>`
  - `getIssue(slug: string, number: number): Observable<Issue>`
  - `createIssue(slug: string, data: CreateIssueRequest): Observable<Issue>`
  - `updateIssue(slug: string, number: number, data: UpdateIssueRequest): Observable<Issue>`
  - `deleteIssue(slug: string, number: number): Observable<void>`

**Файлы:** `apps/web/src/app/core/issues/issues.models.ts`, `apps/web/src/app/core/issues/issues.service.ts`

---

## Фаза 3 — Frontend компоненты (параллельно)

*Зависит от: Задачи 2.3 (модели и сервис готовы)*

### Задача 3.1: IssueCardComponent

**Скиллы:** `angular-developer`, `angular-best-practices-primeng`

- [ ] Создать `apps/web/src/app/features/issues/issue-card/issue-card.component.ts`:
  - Standalone, `input()` для Issue
  - Маппинг приоритета → цвет (urgent: красный, high: оранжевый, medium: жёлтый, low: серый)
  - `output()` для клика (навигация делается в родителе)
- [ ] Создать `issue-card.component.html` — номер + бейдж приоритета (цветная точка + текст), title (max 2 строки, обрезка)
- [ ] Создать `issue-card.component.scss` — стили карточки: hover-подсветка (`surface-hover`), курсор `grab`, CSS-переменные PrimeNG (`--p-*`)

**Файлы:** `apps/web/src/app/features/issues/issue-card/issue-card.component.ts`, `apps/web/src/app/features/issues/issue-card/issue-card.component.html`, `apps/web/src/app/features/issues/issue-card/issue-card.component.scss`

### Задача 3.2: IssueBoardComponent + встройка в ProjectDetail

**Скиллы:** `angular-developer`, `angular-best-practices-primeng`

- [ ] Создать `apps/web/src/app/features/issues/issue-board/issue-board.component.ts`:
  - Standalone, `input()` для slug
  - Инжектировать `IssuesService`, `MessageService`, `Router`
  - Signals: `issues`, `isLoading`, `errorMessage`
  - `computed()` для группировки issues по статусам (5 колонок)
  - CDK DragDrop: `cdkDropListGroup`, `cdkDropList` на каждой колонке, `cdkDrag` на карточках
  - `onDrop(event)` — оптимистичный UI: переместить карточку в массиве, вызвать `updateIssue` с новым status, при ошибке — откатить + toast
  - Кнопка «+ New Issue» → навигация на `/projects/:slug/issues/new`
- [ ] Создать `issue-board.component.html` — 5 колонок с заголовками и счётчиками, карточки через `@for`, пустое состояние, спиннер загрузки, сообщение об ошибке
- [ ] Создать `issue-board.component.scss` — grid/flex layout колонок (равные доли), стили колонок с цветовыми акцентами, горизонтальный скролл, CDK drag-drop визуальные стили (placeholder, preview)
- [ ] Встроить `IssueBoardComponent` в `project-detail.component.html` — заменить блок `vb-issues-placeholder` на `<app-issue-board [slug]="project.slug" />`
- [ ] Добавить импорт `IssueBoardComponent` в `project-detail.component.ts`

**Файлы:** `apps/web/src/app/features/issues/issue-board/issue-board.component.ts`, `apps/web/src/app/features/issues/issue-board/issue-board.component.html`, `apps/web/src/app/features/issues/issue-board/issue-board.component.scss`, `apps/web/src/app/features/projects/project-detail/project-detail.component.html`, `apps/web/src/app/features/projects/project-detail/project-detail.component.ts`

### Задача 3.3: IssueCreateComponent + роут

**Скиллы:** `angular-developer`, `angular-best-practices-primeng`

- [ ] Создать `apps/web/src/app/features/issues/issue-create/issue-create.component.ts`:
  - Standalone, ReactiveFormsModule
  - Форма: title (required, maxLength 200), description, priority (default medium), status (default backlog)
  - `isFieldInvalid()` хелпер
  - `isSaving` signal
  - `onSubmit()` → `IssuesService.createIssue()`, при успехе — навигация на `/projects/:slug` + toast «Issue #N создан»
  - `onCancel()` → навигация назад на `/projects/:slug`
- [ ] Создать `issue-create.component.html` — форма с `p-inputText`, `p-textarea` (autoResize), `p-select` для priority и status, inline-ошибки, кнопки «Создать» и «Отмена»
- [ ] Создать `issue-create.component.scss` — стили формы (паттерн из project-create)
- [ ] Добавить роут `/projects/:slug/issues/new` в `app.routes.ts` — **до** роута `/:slug/issues/:number`, lazy-load через `loadComponent`

**Файлы:** `apps/web/src/app/features/issues/issue-create/issue-create.component.ts`, `apps/web/src/app/features/issues/issue-create/issue-create.component.html`, `apps/web/src/app/features/issues/issue-create/issue-create.component.scss`, `apps/web/src/app/app.routes.ts`

### Задача 3.4: IssueDetailComponent + роут

**Скиллы:** `angular-developer`, `angular-best-practices-primeng`

- [ ] Создать `apps/web/src/app/features/issues/issue-detail/issue-detail.component.ts`:
  - Standalone, ReactiveFormsModule
  - Signals: `issue`, `isLoading`, `isEditing`, `isSaving`
  - Загрузка Issue по `slug` и `number` из route params
  - Режим просмотра: read-only поля
  - Режим редактирования: форма (title, description, status, priority)
  - `onSave()` → `IssuesService.updateIssue()`, при успехе — выход из режима редактирования + toast
  - `onDelete()` → `ConfirmationService.confirm()`, при подтверждении — `IssuesService.deleteIssue()`, навигация на `/projects/:slug` + toast
  - `onBack()` → навигация на `/projects/:slug`
  - Обработка 404 — редирект на доску + toast
- [ ] Создать `issue-detail.component.html` — два режима (просмотр/редактирование), заголовок `#N — Title`, бейджи status и priority, description, reporter, даты, кнопки действий, `p-confirmDialog`
- [ ] Создать `issue-detail.component.scss` — стили детального просмотра (паттерн из project-detail)
- [ ] Добавить роут `/projects/:slug/issues/:number` в `app.routes.ts` — **после** роута `issues/new`, lazy-load

**Файлы:** `apps/web/src/app/features/issues/issue-detail/issue-detail.component.ts`, `apps/web/src/app/features/issues/issue-detail/issue-detail.component.html`, `apps/web/src/app/features/issues/issue-detail/issue-detail.component.scss`, `apps/web/src/app/app.routes.ts`

---

## Фаза 4 — Интеграция и проверка

*Зависит от: Фазы 2 и 3 (весь backend и frontend готовы)*

### Задача 4.1: Сквозная проверка

**Скиллы:** —

- [ ] Запустить backend (`npx nx serve api`) — убедиться, что стартует без ошибок
- [ ] Запустить frontend (`npx nx serve web`) — убедиться, что компилируется без ошибок
- [ ] Проверить полный цикл через API (curl или Postman): создать Issue, получить список, получить по номеру, обновить статус (проверить closedAt), удалить
- [ ] Проверить frontend: открыть проект → видна Kanban-доска, создать Issue через форму, увидеть карточку на доске, перетащить между колонками, открыть детальный просмотр, отредактировать, удалить

**Файлы:** — (только проверка, без изменений)

---

## Конфликты файлов — анализ

| Файл | Задачи | Конфликт? |
|---|---|---|
| `schema.prisma` | 1.1 | Нет (единственная) |
| `package.json` | 1.2 | Нет (единственная) |
| `app.module.ts` (backend) | 2.2 | Нет (единственная) |
| `app.routes.ts` (frontend) | 3.3, 3.4 | ⚠️ Обе добавляют роуты |
| `project-detail.component.*` | 3.2 | Нет (единственная) |

**Решение конфликта `app.routes.ts`:** Задача 3.3 добавляет роут `issues/new`, задача 3.4 добавляет роут `issues/:number`. Обе задачи редактируют один файл. **Задача 3.4 зависит от 3.3** (роут `new` должен быть до `:number`), поэтому 3.4 добавляет свой роут после того, как 3.3 уже добавила свой. Альтернатива: объединить обе задачи в одну — но они достаточно независимы по компонентам, конфликт только в одной строке роутов. **Рекомендация:** задача 3.4 добавляет роут после завершения 3.3, либо лид добавляет оба роута сам перед стартом фазы 3.

---

## Рекомендация по команде

**3 члена команды:**
- **Агент A (backend):** Задачи 2.1 → 2.2
- **Агент B (frontend-core):** Задачи 2.3 → 3.1 → 3.3
- **Агент C (frontend-board):** Ждёт завершения 2.3 → 3.2 → 3.4

Фаза 1 выполняется лидом (быстрые инфраструктурные задачи).
Фаза 4 выполняется лидом после завершения всех задач.