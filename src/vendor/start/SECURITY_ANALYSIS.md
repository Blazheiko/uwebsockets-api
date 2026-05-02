# Анализ безопасности `packages/backend/src/vendor/start/server.ts`

Дата: 2026-04-17
Файл: `packages/backend/src/vendor/start/server.ts`
Связанные: `http-request-handlers.ts`, `config/cors.ts`, `config/cookies.ts`

---

## Сводка

| Серьёзность | Кол-во |
|---|---|
| Критично | 2 |
| Высоко | 4 |
| Средне | 5 |
| Низко | 4 |

---

## Критично

### C-1. CORS: `origin: "*"` + `credentials: true`
**Где:** `src/config/cors.ts:34,104` → применяется в `server.ts:491-499`.

Комбинация недопустима по спецификации CORS — браузер её отвергнет, но сама конфигурация говорит о неправильной модели угроз. Если кто-то «починит» проблему заменой `*` на эхо-заголовок `Origin`, сайт мгновенно станет уязвим к CSRF из любого домена, т.к. `credentials: true` включает отправку cookies.

**Рекомендация:**
- Ввести строгий whitelist доменов (env-переменная с массивом).
- Проверять `Origin` входящего запроса против whitelist, отдавать конкретный origin, а не `*`.
- Убрать `credentials: true` из дефолтов; включать только для доверенных origin.

### C-2. Rate-limit применяется **после** чтения и парсинга тела
**Где:** `server.ts:392-403` — сначала `getHttpData` (читает и парсит до 100 MB для octet-stream / 50 MB для multipart), затем `checkRateLimit`.

Атакующий может слать большие тела запросов на любой HTTP-маршрут, и сервер потратит CPU/RAM на их приём и парсинг ещё до того, как узнает, что клиент заблокирован. Это прямой вектор DoS.

**Рекомендация (развёрнуто):**

#### 1. Что нужно переставить

В `setHttpHandler` (`server.ts:377-430`) порядок должен стать:

```
1. Извлечь ip + route-метаданные (без чтения body).
2. checkRateLimit(ip, route) — если лимит превышен, сразу 429 и выход.
3. Только после этого — getHttpData (чтение/парсинг тела).
4. Middleware chain + handler.
```

#### 2. Что именно нужно из `HttpData` для rate-limit

Сейчас `checkRateLimit` (`http-rate-limit.ts:15-17`) использует только `httpData.ip`, а ключ собирается из `ip + route.url`. Тело, cookies, payload, files, headers, params — не нужны.

Значит, достаточно извлечь только IP до `getHttpData`:

```ts
const ip = getIP(req, res);              // уже есть в server.ts:217 — вынести раньше
const rateLimit = determineRateLimit(route, route.groupRateLimit);
if (rateLimit) {
  const rlResult = await checkRateLimit({ ip } as Pick<HttpData, 'ip'>, responseData, route, route.groupRateLimit);
  if (!rlResult) {
    res.cork(() => sendResponse(res, responseData));
    return;                              // тело вообще не читаем
  }
}
const httpData = await getHttpData(req, res, route, abortSignal);
```

Рефакторинг: либо сузить сигнатуру `checkRateLimit` до `(ip, responseData, route, groupRateLimit)`, либо создать лёгкий хелпер `checkRateLimitByIp`, а текущую оставить как тонкую обёртку.

#### 3. Почему `httpData.ip` безопасно извлекать до чтения тела

`getIP(req, res)` работает только с заголовками и remote-address — `req.getHeader()` и `res.getRemoteAddressAsText()`. Это не блокирует поток данных, вызывается синхронно до первого `res.onData()`. Важно лишь, что uWS требует читать заголовки **до** первого `await` после входа в хендлер (иначе `req` становится невалидным) — `getHeaders` и `getIP` этому условию удовлетворяют.

#### 4. Важный инвариант uWS: заголовки до первого await

`req` в uWS живёт только до первой точки асинхронности. Значит, все синхронные извлечения из `req` (ip, parameters, query, cookies, content-type) должны произойти до `await checkRateLimit`. Поэтому правильный порядок:

```ts
// === синхронный блок, req ещё валиден ===
const ip = getIP(req, res);
const rawHeaders = getHeaders(req);
const contentType = rawHeaders.get('content-type');
const cookies = parseCookies(req.getHeader('cookie'));
const query = new URLSearchParams(req.getQuery());
const params = route.parametersKey?.length ? extractParameters(route.parametersKey, req) : {};

// === теперь можно await ===
if (!(await checkRateLimit(..., route, ...))) {
  res.cork(() => sendResponse(res, responseData));
  return;
}

// === чтение тела — только если не зарейтлимичено ===
const { payload, files } = await readAndParseBody(res, contentType, rawHeaders, ..., abortSignal);
```

По сути, `getHttpData` стоит разбить на две фазы: `collectRequestMetadata(req, res)` (синхронно, без тела) и `readAndParseBody(res, ...)` (асинхронно). Между ними — rate-limit, CORS-preflight shortcuts, фильтры по размеру и типу.

#### 5. Обработка abort во время body-read не должна ронять счётчик

Сейчас счётчик `updateRateLimitCounter` инкрементируется **до** чтения тела — это по-прежнему останется так после рефакторинга, и это корректно: сам факт попытки запроса учитывается, даже если клиент отвалится. Но важно не вычесть обратно при abort — иначе атакующий сможет обнулять счётчик, закрывая соединение на флае.

#### 6. Многоуровневый rate-limit

Рекомендуется добавить два уровня:

- **L1 — глобальный per-IP**, дешёвый, без route-гранулярности, применяется до всего остального: например, 600 req/min/IP. Защищает от ковровой бомбардировки по разным URL.
- **L2 — per-IP + per-route**, как сейчас. Применяется после L1.

Оба уровня должны срабатывать **до** `getHttpData`.

#### 7. Защита на уровне соединения (ещё ниже)

Rate-limit в приложении не спасает от одновременного открытия 10000 TCP-соединений с медленным чтением (slowloris). Отдельно стоит:

- ограничить число одновременных соединений с одного IP на уровне reverse-proxy (nginx `limit_conn`);
- проставить разумный `idleTimeout` на HTTP-сервере uWS (сейчас 120 с только на WS) — для HTTP uWS по умолчанию 10 с, но стоит перепроверить и явно выставить через `us_listen_config_t` или reverse-proxy;
- ограничить размер заголовков (uWS имеет встроенный лимит ~16 KB, но стоит задокументировать).

#### 8. Что делать с rate-limit на WebSocket upgrade

Тот же вектор актуален для WS (`server.ts:137`): `handleUpgrade` читает тело при апгрейде (cookies, токен). Вызов rate-limit по IP **до** `handleUpgrade` закроет DoS через массовые попытки апгрейда.

#### 9. Fail-open vs fail-closed на сбоях Redis

Сейчас `http-rate-limit.ts:104-108` при ошибке Redis пропускает запрос (`return true`). Это fail-open — удобно, но при атаке на Redis (или его деградации) rate-limit отключается. Варианты:

- оставить fail-open, но алертить в мониторинге на рост ошибок rate-limit;
- сделать fail-closed для чувствительных маршрутов (авторизация, регистрация) — при ошибке считать лимит превышённым.

Выбор зависит от SLA; минимум — явное решение, задокументированное в коде.

#### 10. Чеклист для PR

- [ ] `setHttpHandler` разбит на `collectMetadata` → `rateLimit` → `readBody` → `handler`.
- [ ] Все обращения к `req.*` собраны до первого `await`.
- [ ] `checkRateLimit` принимает только то, что реально использует (ip + route).
- [ ] Счётчик инкрементируется один раз за попытку (не откатывается при abort).
- [ ] Rate-limit применён и к WS `upgrade`.
- [ ] Добавлен глобальный per-IP L1-лимит.
- [ ] Принято решение о fail-open / fail-closed, зафиксировано в конфиге.
- [ ] Тест: превышение лимита даёт 429 **без** чтения тела (проверить отсутствие `onData`-коллов).

---

## Высоко

### H-1. Утечка деталей исключения в не-prod окружениях
**Где:** `server.ts:326-334`.

```ts
const errorMessage =
  configApp.env === "prod" || configApp.env === "production"
    ? "Internal server error"
    : String(error);
```

`String(error)` при `Error` вернёт `"Error: ..."`, но если это кастомный объект или строка — может утечь путь файла, SQL-запрос, токен из сообщения. Окружения `staging`, `dev`, `test` будут отдавать raw-сообщения клиенту. В зависимости от инфраструктуры staging часто доступен снаружи.

**Рекомендация:** по умолчанию отдавать «Internal server error», а детали писать только в логи. Раскрывать наружу — только в `env === 'local'`.

### H-2. WebSocket-токен передаётся в path URL
**Где:** `server.ts:121` — `\`/${pathPrefix}/websocket/:token\``.

Токены в URL попадают в:
- access-логи reverse-proxy (nginx, CDN),
- логи приложения,
- referer-заголовки,
- историю браузера, DevTools, session replay.

**Рекомендация:** передавать токен через Cookie или через первое сообщение по WS (challenge-response). В `upgrade` хендлере валидировать по cookie.

### H-3. Статический хэндлер отрабатывает на любой GET вне API
**Где:** `server.ts:481-487`.

```ts
} else if (appConfig.serveStatic && method === "get") {
  staticHandler(res, req);
}
```

Безопасность полностью делегирована реализации `staticHandler`. Если в ней нет защиты от `..`/`%2e%2e`/символьных ссылок — это LFI. Вдобавок любой файл, случайно попавший в dist (`.env.backup`, `.map` с секретами, backup-файлы), будет доступен.

**Рекомендация:** провести аудит `staticHandler` — нормализация пути, запрет символов `..`, `\0`, чёткий whitelist расширений, фикс базовой директории.

### H-4. Cookie по умолчанию `sameSite: 'None'`
**Где:** `src/config/cookies.ts:8`.

`SameSite=None` открывает cookies для кросс-сайтовых запросов → CSRF, если нет anti-CSRF токенов. При `secure: env['APP_ENV'] !== 'local'` cookie отправится и по HTTPS с любого сайта.

**Рекомендация:** по умолчанию `SameSite=Lax` (либо `Strict`). Переопределять на `None` только там, где это реально нужно (iframe-интеграции), и одновременно требовать CSRF-токен.

---

## Средне

### M-1. `readJson` пропускает `null` и массивы
**Где:** `http-request-handlers.ts:132-142`.

```ts
const result = JSON.parse(body) as Record<string, unknown>;
if (typeof result === 'object') return result;
```

`typeof null === 'object'` → `null` пройдёт. Массив тоже `object`. Хендлеры, ожидающие объект, получат `null`/`[]` → возможно обход валидации, если схема ArkType допускает частичную форму.

**Рекомендация:** `result !== null && !Array.isArray(result) && typeof result === 'object'`.

### M-2. Валидация срабатывает только для JSON
**Где:** `server.ts:236` — `if (isPayload && route.validator !== undefined)`.

Для `multipart/form-data`, `urlencoded`, `text/plain`, `octet-stream` валидатор **не вызывается**. Если маршрут ожидал JSON, но клиент прислал `multipart`, контроллер получит «сырые» `result.payload` без проверки.

**Рекомендация:** валидировать все формы, где есть payload. Либо жёстко отвергать запросы с неожиданным `content-type` для конкретного маршрута (whitelist типов на route-level).

### M-3. `content-type` полностью доверяется клиенту
**Где:** `server.ts:215-233`.

Клиент сам выбирает лимит (JSON 1 MB vs octet 100 MB) через заголовок. Присылая запрос с `Content-Type: application/octet-stream`, атакующий получает 100 MB-лимит на любом POST-маршруте, даже если тот ожидает JSON.

**Рекомендация:** жёстко связывать `content-type` с маршрутом (в описании route указывать допустимые типы) и применять лимит по маршруту, а не по клиентскому заголовку.

### M-4. `Content-Length` парсится через `Number(...)`
**Где:** `server.ts:229-232`.

```ts
const declared = Number(headers.get('content-length') ?? '');
if (Number.isFinite(declared) && declared > limit) ...
```

- `Content-Length: -1` → `-1 > limit` = false, пройдёт.
- `Content-Length: 1.5` → `Number.isFinite(1.5)` = true, пройдёт.
- Отсутствие заголовка (chunked) → проверка пропускается, лимит контролируется только потоково в `readData` (это ок, но стоит залогировать).

Потоковой лимит в `readData:106` спасает, но pre-check можно обойти.

**Рекомендация:** `Number.isInteger(declared) && declared >= 0` перед сравнением с лимитом.

### M-5. Отсутствие security-заголовков на JSON-ответах
**Где:** `server.ts:273-288` — `sendResponse` ставит только `content-type`.

Нет `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Strict-Transport-Security`. CSP упомянута в комментарии как «applied from staticServer for HTML responses» — API-ответы без неё.

**Рекомендация:** добавить базовый набор security-headers глобально для всех ответов.

---

## Низко

### L-1. DELETE-метод не обрабатывается через штатный флоу
**Где:** `server.ts:447` — `if (route.method !== "ws" && route.method !== "delete")`.

Все `delete`-маршруты тихо не регистрируются. Это не уязвимость сама по себе, но приводит к тому, что объявленный в роутинге DELETE-эндпоинт уходит в «any /*» → 404. Если разработчик думает, что маршрут защищён middleware, а его вообще нет — это поверхность для путаницы.

**Рекомендация:** либо обрабатывать DELETE, либо логировать ворнинг при регистрации.

### L-2. Утечка структуры API через `/api/doc/routes`
**Где:** `server.ts:456-459`.

Если `DOC_PAGE=true` и `SERVE_STATIC=true` в проде — весь список маршрутов (включая внутренние) доступен без аутентификации. Полезно для разведки атакующему.

**Рекомендация:** защитить эндпоинт auth-middleware или отключать полностью в prod.

### L-3. Логирование "route.validator Get Http Data" на info-уровне
**Где:** `server.ts:237`.

Шумный лог без контекста. В высоконагруженном проде раздувает объём логов и затрудняет поиск реальных событий.

**Рекомендация:** удалить или перевести в debug.

### L-4. Channel-injection в `broadcastMessage` маловероятен, но стоит зафиксировать
**Где:** `server.ts:91-97`.

`\`user:${String(userId)}\`` — тип `userId: number`, но TypeScript не гарантирует это в рантайме, если вызывающий код передаст строку из непроверенного источника. На данный момент все вызовы явно типизированы, но если когда-нибудь `userId` придёт как string → атакующий сможет публиковать в произвольные каналы.

**Рекомендация:** `Number.isInteger(userId)` на входе (runtime-guard).

---

## Позитивные моменты

- Потоковая проверка лимита тела в `readData:106` — правильная защита от «тело больше заявленного».
- `RequestAbortSignal` с единым слотом `onAborted` — корректно решает особенность uWS.
- `PayloadTooLargeError` отдаёт `413` с контекстом — не утекая стек.
- BigInt-сериализация через replacer в `broadcastMessage` — предотвращает крэш на `JSON.stringify`.
- Валидаторы `validateHeader` / `validateCookie` / `validateParameter` вызываются на входе — хорошая практика.
- Отделение HTML-статики (CSP) от API — правильная декомпозиция.

---

## Приоритеты

1. **Срочно:** C-1 (CORS), C-2 (rate-limit до парсинга тела).
2. **В ближайший спринт:** H-1 (утечка ошибок), H-2 (WS-токен), H-4 (SameSite), H-3 (аудит staticHandler).
3. **Плановое улучшение:** M-1..M-5, L-1..L-4.
