# Teacher Chat Vocabulary Flow

## Что описывает документ

Этот документ описывает, как работает создание `vocabulary` по запросу пользователя именно в чате учителя (`AI Teacher chat`): от сообщения пользователя до появления готовой коллекции в разделе Vocabulary.

Основной сценарий построен вокруг двух фаз:

1. Учитель в чате предлагает создать vocabulary и показывает inline-карточку с кнопками `Create vocabulary` / `Cancel`.
2. После подтверждения запускается асинхронная генерация, коллекция сохраняется в БД, а фронтенд получает статусные события через websocket.

Дополнительно в системе есть прямой websocket-метод `teacher/teacher_generate_vocabulary`, но для чата учителя основной путь именно proposal -> confirm -> async generation.

## Основные участники

- Frontend store: `packages/frontend/src/stores/teacher.ts`
- UI чата: `packages/frontend/src/views/teacher/TeacherChat.vue`
- Подписка на websocket-события: `packages/frontend/src/views/TeacherView.vue`
- Нормализация websocket payload: `packages/frontend/src/composables/useBroadcastHandler.ts`
- WS controller: `packages/backend/src/app/controllers/ws/teacher-controller.ts`
- Основная бизнес-логика: `packages/backend/src/app/services/teacher-service.ts`
- Tool/action для предложения vocabulary: `packages/backend/src/app/services/actions/vocabulary-action.ts`
- Временное хранилище proposal/intents: `packages/backend/src/app/services/actions/pending-proposals.ts`
- Генерация LLM-ответов и vocabulary batch: `packages/backend/src/app/services/teacher-llm-service.ts`
- Репозиторий словаря: `packages/backend/src/app/repositories/teacher-vocabulary-repository.ts`
- Схема БД: `packages/backend/src/database/schema.ts`

## Высокоуровневый сценарий

### 1. Пользователь просит создать vocabulary в teacher chat

Сообщение уходит по websocket-роуту `teacher/teacher_chat`, после чего `teacherService.chat(...)`:

- сохраняет пользовательское сообщение в `teacher_chat_history`
- загружает teacher settings, profile, facts, recent chat history и recent lessons
- пытается детерминированно распознать запрос на словарь до обращения к LLM

Для этого используются две локальные эвристики:

- `looksLikeVocabularyRequest(message)` определяет, что пользователь просит словарь
- `inferVocabularyIntentFromHistory(...)` пытается вывести `topic`, `description` и иногда `levelCode`

Если intent удалось вывести сразу, backend не ждёт обычного текстового ответа модели, а сразу отправляет proposal card.

### 2. Если intent не распознан локально, решение может принять LLM

Если детерминированный путь не сработал, `teacherLlmService.chatStream(...)` строит system prompt для teacher chat и подключает action tools через `actionRegistry`.

В prompt явно зашиты правила:

- если пользователь хочет vocabulary и тема уже понятна, модель обязана вызвать tool `propose_vocabulary`
- нельзя просить дополнительное текстовое подтверждение до вызова tool
- после успешного вызова tool нужно сообщить, что в чате появилась карточка `Create/Cancel`

Сам tool зарегистрирован один раз при загрузке `teacher-service`:

- `actionRegistry.register(vocabularyAction)`

### 3. Создание proposal card

`vocabularyAction.execute(...)`:

- валидирует параметры `topic`, `description`, `levelCode?`
- сохраняет краткоживущий draft intent по `userIdStr`
- создаёт proposal с `proposalId`
- отправляет websocket-событие `teacher_vocabulary_proposal`

Proposal и draft intent хранятся в памяти процесса в `pending-proposals.ts`:

- TTL: 5 минут
- storage: `Map`
- очистка по `setInterval`

Это не постоянное хранилище. После рестарта backend такие proposal/intents теряются.

### 4. Отрисовка proposal card на фронтенде

На фронтенде поток такой:

- `useBroadcastHandler.ts` преобразует websocket event `teacher_vocabulary_proposal`
- `TeacherView.vue` подписывается на событие и вызывает `store.onVocabularyProposal(...)`
- `teacher.ts` сохраняет `vocabularyChatAction`
- `TeacherChat.vue` показывает inline-card внутри ленты сообщений

Состояния карточки:

- `pending`: видны кнопки `Create vocabulary` и `Cancel`
- `creating`: показывается индикатор прогресса

Карточка рендерится не как обычное сообщение, а как отдельный UI-блок внизу списка chat messages.

### 5. Подтверждение пользователем

При нажатии `Create vocabulary` фронтенд вызывает websocket-роут:

- `teacher/teacher_confirm_vocabulary`

Payload:

```ts
{
  proposalId: string
}
```

Дальше `ws teacher-controller`:

- читает proposal через `peekProposal`
- проверяет, что proposal не истёк и принадлежит текущему пользователю
- только после проверки удаляет proposal через `deleteProposal`
- вызывает `teacherService.generateVocabulary(...)`

Если пользователь нажимает `Cancel`, вызывается:

- `teacher/teacher_cancel_vocabulary`

Там proposal удаляется, а draft intent очищается через `clearVocabularyIntent(...)`.

## Детали `generateVocabulary`

`teacherService.generateVocabulary(...)` делает следующее.

### Валидация входных данных

- берёт `teacher settings`
- выбирает `teacherVoice`
- определяет `resolvedTopic`
- определяет `resolvedLangNative`
- валидирует длину `description`

Ограничение на `description`:

- минимум 10 символов
- максимум 240 символов

### Нормализация topic и purpose

Используются две разные сущности:

- `topicSlug` через `slugifyTopic(resolvedTopic)`
- `purposeDescription` + `purposeSlug` через `normalizeVocabularyPurpose(description)`

`purposeSlug` строится из нормализованного текста и SHA1-хеша. Это нужно, чтобы различать несколько коллекций на одну тему, но с разным назначением.

Пример:

- topic: `Hotel check-in`
- purpose: `Vocabulary and phrases for hotel check-in, staying at a hotel, and speaking with reception staff`

### Поиск или создание collection

`teacherVocabularyRepository.findOrCreateCollection(...)` ищет коллекцию по уникальному ключу:

- `userId`
- `langLearning`
- `topicSlug`
- `purposeSlug`

Если коллекция уже существует, используется она. Иначе создаётся новая запись в `teacher_vocabulary_collections`.

### Защита от дублей и параллельного запуска

После получения collection backend:

- проверяет, нет ли активного batch со статусом `queued` или `generating`
- если есть, повторно использует его `batchId`
- проверяет последний batch и запрещает новый запуск, если прошло меньше 60 секунд

Это защищает от повторных кликов и частых повторных запросов.

### Создание batch и немедленное уведомление UI

После этого:

- создаётся запись в `teacher_vocabulary_batches`
- статус collection меняется на `generating`
- пользователю отправляется websocket-событие `teacher_vocabulary_batch_queued`

Фронтенд переводит карточку из `pending` в `creating`.

## Асинхронная генерация batch

Дальше основная работа идёт в `void (async () => { ... })()` в фоне, без блокировки websocket-ответа.

### 1. Подготовка данных для LLM

Backend:

- помечает batch как `generating`
- получает все уже известные пользователю слова через `findAllNormalizedUserWords(...)`
- вызывает `teacherLlmService.generateVocabularyBatch(...)`

В генерацию передаются:

- `topic`
- `purposeDescription`
- `langLearning`
- `langNative`
- `levelCode`
- список уже известных слов
- learner settings context

### 2. Что ожидается от LLM

LLM должна вернуть JSON с массивом `items`. Для каждого элемента ожидаются:

- `word`
- `translation`
- `transcription`
- `partOfSpeech`
- `examples[]`

Каждый example содержит:

- `sentence`
- `translation`

Парсинг сделан с fallback-логикой:

- сначала пробуется обычный JSON parse
- если модель вернула "грязный" JSON, используется частичный разбор массива `items`

### 3. Дедупликация

После генерации backend:

- нормализует каждое слово через `normalizeVocabularyWord(...)`
- отбрасывает пустые значения
- исключает слова, которые уже были у пользователя
- исключает дубли внутри текущего batch

Если после дедупликации не осталось ни одного нового слова:

- batch получает статус `error`
- collection получает статус `error`
- фронтенду отправляется `teacher_vocabulary_error`

### 4. Сохранение слов и примеров

Если слова есть:

- `upsertWords(...)` добавляет новые слова в `teacher_vocabulary_words`
- для новых слов `replaceExamples(...)` сохраняет примеры в `teacher_vocabulary_examples`
- для каждого слова создаётся progress через `ensureProgress(...)`

Важно: примеры заменяются только для новых слов. Если слово уже существовало в текущей collection, его примеры заново не пересохраняются.

### 5. Финальный статус batch

Логика завершения сейчас такая:

- если уникальных слов меньше 20 -> статус `partial`
- если 20 и больше -> статус `ready`

Для `partial`:

- batch -> `partial`
- collection -> `partial`
- websocket -> `teacher_vocabulary_partial`

Для `ready`:

- batch -> `ready`
- collection -> `ready`
- websocket -> `teacher_vocabulary_ready`

В обоих случаях:

- очищается draft intent через `clearVocabularyIntent(...)`
- в teacher chat сохраняется итоговое assistant-сообщение с перечислением слов
- при включённом TTS это сообщение ещё и озвучивается

## Какие события видит фронтенд

Основные websocket-события сценария:

- `teacher_vocabulary_proposal`
- `teacher_vocabulary_batch_queued`
- `teacher_vocabulary_ready`
- `teacher_vocabulary_partial`
- `teacher_vocabulary_error`

Реакция store:

- `onVocabularyProposal(...)` создаёт `vocabularyChatAction`
- `onVocabularyQueued(...)` включает `isGeneratingVocabulary`
- `onVocabularyReady(...)` очищает action, подгружает список коллекций и открывает текущую collection
- `onVocabularyPartial(...)` делает то же самое, но показывает сообщение о частичном результате
- `onVocabularyError(...)` очищает action и показывает ошибку

Дополнительно store сам добавляет assistant messages в чат, чтобы пользователь видел понятный итоговый текст, даже если системное websocket-событие было техническим.

## Как данные потом читаются

После завершения генерации UI читает vocabulary уже через HTTP.

Используются методы:

- `GET /api/teacher/vocabulary?langLearning=...`
- `GET /api/teacher/vocabulary/:collectionId`

`getVocabularyCollections(...)` возвращает:

- коллекции
- latest batch
- `wordsCount`
- `masteredCount`

`getVocabularyCollectionWords(...)` возвращает:

- collection
- latest batch
- words
- examples для каждого word
- progress для каждого word

## Структура хранения в БД

Основные таблицы:

- `teacher_vocabulary_collections`
- `teacher_vocabulary_batches`
- `teacher_vocabulary_words`
- `teacher_vocabulary_examples`
- `teacher_vocabulary_progress`

Роли таблиц:

- `collections` хранит тему, purpose, язык и общий статус набора
- `batches` хранит отдельные запуски генерации и их исход
- `words` хранит слова коллекции
- `examples` хранит примеры использования слова
- `progress` хранит статистику тренировки слова

Ключевые статусы collection/batch:

- `queued`
- `generating`
- `ready`
- `partial`
- `error`

## Важные особенности реализации

### 1. Proposal хранится в памяти, а не в БД

Это быстрый механизм, но есть ограничения:

- рестарт backend сбрасывает все активные proposal
- при нескольких инстансах сервиса без общего storage proposal могут быть несогласованы

### 2. Есть два пути запуска vocabulary

- основной chat-driven: `propose_vocabulary` -> confirm
- прямой websocket API: `teacher/teacher_generate_vocabulary`

В чате учителя используется именно первый путь.

### 3. Есть детерминированный fallback без LLM tool call

Если сообщение явно похоже на просьбу создать словарь, backend может сам отправить proposal card, не дожидаясь tool call от модели.

### 4. Есть защита от повторного запуска

- повторно используется активный batch
- новый batch нельзя стартовать чаще, чем раз в 60 секунд для одной collection

### 5. Итоговое сообщение дублируется как chat content

После успешной или частично успешной генерации backend не только шлёт техническое событие `ready/partial`, но и добавляет в teacher chat обычное assistant-сообщение со списком слов.

## Краткий sequence flow

```text
User -> teacher chat message
  -> WS teacher/teacher_chat
  -> teacherService.chat()
  -> detect vocabulary intent locally OR via LLM tool propose_vocabulary
  -> websocket event teacher_vocabulary_proposal
  -> frontend shows Create/Cancel card

User clicks Create
  -> WS teacher/teacher_confirm_vocabulary
  -> validate proposal ownership
  -> teacherService.generateVocabulary()
  -> create/reuse collection
  -> create batch
  -> websocket event teacher_vocabulary_batch_queued
  -> async LLM generation
  -> save words/examples/progress
  -> websocket event ready/partial/error
  -> frontend refreshes vocabulary data via HTTP
```

## Что стоит иметь в виду при доработках

- Если нужна надёжность между несколькими инстансами backend, proposal/intents лучше переносить из in-memory `Map` в Redis или БД.
- Если нужно обновлять примеры для уже существующих слов, текущий `upsertWords + replaceExamples only for isNew` этого не делает.
- Сейчас порог `ready` жёстко равен 20 уникальным словам, потому что `requestedCount` создаётся со значением `20` и логика частичного результата завязана на это число.
