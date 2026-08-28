# kouci-api

Core backend platform for Kouci, powering synchronization, telemetry, analytics, and data services for water polo teams and clubs.

## Prerequisites

- Node.js 20+
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
npm run db:generate
npm run db:migrate
```

## Start the development server

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

## Run tests

```bash
npm run test
```

## Project structure

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
```

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
