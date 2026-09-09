# kouci-api

Core backend platform for Kouci, powering synchronization, telemetry, analytics, and data services for water polo teams and clubs.

## Prerequisites

- Node.js 24
- npm 10+
- Docker + Docker Compose

## Installation

```bash
npm install
```

## Environment setup

1. Copy `.env.example` to `.env`.
2. Adjust values if needed.

```bash
cp .env.example .env
```

## Start PostgreSQL (Docker)

```bash
docker compose up -d postgres
```

## Run database migrations

```bash
npm run db:migrate
```

## Start the development server

Generate backend licensing secrets once before the first start:

```bash
npm run license:keys
```

This creates the ignored `.env.license` file and prints the public verification key. Keep an existing key file; the generator refuses to overwrite it.

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Licensing

See [backend implementation, API contract, administration, and manual feature checks](docs/licensing.md) and the [original TODO with implemented items checked](docs/licensing-todo.md).

Apply the committed migrations with `npm run db:migrate` on a fresh database. Existing databases without migration history need their current schema baselined first. Use `db:generate` only when introducing further schema changes.

## Run tests

```bash
npm run test
```

<!-- ## Project structure -->
<!-- 
```text
src/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── clubs/
│   ├── devices/
│   ├── sync/
│   ├── telemetry/
│   ├── players/
│   └── matches/
├── db/
│   ├── schema/
│   ├── migrations/
│   └── index.ts
├── plugins/
├── shared/
│   ├── errors/
│   ├── schemas/
│   ├── types/
│   └── utils/
├── config/
├── app.ts
└── server.ts
``` -->

## Scripts

- `npm run dev` - Run API in watch mode with `tsx`
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` - Run built server
- `npm run typecheck` - Run strict TypeScript checks
- `npm run lint` - Run ESLint
- `npm run format` - Run Prettier
- `npm run test` - Run Vitest
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Apply Drizzle migrations
- `npm run db:studio` - Launch Drizzle Studio
