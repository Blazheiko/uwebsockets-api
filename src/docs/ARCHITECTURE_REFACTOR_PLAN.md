# Backend Architecture Refactor Plan

Target request flow:

`Client -> Controller -> Service -> Repository -> Service -> Transformer -> Controller -> Client`

## Layer responsibilities

- Controller: HTTP concerns only (typed payload read, auth/session checks, response mapping, HTTP status codes).
- Service: business logic and orchestration only (calls repositories and transformers, no direct SQL).
- Repository: Drizzle ORM data access only (`select/insert/update/delete`).
- Transformer: output shaping for client-facing format (e.g. hide sensitive fields, date serialization, case conversion).

## Phase plan

1. Define service contracts and error protocol
- Add unified service result format (`ok/data` vs `error/code/message`).
- Standardize controller mapping to HTTP statuses (`200`, `400`, `401`, `404`, `409`, `500`).

2. Migrate domain endpoints to service layer
- Move business logic from controllers into `app/services/*`.
- Controllers become thin adaptors around payload extraction + service call + response.

3. Remove model usage from controllers
- Replace direct `models/*` access with repositories through services.
- Keep repositories as the only DB boundary.

4. Verify and stabilize
- Run backend typecheck/tests.
- Fix residual typing/legacy issues not directly related to architecture migration.

## Implemented in this iteration

- Added `app/services/shared/service-result.ts`.
- Added service layer modules:
  - `app/services/auth-service.ts`
  - `app/services/main-service.ts`
  - `app/services/calendar-service.ts`
  - `app/services/notes-service.ts`
  - `app/services/chat-list-service.ts`
  - `app/services/message-service.ts`
  - `app/services/invitation-service.ts`
  - `app/services/push-subscription-service.ts`
  - `app/services/task-service.ts`
  - `app/services/project-service.ts`
  - `app/services/ws-service.ts`
  - `app/services/ws-presence-service.ts`
- Refactored:
  - `app/controllers/http/auth-controller.ts`
  - `app/controllers/http/main-controller.ts`
  - `app/controllers/http/calendar-controller.ts`
  - `app/controllers/http/notes-controller.ts`
  - `app/controllers/http/chat-list-controller.ts`
  - `app/controllers/http/message-controller.ts`
  - `app/controllers/http/invitation-controller.ts`
  - `app/controllers/http/push-subscription-controller.ts`
  - `app/controllers/http/task-controller.ts`
  - `app/controllers/http/project-controller.ts`
  to follow Controller -> Service flow.
- Refactored WS/event layer:
  - `app/controllers/ws/ws-api-controller.ts`
  - `app/events/ws-events/ws-event-handler.ts`
  to thin handlers with service orchestration.
- Extended `taskRepository` with `findAll()` to support test endpoint through repository/service layer.
- Fixed typing mismatches that blocked migration (`contact-list-repository.ts`, legacy stats imports).

## Next migration targets

- Standardize service naming and split oversized domain services into smaller use-case services where needed.

## Risks and notes

- Repository currently contains mixed response-shape patterns across domains (some endpoints return transformed rows, others wrapped objects).
- Notes controller/types still include historical naming conventions (`ok` statuses and mixed date key styles).
