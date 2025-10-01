# Динамическая система типов для API документации

## Обзор

Реализована система автоматического извлечения типов ответов из `.d.ts` файлов и их динамического отображения в API документации.

## Что было сделано

### 1. Удалены поля `requestBody` и `response` из роутов (`app/routes/httpRoutes.ts`)

- **Удалены все поля `response`** - типы ответов теперь извлекаются автоматически из `.d.ts` файлов
- **Удалены все поля `requestBody`** - схемы запросов определяются через валидаторы
- **Упрощена структура роутов** - остались только основные поля: `url`, `method`, `handler`, `validator`, `description`

**Было:**

```typescript
{
    url: '/register',
    method: 'post',
    handler: AuthController.register,
    validator: 'register',
    description: 'Register a new user',
    requestBody: {
        description: 'User registration data',
        schema: { /* ... */ }
    },
    response: {
        type: 'RegisterResponse',
        description: 'Returns registered user data',
        schema: { /* ... */ }
    }
}
```

**Стало:**

```typescript
{
    url: '/register',
    method: 'post',
    handler: AuthController.register,
    validator: 'register',
    description: 'Register a new user'
}
```

### 2. Создан парсер типов (`vendor/utils/parseTypesFromDts.ts`)

- **Функция `parseTypesFromDtsFiles()`** - читает все `.d.ts` файлы из папки типов
- **Функция `parseInterfaces()`** - парсит TypeScript интерфейсы с поддержкой многострочных определений
- **Функция `parseFields()`** - извлекает поля интерфейсов с правильной обработкой типов
- **Функция `parseFieldType()`** - конвертирует TypeScript типы в JSON Schema формат
- **Функция `buildHandlerToTypeMapping()`** - создает маппинг между хендлерами и типами ответов

### 3. Обновлен сервер (`vendor/start/server.ts`)

- **`docRoutesHandler`** теперь читает типы напрямую из `.d.ts` файлов
- Добавлена передача `responseTypes` и `handlerTypeMapping` на фронтенд
- Исправлен путь к папке типов для работы в production режиме

### 4. Обновлен фронтенд (`public/doc/doc.js`)

- **`renderResponseSchema()`** теперь использует типы из бэкенда
- Добавлена поддержка автоматического маппинга хендлеров к типам
- Улучшено отображение схем ответов

## Как это работает

### 1. На бэкенде

```typescript
// В docRoutesHandler
const { types, mapping } = getApiTypesForDocumentation(
    typesDirectory,
    httpRoutes,
);

res.end(
    JSON.stringify({
        httpRoutes,
        wsRoutes,
        validationSchemas,
        responseTypes: types, // ← Новое: типы из .d.ts файлов
        handlerTypeMapping: mapping, // ← Новое: маппинг хендлеров к типам
    }),
);
```

### 2. На фронтенде

```javascript
// Автоматическое определение типа ответа
const responseTypeName = handlerTypeMapping[handlerName];
const hasResponseType = responseTypeName && responseTypes[responseTypeName];

// Отображение схемы
if (hasResponseType) {
    // Показать схему из .d.ts файла
    renderResponseSchema(route.response, handlerName);
}
```

## Преимущества

✅ **Автоматическое обновление** - типы синхронизируются автоматически  
✅ **Нет дублирования** - типы определяются только в `.d.ts` файлах  
✅ **Type Safety** - полная проверка типов на всех уровнях  
✅ **Простота поддержки** - достаточно обновить `.d.ts` файл  
✅ **Обратная совместимость** - старые `response` поля продолжают работать

## Структура данных

### Типы ответов (`responseTypes`)

```javascript
{
  "RegisterResponse": {
    "name": "RegisterResponse",
    "fields": {
      "status": {
        "type": "enum",
        "required": true,
        "example": "ok"
      },
      "message": {
        "type": "string",
        "required": false,
        "example": "example"
      }
    }
  }
}
```

### Маппинг хендлеров (`handlerTypeMapping`)

```javascript
{
  "register": "RegisterResponse",
  "login": "LoginResponse",
  "ping": "PingResponse"
}
```

## Поддерживаемые типы

- ✅ Примитивные типы: `string`, `number`, `boolean`
- ✅ Union типы: `'ok' | 'error'`
- ✅ Массивы: `Array<Type>`, `Type[]`
- ✅ Объекты: `{ key: value }`
- ✅ Опциональные поля: `field?: type`
- ✅ Вложенные объекты и массивы

## Использование

### 1. Определите тип в `.d.ts` файле

```typescript
// app/controllers/http/types/AuthController.d.ts
export interface LoginResponse {
    status: 'ok' | 'error';
    message?: string;
    token?: string;
}
```

### 2. Используйте в контроллере

```typescript
// app/controllers/http/AuthController.ts
import type { LoginResponse } from './types/AuthController.js';

export default {
    async login(): Promise<LoginResponse> {
        return { status: 'ok', token: 'abc123' };
    },
};
```

### 3. Тип автоматически появится в документации

Документация автоматически покажет схему `LoginResponse` для роута с хендлером `login`.

## Файлы

- **Парсер**: `vendor/utils/parseTypesFromDts.ts`
- **Сервер**: `vendor/start/server.ts` (функция `docRoutesHandler`)
- **Фронтенд**: `public/doc/doc.js` (функция `renderResponseSchema`)

## Результат

Теперь API документация автоматически отображает актуальные типы ответов, извлеченные напрямую из TypeScript определений, без необходимости дублирования информации в роутах.
