# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript wrapper around uWebSockets.js providing HTTP routing and WebSocket handling. Uses Node 22+, Drizzle ORM with MySQL, and Redis for sessions.

## Commands

```bash
npm run dev              # Development server with auto-reload
npm run build            # Build TypeScript to dist/
npm run start            # Run compiled application
npm run lint             # ESLint with Prettier

# Database (Drizzle ORM)
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Run pending migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Visual database browser

npm run export-types     # Export controller types for frontend
```

## Architecture

Three-layer separation of concerns:

1. **Controllers** (`app/controllers/`) - Transport layer only. Handle request/response formatting, delegate to Models/Services. Never query database directly.

2. **Models** (`app/models/`) - Data access layer. All database operations via Drizzle ORM. Include `serialize()` method for safe output.

3. **Services** (`app/servises/`) - Business logic layer. Complex operations, orchestration between models.

Request flow: `Router → Controller → Service/Model → Database`

## Key Directories

| Purpose | Location |
|---------|----------|
| HTTP controllers | `app/controllers/http/` |
| WebSocket handlers | `app/controllers/ws/` |
| Response types | `app/controllers/http/types/` |
| Data models | `app/models/` |
| Business logic | `app/servises/` |
| Routes | `app/routes/http-routes.ts`, `ws-routes.ts` |
| Validation schemas | `app/validate/schemas/schemas.ts` |
| Middleware registry | `app/middlewares/kernel.ts` |
| Database schema | `database/schema.ts` |
| Configuration | `config/` |
| Framework utilities | `vendor/` |

## Path Aliases

```
#app/*        → ./app/*
#config/*     → ./config/*
#database/*   → ./database/*
#utils/*      → ./vendor/utils/*
#vendor/*     → ./vendor/*
#logger       → ./logger.ts
```

## Patterns & Conventions

**Response Types**: Name pattern `{MethodName}Response` in `app/controllers/http/types/`

**Routes**: Defined with handler, optional validator (references schema name), middlewares array, and typeResponse

**Validation**: VineJS schemas in `app/validate/schemas/schemas.ts`, referenced by name in route config

**Drizzle ORM**: Convert numbers to `BigInt` when querying by ID

**Code Style**:
- Functional/declarative (no classes)
- Named exports preferred
- Single quotes, 4-space indentation
- Interfaces over types

## Context Objects

Controllers receive `HttpContext` or `WsContext` containing:
- `requestId`, `logger` - Request tracking
- `httpData` / `wsData` - Request data (params, payload, query, headers, cookies)
- `responseData` - Response configuration
- `session`, `auth` - Session and authentication

## Environment

Key env vars: `APP_KEY` (min 32 chars for session signing), `MYSQL_*` for database, `REDIS_*` for session storage. See `.env.example`.
