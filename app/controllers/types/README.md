# Controller Response Types

Эта папка содержит TypeScript типы ответов для всех HTTP контроллеров.

## Структура

Каждый контроллер имеет свой файл типов:

- `MainController.d.ts` - типы для основного контроллера
- `AuthController.d.ts` - типы для аутентификации
- `ChatController.d.ts` - типы для чата и сообщений
- `InvitationController.d.ts` - типы для приглашений
- `NotesController.d.ts` - типы для заметок
- `CalendarController.d.ts` - типы для календаря
- `TaskController.d.ts` - типы для задач
- `ProjectController.d.ts` - типы для проектов
- `PushSubscriptionController.d.ts` - типы для push-уведомлений
- `index.d.ts` - центральный файл, экспортирующий все типы

## Использование

### В контроллере

```typescript
// Импорт типов из локального файла
import type {
    CreateNoteResponse,
    GetNotesResponse,
} from './types/NotesController.js';

export default {
    async getNotes({ session }: HttpContext): Promise<GetNotesResponse> {
        // implementation
    },

    async createNote({ httpData }: HttpContext): Promise<CreateNoteResponse> {
        // implementation
    },
};
```

### Из другого модуля

```typescript
// Импорт из центрального файла
import type {
    CreateNoteResponse,
    GetNotesResponse,
} from '#app/controllers/http/types/index.js';
```

### На фронтенде

После экспорта типов командой `npm run export-types`:

```typescript
import type {
    CreateNoteResponse,
    GetNotesResponse,
} from '#app/controllers/http/types/index.js';

async function createNote(
    title: string,
    content: string,
): Promise<CreateNoteResponse> {
    const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
    });
    return response.json();
}
```

## Принципы

1. **Один файл = один контроллер** - каждый контроллер имеет свой файл типов
2. **Экспорт через index.d.ts** - центральный файл для удобного импорта
3. **Полная типизация** - все поля имеют явные типы
4. **Документирование** - каждый тип имеет комментарий с описанием

## Добавление новых типов

1. Откройте соответствующий файл контроллера (например, `NotesController.d.ts`)
2. Добавьте новый интерфейс:

```typescript
export interface NewMethodResponse {
    status: 'ok' | 'error';
    message?: string;
    data?: YourDataType;
}
```

3. Добавьте экспорт в `index.d.ts`:

```typescript
export type {
    // ... existing exports
    NewMethodResponse,
} from './NotesController.js';
```

4. Используйте в контроллере:

```typescript
import type { NewMethodResponse } from './types/NotesController.js';

async newMethod(): Promise<NewMethodResponse> {
    return { status: 'ok', data: {...} };
}
```

5. Экспортируйте типы на фронтенд: `npm run export-types`

## Базовые типы

Все файлы могут использовать базовые типы из `index.d.ts`:

- `BaseResponse` - базовый интерфейс с полем `status`
- `ErrorResponse` - стандартный ответ об ошибке
- `SuccessResponse<T>` - успешный ответ с данными типа T
- `TypedHandler<TResponse>` - типизированный обработчик

## Преимущества этой структуры

✅ **Модульность** - типы находятся рядом с контроллерами  
✅ **Легкость навигации** - легко найти нужные типы  
✅ **Независимость** - изменения в одном контроллере не влияют на другие  
✅ **Масштабируемость** - легко добавлять новые контроллеры  
✅ **Type Safety** - полная проверка типов на этапе компиляции

## Связанные файлы

- `/vendor/types/responses.d.ts` - (удален) старый файл с типами
- `/scripts/export-types.js` - скрипт экспорта типов на фронтенд
- `/docs/RESPONSE_TYPES_GUIDE.md` - полное руководство по типизации
