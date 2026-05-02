# HTTP Body Limits Plan

## 1. Контекст и цель

В `packages/backend/src/vendor/utils/network/http-request-handlers.ts` лимит на размер request body один общий (`config.maxBodySize`, 10 MB). Это плохо: для JSON безопасно 1 MB, для загрузки файлов 10 MB мало. Кроме того, при превышении бросается обычный `Error`, который уходит клиенту как `500`, а не как `413 Payload Too Large`.

**Цель:** разные лимиты по типам payload, задаются через env, корректный `413`, ранний отказ до чтения body, поведение под нагрузкой не ухудшается.

## 2. Текущее состояние (зафиксировано чтением кода)

| Где | Что |
|---|---|
| `http-request-handlers.ts:33` | `readData` использует глобальный `config.maxBodySize`; нет аргумента-лимита |
| `http-request-handlers.ts:34` | При превышении бросает `new Error(...)` — не отличить от внутренней ошибки |
| `http-request-handlers.ts:28` | После `reject` колбэк `onData` продолжает вызываться uWS — `Buffer.from` тратится впустую |
| `http-request-handlers.ts:24, 52` | `logger.info('readData')` / `logger.info('readJson')` — мусор в логах на каждый запрос |
| `http-request-handlers.ts` | Нет обработки `res.onAborted` — при разрыве клиента промис висит |
| `http-request-handlers.ts:107` | `contentType === 'application/json'` — строгое равенство, ломается на `application/json; charset=utf-8` |
| `http-request-handlers.ts:113, 115, 117` | То же строгое равенство для urlencoded / text / octet-stream |
| `server.ts:215` | Дублирующая строгая проверка `contentType?.trim().toLowerCase() === 'application/json'` для `isPayload` — multipart-формы и `application/json; charset=utf-8` **не валидируются** |
| `server.ts:285 handleError` | Нет ветки для PayloadTooLarge — всё уходит в `500` |
| `config/app.ts:55` | `maxBodySize` захардкожен, env-переменной нет |

## 3. Решения по развилкам (приняты до начала)

1. **Конфиг.** Вводим три новых лимита: `maxJsonBodySize`, `maxMultipartBodySize`, `maxOctetStreamBodySize`. Старый `maxBodySize` остаётся как fallback для всего остального (urlencoded, text, неизвестные типы) и выносится в env заодно.
2. **Дефолты:**
   - `maxJsonBodySize`: **1 MB** (1 048 576)
   - `maxMultipartBodySize`: **50 MB** (52 428 800)
   - `maxOctetStreamBodySize`: **100 MB** (104 857 600)
   - `maxBodySize` (fallback): **1 MB** (1 048 576)

   Принцип: строже текущих 10 MB для JSON, мягче для загрузок.
3. **Расположение ошибки.** `PayloadTooLargeError` живёт в `src/vendor/utils/network/errors/payload-too-large-error.ts` — транспортная ошибка, не доменная.
4. **Где вычислять лимит.** В `getHttpData` (caller), передаётся в `getData(res, contentType, headers, limit)`. `getData` остаётся чистой утилитой без зависимости от config — проще тестировать.
5. **Определение типа body.** Один helper `detectBodyKind(contentType): BodyKind` возвращает `'json' | 'multipart' | 'urlencoded' | 'text' | 'octet' | 'other'`. И выбор лимита, и выбор парсера используют его — нет двух источников истины.
6. **Чек JSON.** Не `startsWith('application/json')` (заматчит `application/json-patch+json`), а `/^application\/json\s*(;|$)/i`.
7. **Поведение без `Content-Type`.** Сохраняем текущее: body не читается, лимит не применяется.
8. **Ранний отказ.** Если `Content-Length` присутствует и больше лимита — бросаем `PayloadTooLargeError` **до** открытия `onData`. Если заголовка нет (chunked) или он лжёт — стрим-чек ловит превышение.
9. **Формат ответа `413`:** `{ "message": "Payload too large", "limit": <bytes>, "contentType": "<type>" }`.
10. **Env-парсинг.** Новый helper `parseSize(value, default)` в `config/app.ts` рядом с `parseBoolean`/`parsePort`. Принимает целое число байт. Без суффиксов (`kb`/`mb`) — простота важнее, дефолты литеральные числа в коде.

## 4. Out of scope (зафиксировано осознанно)

- **Per-route лимиты.** Глобальные по типу — намеренно. Per-route потребует расширения `RouteItem` — отдельная задача.
- **Лимит для WS** (`server.ts:120 maxPayloadLength`). Захардкожен 1 MB — оставляем.
- **Соседний баг с валидацией multipart** (`server.ts:215`). Лечим только дублирующую проверку content-type, но не расширяем валидатор на multipart-payload — это отдельный архитектурный вопрос (как валидировать поля + файлы вместе).
- **Лимит для DELETE с body.** Сейчас body читается только для POST/PUT — оставляем.
- **Hot-reload лимитов.** Применяются на старте процесса, изменение требует рестарта.

## 5. Изменения по файлам (порядок имплементации)

Порядок выбран так, чтобы каждый коммит был самодостаточным.

### 5.1. Создать `PayloadTooLargeError`
**Файл:** `src/vendor/utils/network/errors/payload-too-large-error.ts` (новый)

```ts
export class PayloadTooLargeError extends Error {
  readonly name = 'PayloadTooLargeError';
  constructor(
    public readonly limit: number,
    public readonly contentType: string,
  ) {
    super(`Payload exceeds limit ${String(limit)} bytes for ${contentType}`);
  }
}
```

Без поля `actualSize` — при стрим-чеке точное значение неизвестно (мы не дочитали), при `Content-Length`-чеке оно равно заголовку.

### 5.2. Расширить config
**Файл:** `src/config/app.ts`

- Добавить helper `parseSize(value: string | undefined, defaultValue: number): number` (число байт, NaN/<=0 → default).
- Добавить четыре поля:
  ```ts
  maxJsonBodySize: parseSize(env['APP_MAX_JSON_BODY_SIZE'], 1_048_576),
  maxMultipartBodySize: parseSize(env['APP_MAX_MULTIPART_BODY_SIZE'], 52_428_800),
  maxOctetStreamBodySize: parseSize(env['APP_MAX_OCTET_BODY_SIZE'], 104_857_600),
  maxBodySize: parseSize(env['APP_MAX_BODY_SIZE'], 1_048_576),
  ```
- Убрать литерал `10_485_760` (старое значение `maxBodySize`) — теперь дефолт 1 MB.

### 5.3. Добавить `detectBodyKind` и `resolveMaxBodySize`
**Файл:** `src/vendor/utils/network/http-request-handlers.ts`

```ts
type BodyKind = 'json' | 'multipart' | 'urlencoded' | 'text' | 'octet' | 'other';

const JSON_RE = /^application\/json\s*(;|$)/i;

const detectBodyKind = (contentType: string): BodyKind => {
  if (JSON_RE.test(contentType)) return 'json';
  if (contentType.startsWith('multipart/form-data')) return 'multipart';
  if (contentType.startsWith('application/x-www-form-urlencoded')) return 'urlencoded';
  if (contentType.startsWith('text/plain')) return 'text';
  if (contentType.startsWith('application/octet-stream')) return 'octet';
  return 'other';
};

const resolveMaxBodySize = (kind: BodyKind): number => {
  switch (kind) {
    case 'json': return config.maxJsonBodySize;
    case 'multipart': return config.maxMultipartBodySize;
    case 'octet': return config.maxOctetStreamBodySize;
    case 'urlencoded':
    case 'text':
    case 'other':
      return config.maxBodySize;
  }
};
```

Экспортировать обе функции (нужны для unit-тестов).

### 5.4. Переписать `readData`
**Файл:** тот же

```ts
const readData = (
  res: HttpResponse,
  limit: number,
  contentType: string,
): Promise<Buffer | null> => {
  return new Promise((resolve, reject) => {
    let stopped = false;
    const chunks: Buffer[] = [];
    let totalSize = 0;

    res.onAborted(() => {
      stopped = true;
      reject(new Error('request aborted'));
    });

    res.onData((ab, isLast) => {
      if (stopped) return;
      try {
        const chunk = Buffer.from(new Uint8Array(ab));
        totalSize += chunk.length;

        if (totalSize > limit) {
          stopped = true;
          reject(new PayloadTooLargeError(limit, contentType));
          return;
        }

        chunks.push(chunk);
        if (isLast) {
          resolve(chunks.length === 1 ? chunks[0] ?? null : Buffer.concat(chunks));
        }
      } catch (e) {
        stopped = true;
        logger.error(e, 'error read data');
        reject(new Error('error read data'));
      }
    });
  });
};
```

Изменения относительно текущего: (а) аргумент `limit`, (б) флаг `stopped` против повторных вызовов, (в) `onAborted`, (г) `PayloadTooLargeError`, (д) убрать `logger.info('readData')`.

### 5.5. Обновить `getData`
**Файл:** тот же

```ts
const getData = async (
  res: HttpResponse,
  contentType: string,
  headers: Map<string, string>,
  limit: number,
): Promise<{ payload: Payload | null; files: Map<string, UploadedFile> | null }> => {
  const buffer = await readData(res, limit, contentType);
  if (buffer === null) return { payload: null, files: null };

  const kind = detectBodyKind(contentType);
  switch (kind) {
    case 'json':
      return { payload: readJson(buffer.toString()), files: null };
    case 'multipart': {
      const r = parseMultipart(buffer, contentType);
      return { payload: r.payload, files: r.files.size > 0 ? r.files : null };
    }
    case 'urlencoded':
      return { payload: parseUrlEncoded(buffer), files: null };
    case 'text':
      return { payload: buffer.toString(), files: null };
    case 'octet':
      return { payload: null, files: buildOctetFile(buffer, headers) };
    case 'other':
      return { payload: null, files: null };
  }
};
```

`buildOctetFile` — извлечённый текущий блок octet-stream (`http-request-handlers.ts:117–128`), без логических изменений. Убрать `logger.info('readJson')`.

### 5.6. Обновить `getHttpData` в `server.ts`
**Файл:** `src/vendor/start/server.ts`

В `getHttpData`:

1. Заменить дублирующую строгую проверку (`server.ts:215`) на `detectBodyKind(contentType) === 'json'` — теперь `application/json; charset=utf-8` тоже валидируется.
2. Перед вызовом `getData` посчитать лимит:
   ```ts
   const kind = detectBodyKind(contentType);
   const limit = resolveMaxBodySize(kind);
   ```
3. Ранний чек `Content-Length`:
   ```ts
   const declared = Number(headers.get('content-length') ?? '');
   if (Number.isFinite(declared) && declared > limit) {
     throw new PayloadTooLargeError(limit, contentType);
   }
   ```
4. Передать `limit` четвёртым аргументом в `getData`.

### 5.7. Обработка ошибки в `handleError`
**Файл:** тот же `server.ts`

В `handleError` (строка 285) добавить ветку **до** generic `else`:

```ts
if (error instanceof PayloadTooLargeError) {
  logger.warn({ limit: error.limit, contentType: error.contentType }, 'Payload too large');
  res.writeStatus('413');
  res.end(JSON.stringify({
    message: 'Payload too large',
    limit: error.limit,
    contentType: error.contentType,
  }));
  return;
}
```

`logger.warn` — потому что регулярные срабатывания → сигнал для мониторинга (DoS / баг клиента).

## 6. Сопутствующие изменения

### 6.1. Документация env
- **`CLAUDE.md`** — секция «Environment Variables»: добавить четыре новые переменные.
- **`packages/backend/.env.example`** (если файл существует — добавить с комментариями про дефолты; новый файл специально для этого PR не создавать).

### 6.2. Координация с reverse proxy
В описание PR добавить пункт: «при деплое за nginx/cloudflare убедиться, что `client_max_body_size` ≥ 100 MB, иначе octet-stream-загрузки будут резаться прокси раньше нашего лимита».

### 6.3. API playground
`serializeRoutes` (`server.ts:328`) можно расширить, чтобы каждый роут отдавал расчётный лимит — фронтендеры увидят его в playground. **Решение:** оставляем на отдельный PR, не блокирующий.

## 7. Тесты

### 7.1. Сначала проверить инфраструктуру
До написания тестов: открыть `packages/backend/` и зафиксировать, есть ли уже интеграционные тесты HTTP (`vitest` + поднятый сервер) или только unit-уровень. От этого зависит, куда класть кейсы из 7.3.

### 7.2. Unit-тесты (быстрые, обязательные)
Файл `http-request-handlers.test.ts` (или рядом):
- `detectBodyKind`:
  - `'application/json'` → `'json'`
  - `'application/json; charset=utf-8'` → `'json'`
  - `'application/json-patch+json'` → `'other'` (важный регрессионный кейс)
  - `'multipart/form-data; boundary=xxx'` → `'multipart'`
  - `''` → `'other'`
- `resolveMaxBodySize`: возвращает правильные значения config для каждого `BodyKind`.

### 7.3. Интеграционные тесты (если инфраструктура позволяет)
- JSON body < лимита → 200
- JSON body == лимита **точно** → 200 (граничный, проверка off-by-one)
- JSON body > лимита → 413, тело ответа содержит `limit` и `contentType`
- JSON body, `Content-Length` > лимита → 413 **без** чтения тела
- multipart < и > лимита → 200 / 413
- octet-stream > JSON-лимита, но < octet-лимита → 200 (доказывает разделение)
- `application/json; charset=utf-8` с валидным payload → 200 + сработала валидация (регрессия `server.ts:215`)
- POST без `Content-Type` → текущее поведение сохранено (body не читается)

### 7.4. Чего не покрываем тестами
- Поведение при `res.onAborted` — сложно эмулировать без поднятого uWS-сервера. Документируем как «проверено вручную».

## 8. Риски и откат

| Риск | Митигация |
|---|---|
| Дефолт JSON 1 MB меньше, чем у текущих клиентов → шторм 413 после деплоя | Перед мерджем grep по фронтенду на крупные JSON-payload (массовый импорт, base64-картинки). Если найдены — поднять дефолт или убрать ручку из общего лимита. |
| OOM при росте multipart-нагрузки (50 MB × N concurrent) | Зафиксировать в README backend формулу `peak ≈ concurrent × maxMultipartBodySize × 2` и согласовать с RAM хоста. Для аварийного снижения — env `APP_MAX_MULTIPART_BODY_SIZE`. |
| Прокси режет раньше нашего лимита | Пункт 6.2. |
| Неверный env (нечисловое значение) | `parseSize` падает на default — поведение предсказуемо. |

**Откат:** изменение чисто кодовое, без миграций БД. В проде проблема → установка env в большие значения (`APP_MAX_JSON_BODY_SIZE=104857600`) даёт мгновенный workaround без релиза. Полный откат — revert PR.

## 9. Критерии готовности

- [ ] Все unit-тесты из 7.2 проходят
- [ ] Все интеграционные тесты из 7.3 (доступные на текущей инфраструктуре) проходят
- [ ] `pnpm typecheck` и `pnpm lint:fix` чисты
- [ ] Ручная проверка curl-ом:
  - `curl -X POST -H "Content-Type: application/json" --data-binary @big.json` → `413`
  - `curl -X POST -F "file=@big.bin" multipart` → `413` или `200` в зависимости от размера
- [ ] `CLAUDE.md` обновлён списком новых env
- [ ] PR-описание содержит пункт про прокси (6.2) и про дефолты (3.2)
- [ ] Срабатывание лимита в проде логируется как `warn` с `limit`/`contentType` (не как `error` с stacktrace)

## 10. Ожидаемый результат

Backend ограничивает разные типы body разными лимитами из env, отбрасывает превышение **до** чтения когда возможно (`Content-Length`) и не позже первого превышающего chunk-а в остальных случаях, отвечает корректным `413` с информативным телом, не висит при abort клиента, не флудит `logger.info` на каждый запрос. Соседний баг с невалидируемым `application/json; charset=utf-8` починен попутно.
