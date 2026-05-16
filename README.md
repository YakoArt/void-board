# Voidboard

Issue-трекер

## Стек

| Слой | Технология |
|---|---|
| Monorepo | Nx |
| Фронтенд | Angular + PrimeNG |
| Бэкенд | NestJS |
| База данных | PostgreSQL + Prisma |
| Аутентификация | JWT |
| AI | LM Studio (Gemma 4) |

## Структура

```
apps/
  web/          — Angular-приложение (фронтенд)
  api/          — NestJS-приложение (бэкенд)
  web-e2e/      — E2E тесты фронтенда (Playwright)
  api-e2e/      — E2E тесты бэкенда (Jest)
packages/
  database/     — Prisma-схема и клиент
```

## Быстрый старт

### Требования

- Node.js 20+
- Docker

### Установка

```bash
npm install
```

### Запуск базы данных

```bash
docker compose up -d
```

### Запуск приложений

```bash
# Фронтенд (http://localhost:4200)
npm run start:web

# Бэкенд (http://localhost:3000/api)
npm run start:api
```

### Сборка

```bash
npm run build
```

## Скрипты

| Команда | Описание |
|---|---|
| `npm run start:web` | Запуск фронтенда в dev-режиме |
| `npm run start:api` | Запуск бэкенда в dev-режиме |
| `npm run build` | Сборка всех проектов |
| `npm run lint` | Линтинг всех проектов |
| `docker compose up -d` | Запуск PostgreSQL |
| `docker compose down` | Остановка PostgreSQL |