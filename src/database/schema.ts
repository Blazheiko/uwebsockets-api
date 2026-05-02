import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    boolean,
    timestamp,
    text,
    pgEnum,
    integer,
    index,
    unique,
    real,
    numeric,
    jsonb,
    customType,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'partner']);
export const promoCodeBenefitEnum = pgEnum('promo_code_benefit', [
    'PREMIUM_DAYS',
    'BETA_ACCESS',
    'FREE_TRIAL',
    'PARTNER_DISCOUNT',
]);
export const messageTypeEnum = pgEnum('message_type', ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'VIDEO_CALL']);
export const pushNotificationStatusEnum = pgEnum('push_notification_status', ['SENT', 'FAILED', 'PENDING']);
export const translatorSideEnum = pgEnum('translator_side', ['owner', 'opponent']);
export const translatorInputTypeEnum = pgEnum('translator_input_type', ['voice', 'text']);
export const translatorRealtimeRoleEnum = pgEnum('translator_realtime_role', ['user', 'assistant']);
export const translatorRealtimeModalityEnum = pgEnum('translator_realtime_modality', ['audio', 'text']);
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);
export const llmPromptTypeEnum = pgEnum('llm_prompt_type', [
    'TEACHER_SYSTEM',
    'TEACHER_APP_CAPABILITIES',
    'TEACHER_VOCABULARY_SYSTEM',
    'TEACHER_LESSON',
    'TEACHER_SYNTAX_LESSON',
    'TRANSLATOR_SYSTEM',
    'TRANSLATOR_SUMMARY',
    'TRANSLATOR_REALTIME_SYSTEM',
    'TRANSLATOR_REALTIME_CAPTURE',
    'IMAGE_STYLE',
    'TEACHER_FIRST_CHAT',
    'SUPPORT_SYSTEM',
    'SUPPORT_FIRST_CHAT',
    'SUPPORT_QUERY_TRANSLATION',
]);
export const llmTextFeatureEnum = pgEnum('llm_text_feature', [
    'TRANSLATOR_TRANSLATE',
    'TRANSLATOR_SUMMARY',
    'TEACHER_CHAT',
    'TEACHER_LESSON',
    'TEACHER_SYNTAX_LESSON',
    'TEACHER_FACTS',
    'TEACHER_VOCABULARY',
    'PROMPT_TEST',
    'SUPPORT_CHAT',
]);
export const llmImageFeatureEnum = pgEnum('llm_image_feature', [
    'AVATAR_GENERATE',
    'CHAT_IMAGE_EDIT',
]);
export const inworldTtsFeatureEnum = pgEnum('inworld_tts_feature', ['TEACHER_CHAT', 'TEACHER_VOCABULARY', 'TEACHER_SYNTAX', 'TRANSLATOR_TRANSLATE']);
export const grokTtsFeatureEnum = pgEnum('grok_tts_feature', ['TEACHER_CHAT', 'TEACHER_VOCABULARY', 'TEACHER_SYNTAX', 'TRANSLATOR_TRANSLATE']);
export const llmAudioFeatureEnum = pgEnum('llm_audio_feature', ['TEACHER_STT', 'TRANSLATOR_STT']);
export const teacherPhraseAudioScopeEnum = pgEnum('teacher_phrase_audio_scope', [
    'syntax_example',
    'syntax_exercise',
    'vocabulary_word',
    'vocabulary_example',
]);
export const userAppTypeEnum = pgEnum('user_app_type', ['web', 'pwa']);
export const pronunciationStatusEnum = pgEnum('pronunciation_status_enum', ['pending', 'passed', 'skipped']);
export const pronunciationSkipReasonEnum = pgEnum('pronunciation_skip_reason_enum', ['attempt_limit', 'technical_unavailable']);

const vector1536 = customType<{ data: string | null; driverData: string | null }>({
    dataType() {
        return 'vector(1536)';
    },
});

// Users Table
export const users = pgTable('users', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerifiedAt: timestamp('email_verified_at'),
    password: varchar('password', { length: 255 }),
    phone: varchar('phone', { length: 20 }).unique(),
    avatar: varchar('avatar', { length: 500 }),
    isAdmin: boolean('is_admin').notNull().default(false),
    role: userRoleEnum('role').notNull().default('user'),
    sessionToken: varchar('session_token', { length: 24 }).notNull().unique().$defaultFn(() => nanoid()),
    referralCode: varchar('referral_code', { length: 16 }).unique(),
    promoCodeId: bigint('promo_code_id', { mode: 'bigint' }).references(() => promoCodes.id, {
        onDelete: 'restrict',
    }),
    premiumUntil: timestamp('premium_until'),
    betaAccess: boolean('beta_access').notNull().default(false),
    discountPercent: integer('discount_percent').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => [
    index('users_promo_code_id_idx').on(table.promoCodeId),
]);

export const userOnline = pgTable('user_online', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 255 }),
    socketUuid: varchar('socket_uuid', { length: 64 }).notNull().unique(),
    role: userRoleEnum('role'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    typeApp: userAppTypeEnum('type_app'),
    connectedAt: timestamp('connected_at').notNull(),
    disconnectedAt: timestamp('disconnected_at'),
    connectionDurationMs: bigint('connection_duration_ms', { mode: 'number' }),
    closeCode: integer('close_code'),
    isFirstConnection: boolean('is_first_connection').notNull().default(false),
    isLastConnection: boolean('is_last_connection'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => [
    index('user_online_user_id_idx').on(table.userId),
    index('user_online_user_id_connected_at_idx').on(table.userId, table.connectedAt),
    index('user_online_connected_at_idx').on(table.connectedAt),
    index('user_online_disconnected_at_idx').on(table.disconnectedAt),
]);

// Contact List Table
export const contactList = pgTable(
    'contact_list',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        contactId: bigint('contact_id', { mode: 'bigint' }).notNull(),
        status: varchar('status', { length: 50 }).notNull().default('pending'),
        unreadCount: integer('unread_count').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        lastMessageAt: timestamp('last_message_at').notNull().defaultNow(),
        rename: varchar('rename', { length: 100 }),
        lastMessageId: bigint('last_message_id', { mode: 'bigint' }),
    },
    (table) => [
        index('contact_list_contact_id_fkey').on(table.contactId),
        index('contact_list_last_message_id_fkey').on(table.lastMessageId),
        unique('contact_list_user_id_contact_id_key').on(
            table.userId,
            table.contactId,
        ),
    ],
);

export const videoCalls = pgTable(
    'video_calls',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        callerId: bigint('caller_id', { mode: 'bigint' }).notNull(),
        calleeId: bigint('callee_id', { mode: 'bigint' }).notNull(),
        startedAt: timestamp('started_at').notNull(),
        endedAt: timestamp('ended_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('video_calls_caller_id_fkey').on(table.callerId),
        index('video_calls_callee_id_fkey').on(table.calleeId),
    ],
);

// Messages Table
export const messages = pgTable(
    'messages',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        senderId: bigint('sender_id', { mode: 'bigint' }).notNull(),
        receiverId: bigint('receiver_id', { mode: 'bigint' }).notNull(),
        type: messageTypeEnum('type').notNull().default('TEXT'),
        content: text('content').notNull(),
        src: varchar('src', { length: 500 }),
        thumbnail: varchar('thumbnail', { length: 500 }),
        isRead: boolean('is_read').notNull().default(false),
        calendarId: bigint('calendar_id', { mode: 'bigint' }),
        videoCallId: bigint('video_call_id', { mode: 'bigint' }).references(() => videoCalls.id, {
            onDelete: 'set null',
        }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('messages_calendar_id_fkey').on(table.calendarId),
        index('messages_receiver_id_fkey').on(table.receiverId),
        index('messages_sender_id_fkey').on(table.senderId),
        index('messages_video_call_id_fkey').on(table.videoCallId),
        unique('messages_video_call_id_unique').on(table.videoCallId),
    ],
);

// Invitations Table
export const invitations = pgTable(
    'invitations',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        token: varchar('token', { length: 255 }).notNull().unique(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        invitedId: bigint('invited_id', { mode: 'bigint' }),
        isUsed: boolean('is_used').notNull().default(false),
        expiresAt: timestamp('expires_at').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        name: varchar('name', { length: 100 }).notNull(),
    },
    (table) => [
        index('invitations_invited_id_fkey').on(table.invitedId),
        index('invitations_user_id_fkey').on(table.userId),
    ],
);

// Notes Table
export const notes = pgTable(
    'notes',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description').notNull(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('notes_user_id_fkey').on(table.userId),
    ],
);

// Notes Photos Table
export const notesPhotos = pgTable(
    'notes_photos',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        noteId: bigint('note_id', { mode: 'bigint' }).notNull(),
        src: varchar('src', { length: 500 }).notNull(),
        filename: varchar('filename', { length: 255 }),
        size: integer('size'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('notes_photos_note_id_fkey').on(table.noteId),
    ],
);

// Calendar Table
export const calendar = pgTable(
    'calendar',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description').notNull(),
        startTime: timestamp('start_time').notNull(),
        endTime: timestamp('end_time').notNull(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('calendar_user_id_fkey').on(table.userId),
    ],
);

// Push Subscriptions Table
export const pushSubscriptions = pgTable(
    'push_subscriptions',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        endpoint: varchar('endpoint', { length: 500 }).notNull().unique(),
        p256dhKey: text('p256dh_key').notNull(),
        authKey: text('auth_key').notNull(),
        userAgent: text('user_agent'),
        ipAddress: varchar('ip_address', { length: 45 }),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        lastUsedAt: timestamp('last_used_at'),
        deviceType: varchar('device_type', { length: 50 }),
        browserName: varchar('browser_name', { length: 100 }),
        browserVersion: varchar('browser_version', { length: 50 }),
        osName: varchar('os_name', { length: 100 }),
        osVersion: varchar('os_version', { length: 50 }),
        notificationTypes: jsonb('notification_types'),
        timezone: varchar('timezone', { length: 50 }),
    },
    (table) => [
        index('push_subscriptions_user_id_fkey').on(table.userId),
    ],
);

// Push Notification Logs Table
export const pushNotificationLogs = pgTable(
    'push_notifications_log',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }),
        subscriptionId: bigint('subscription_id', { mode: 'bigint' }),
        messageTitle: varchar('message_title', { length: 255 }),
        messageBody: text('message_body'),
        messageData: jsonb('message_data'),
        sentAt: timestamp('sent_at').notNull().defaultNow(),
        status: pushNotificationStatusEnum('status'),
        errorMessage: text('error_message'),
        responseData: jsonb('response_data'),
    },
    (table) => [
        index('push_notifications_log_user_id_fkey').on(table.userId),
        index('push_notifications_log_subscription_id_fkey').on(
            table.subscriptionId,
        ),
    ],
);

export const emailVerifications = pgTable(
    'email_verifications',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        tokenHash: varchar('token_hash', { length: 64 }).notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        usedAt: timestamp('used_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        unique('email_verifications_token_hash_key').on(table.tokenHash),
        index('email_verifications_user_id_idx').on(table.userId),
    ],
);

export const passwordResetTokens = pgTable(
    'password_reset_tokens',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        tokenHash: varchar('token_hash', { length: 64 }).notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        usedAt: timestamp('used_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        unique('password_reset_tokens_token_hash_key').on(table.tokenHash),
        index('password_reset_tokens_user_id_idx').on(table.userId),
    ],
);

// OAuth Accounts Table
export const oauthAccounts = pgTable(
    'oauth_accounts',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: varchar('provider', { length: 50 }).notNull(),
        providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
        providerEmail: varchar('provider_email', { length: 255 }),
        providerName: varchar('provider_name', { length: 255 }),
        providerAvatar: varchar('provider_avatar', { length: 500 }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        unique('oauth_accounts_provider_provider_user_id_key').on(
            table.provider,
            table.providerUserId,
        ),
        index('oauth_accounts_user_id_fkey').on(table.userId),
    ],
);

// Translator Sessions Table
export const translatorSessions = pgTable(
    'translator_sessions',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        langOwner: varchar('lang_owner', { length: 10 }).notNull().default('ru'),
        langOpponent: varchar('lang_opponent', { length: 10 }).notNull().default('en'),
        isActive: boolean('is_active').notNull().default(true),
        titleOwner: varchar('title_owner', { length: 255 }),
        descriptionOwner: text('description_owner'),
        titleOpponent: varchar('title_opponent', { length: 255 }),
        descriptionOpponent: text('description_opponent'),
        teacherVocabularyCollectionId: bigint('teacher_vocabulary_collection_id', { mode: 'bigint' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('translator_sessions_user_id_fkey').on(table.userId),
    ],
);

// Translator Messages Table
export const translatorMessages = pgTable(
    'translator_messages',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        sessionId: bigint('session_id', { mode: 'bigint' }).notNull(),
        side: translatorSideEnum('side').notNull(),
        sourceText: text('source_text').notNull(),
        translatedText: text('translated_text'),
        sourceLang: varchar('source_lang', { length: 10 }).notNull(),
        targetLang: varchar('target_lang', { length: 10 }).notNull(),
        inputType: translatorInputTypeEnum('input_type').notNull().default('voice'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('translator_messages_session_id_fkey').on(table.sessionId),
    ],
);

export const translatorRealtimeMessages = pgTable(
    'translator_realtime_messages',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        sessionId: bigint('session_id', { mode: 'bigint' }).notNull(),
        providerItemId: varchar('provider_item_id', { length: 191 }).notNull(),
        role: translatorRealtimeRoleEnum('role').notNull(),
        side: translatorSideEnum('side'),
        modality: translatorRealtimeModalityEnum('modality').notNull().default('audio'),
        sourceText: text('source_text'),
        outputText: text('output_text'),
        sourceLang: varchar('source_lang', { length: 10 }),
        targetLang: varchar('target_lang', { length: 10 }),
        replyToProviderItemId: varchar('reply_to_provider_item_id', { length: 191 }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('translator_realtime_messages_session_id_fkey').on(table.sessionId),
        unique('translator_realtime_messages_provider_item_id_key').on(table.providerItemId),
    ],
);

// Teacher Student Profiles Table
export const teacherStudentProfiles = pgTable(
    'teacher_student_profiles',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        langNative: varchar('lang_native', { length: 10 }).notNull().default('ru'),
        level: varchar('level', { length: 10 }).notNull().default('a1'),
        totalLessons: integer('total_lessons').notNull().default(0),
        totalWords: integer('total_words').notNull().default(0),
        interests: jsonb('interests').$type<string[]>(),
        summary: text('summary'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('teacher_student_profiles_user_id_fkey').on(table.userId),
        unique('teacher_student_profiles_user_id_lang_learning_key').on(table.userId, table.langLearning),
    ],
);

// Teacher Student Facts Table
export const teacherStudentFacts = pgTable(
    'teacher_student_facts',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        fact: text('fact').notNull(),
        sourceSessionId: bigint('source_session_id', { mode: 'bigint' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_student_facts_user_id_fkey').on(table.userId),
        index('teacher_student_facts_source_session_id_fkey').on(table.sourceSessionId),
    ],
);

// Teacher Lessons Table
export const teacherLessons = pgTable(
    'teacher_lessons',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        sessionId: bigint('session_id', { mode: 'bigint' }),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        content: text('content').notNull(),
        vocabulary: jsonb('vocabulary').$type<{ word: string; translation: string; example: string }[]>(),
        grammarNotes: text('grammar_notes'),
        homework: text('homework'),
        isReviewed: boolean('is_reviewed').notNull().default(false),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_lessons_user_id_fkey').on(table.userId),
        index('teacher_lessons_session_id_fkey').on(table.sessionId),
    ],
);

// Teacher Chat History Table
export const teacherChatHistory = pgTable(
    'teacher_chat_history',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        role: chatRoleEnum('role').notNull(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_chat_history_user_id_fkey').on(table.userId),
    ],
);

export const teacherVocabularyCollections = pgTable(
    'teacher_vocabulary_collections',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        langNative: varchar('lang_native', { length: 10 }).notNull().default('ru'),
        topicSlug: varchar('topic_slug', { length: 100 }).notNull(),
        topicTitle: varchar('topic_title', { length: 150 }).notNull(),
        purposeDescription: text('purpose_description').notNull(),
        purposeSlug: varchar('purpose_slug', { length: 160 }).notNull(),
        levelCode: varchar('level_code', { length: 20 }),
        status: varchar('status', { length: 20 }).notNull().default('ready'),
        embedding: vector1536('embedding'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        index('teacher_vocabulary_collections_user_id_fkey').on(table.userId),
    ],
);

export const teacherVocabularyBatches = pgTable(
    'teacher_vocabulary_batches',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        collectionId: bigint('collection_id', { mode: 'bigint' })
            .notNull()
            .references(() => teacherVocabularyCollections.id, { onDelete: 'cascade' }),
        status: varchar('status', { length: 20 }).notNull().default('queued'),
        requestedCount: integer('requested_count').notNull().default(20),
        generatedCount: integer('generated_count').notNull().default(0),
        promptVersion: varchar('prompt_version', { length: 50 }),
        llmModel: varchar('llm_model', { length: 100 }),
        errorMessage: text('error_message'),
        startedAt: timestamp('started_at'),
        completedAt: timestamp('completed_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_vocabulary_batches_collection_id_fkey').on(table.collectionId),
        index('teacher_vocabulary_batches_status_idx').on(table.status),
    ],
);

export const teacherVocabularyWords = pgTable(
    'teacher_vocabulary_words',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        collectionId: bigint('collection_id', { mode: 'bigint' })
            .notNull()
            .references(() => teacherVocabularyCollections.id, { onDelete: 'cascade' }),
        batchId: bigint('batch_id', { mode: 'bigint' }).references(() => teacherVocabularyBatches.id, { onDelete: 'set null' }),
        word: varchar('word', { length: 200 }).notNull(),
        normalizedWord: varchar('normalized_word', { length: 200 }).notNull(),
        translation: varchar('translation', { length: 200 }).notNull(),
        transcription: varchar('transcription', { length: 200 }),
        partOfSpeech: varchar('part_of_speech', { length: 30 }),
        sortOrder: integer('sort_order').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_vocabulary_words_collection_id_fkey').on(table.collectionId),
        index('teacher_vocabulary_words_batch_id_fkey').on(table.batchId),
        unique('teacher_vocabulary_words_collection_normalized_key').on(table.collectionId, table.normalizedWord),
    ],
);

export const teacherVocabularyExamples = pgTable(
    'teacher_vocabulary_examples',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        wordId: bigint('word_id', { mode: 'bigint' })
            .notNull()
            .references(() => teacherVocabularyWords.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order').notNull().default(0),
        sentence: text('sentence').notNull(),
        translation: text('translation').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_vocabulary_examples_word_id_fkey').on(table.wordId),
    ],
);

export const teacherVocabularyProgress = pgTable(
    'teacher_vocabulary_progress',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        wordId: bigint('word_id', { mode: 'bigint' })
            .notNull()
            .references(() => teacherVocabularyWords.id, { onDelete: 'cascade' }),
        attemptsCount: integer('attempts_count').notNull().default(0),
        correctCount: integer('correct_count').notNull().default(0),
        mistakesCount: integer('mistakes_count').notNull().default(0),
        pronunciationScore: numeric('pronunciation_score', { precision: 5, scale: 2 }).notNull().default('0'),
        recognitionScore: numeric('recognition_score', { precision: 5, scale: 2 }).notNull().default('0'),
        masteryStatus: varchar('mastery_status', { length: 20 }).notNull().default('new'),
        nextReviewAt: timestamp('next_review_at'),
        lastPracticedAt: timestamp('last_practiced_at'),
        lastCorrectAt: timestamp('last_correct_at'),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.wordId] }),
        index('teacher_vocabulary_progress_mastery_status_idx').on(table.userId, table.masteryStatus),
        index('teacher_vocabulary_progress_user_status_practiced_idx').on(table.userId, table.masteryStatus, table.lastPracticedAt),
    ],
);

export const teacherVocabularyUserCollections = pgTable(
    'teacher_vocabulary_user_collections',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        collectionId: bigint('collection_id', { mode: 'bigint' }).notNull().references(() => teacherVocabularyCollections.id, { onDelete: 'cascade' }),
        addedAt: timestamp('added_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.collectionId] }),
        index('teacher_vocabulary_user_collections_user_id_idx').on(table.userId),
        index('teacher_vocabulary_user_collections_collection_id_idx').on(table.collectionId),
    ],
);

// TODO(shared-study-audio): remove after shared study audio rollout cleanup.
export const teacherVocabularyWordAudio = pgTable(
    'teacher_vocabulary_word_audio',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        wordId: bigint('word_id', { mode: 'bigint' }).notNull().references(() => teacherVocabularyWords.id, { onDelete: 'cascade' }),
        voice: varchar('voice', { length: 100 }).notNull(),
        voiceSrc: varchar('voice_src', { length: 500 }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.wordId] }),
        index('teacher_vocabulary_word_audio_word_id_idx').on(table.wordId),
    ],
);

// TODO(shared-study-audio): remove after shared study audio rollout cleanup.
export const teacherVocabularyExampleAudio = pgTable(
    'teacher_vocabulary_example_audio',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        exampleId: bigint('example_id', { mode: 'bigint' }).notNull().references(() => teacherVocabularyExamples.id, { onDelete: 'cascade' }),
        voice: varchar('voice', { length: 100 }).notNull(),
        voiceSrc: varchar('voice_src', { length: 500 }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.exampleId] }),
        index('teacher_vocabulary_example_audio_example_id_idx').on(table.exampleId),
    ],
);

export const teacherPhraseAudio = pgTable(
    'teacher_phrase_audio',
    {
        scope: teacherPhraseAudioScopeEnum('scope').notNull(),
        scopeId: bigint('scope_id', { mode: 'bigint' }).notNull(),
        voice: varchar('voice', { length: 100 }).notNull(),
        language: varchar('language', { length: 20 }).notNull(),
        contentHash: varchar('content_hash', { length: 40 }).notNull(),
        voiceSrc: varchar('voice_src', { length: 500 }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        unique('teacher_phrase_audio_scope_scope_id_voice_language_hash_idx').on(
            table.scope,
            table.scopeId,
            table.voice,
            table.language,
            table.contentHash,
        ),
        index('teacher_phrase_audio_scope_scope_id_idx').on(table.scope, table.scopeId),
        index('teacher_phrase_audio_voice_src_idx').on(table.voiceSrc),
    ],
);

// Teacher Syntax Lessons Tables
export const teacherSyntaxLessons = pgTable(
    'teacher_syntax_lessons',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id),
        langLearning: varchar('lang_learning', { length: 10 }).notNull(),
        langNative: varchar('lang_native', { length: 10 }).notNull(),
        sourceTopic: varchar('source_topic', { length: 200 }).notNull(),
        topicSlug: varchar('topic_slug', { length: 120 }).notNull(),
        topicTitle: varchar('topic_title', { length: 200 }).notNull(),
        ruleSummary: text('rule_summary').notNull(),
        levelCode: varchar('level_code', { length: 20 }),
        studyTopic: varchar('study_topic', { length: 200 }),
        learningGoal: text('learning_goal'),
        status: varchar('status', { length: 20 }).notNull().default('generating'),
        errorMessage: text('error_message'),
        embedding: vector1536('embedding'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        index('teacher_syntax_lessons_topic_slug_idx').on(table.topicSlug),
        index('teacher_syntax_lessons_reuse_filter_idx').on(table.langLearning, table.langNative, table.levelCode),
    ],
);

export const teacherSyntaxSections = pgTable(
    'teacher_syntax_sections',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order').notNull().default(0),
        heading: varchar('heading', { length: 200 }).notNull(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_syntax_sections_lesson_id_fkey').on(table.lessonId),
    ],
);

export const teacherSyntaxExamples = pgTable(
    'teacher_syntax_examples',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order').notNull().default(0),
        sentence: text('sentence').notNull(),
        translation: text('translation').notNull(),
        highlight: varchar('highlight', { length: 200 }),
        note: text('note'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_syntax_examples_lesson_id_fkey').on(table.lessonId),
    ],
);

export const teacherSyntaxExercises = pgTable(
    'teacher_syntax_exercises',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order').notNull().default(0),
        type: varchar('type', { length: 30 }).notNull(),
        instruction: text('instruction').notNull(),
        promptText: text('prompt_text').notNull(),
        correctAnswer: text('correct_answer').notNull(),
        repeatPhrase: text('repeat_phrase').notNull(),
        repeatTranslation: text('repeat_translation'),
        repeatHint: text('repeat_hint'),
        explanation: text('explanation'),
        meta: jsonb('meta'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('teacher_syntax_exercises_lesson_id_fkey').on(table.lessonId),
    ],
);

export const teacherSyntaxExerciseOptions = pgTable(
    'teacher_syntax_exercise_options',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        exerciseId: bigint('exercise_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxExercises.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order').notNull().default(0),
        text: varchar('text', { length: 300 }).notNull(),
        isCorrect: boolean('is_correct').notNull().default(false),
    },
    (table) => [
        index('teacher_syntax_exercise_options_exercise_id_fkey').on(table.exerciseId),
    ],
);

export const teacherSyntaxExampleAudio = pgTable(
    'teacher_syntax_example_audio',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        exampleId: bigint('example_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxExamples.id, { onDelete: 'cascade' }),
        voice: varchar('voice', { length: 100 }).notNull(),
        voiceSrc: varchar('voice_src', { length: 500 }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.exampleId] }),
        index('teacher_syntax_example_audio_example_id_idx').on(table.exampleId),
    ],
);

export const teacherSyntaxUserLessons = pgTable(
    'teacher_syntax_user_lessons',
    {
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        totalExercises: integer('total_exercises').notNull().default(0),
        completedExercises: integer('completed_exercises').notNull().default(0),
        pronouncedExercises: integer('pronounced_exercises').notNull().default(0),
        correctCount: integer('correct_count').notNull().default(0),
        mistakesCount: integer('mistakes_count').notNull().default(0),
        masteryStatus: varchar('mastery_status', { length: 20 }).notNull().default('new'),
        lastPracticedAt: timestamp('last_practiced_at'),
        addedAt: timestamp('added_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.lessonId] }),
        index('teacher_syntax_user_lessons_user_id_idx').on(table.userId),
        index('teacher_syntax_user_lessons_lesson_id_idx').on(table.lessonId),
        index('teacher_syntax_user_lessons_mastery_status_idx').on(table.userId, table.masteryStatus),
    ],
);

export const teacherSyntaxAttempts = pgTable(
    'teacher_syntax_attempts',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id),
        startedAt: timestamp('started_at').notNull().defaultNow(),
        completedAt: timestamp('completed_at'),
        totalExercises: integer('total_exercises').notNull().default(0),
        correctCount: integer('correct_count').notNull().default(0),
        mistakesCount: integer('mistakes_count').notNull().default(0),
        resultStatus: varchar('result_status', { length: 20 }).notNull().default('in_progress'),
    },
    (table) => [
        index('teacher_syntax_attempts_lesson_id_fkey').on(table.lessonId),
        index('teacher_syntax_attempts_user_id_fkey').on(table.userId),
    ],
);

export const teacherSyntaxExerciseAttempts = pgTable(
    'teacher_syntax_exercise_attempts',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        attemptId: bigint('attempt_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxAttempts.id, { onDelete: 'cascade' }),
        lessonId: bigint('lesson_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxLessons.id, { onDelete: 'cascade' }),
        exerciseId: bigint('exercise_id', { mode: 'bigint' }).notNull().references(() => teacherSyntaxExercises.id, { onDelete: 'cascade' }),
        userAnswer: text('user_answer').notNull(),
        isCorrect: boolean('is_correct').notNull(),
        feedback: text('feedback'),
        recognizedText: text('recognized_text'),
        pronunciationScore: numeric('pronunciation_score', { precision: 5, scale: 2 }),
        pronunciationStatus: pronunciationStatusEnum('pronunciation_status').notNull().default('pending'),
        skipReason: pronunciationSkipReasonEnum('skip_reason'),
        skipReportedBy: varchar('skip_reported_by', { length: 20 }),
        pronunciationAttemptsCount: integer('pronunciation_attempts_count').notNull().default(0),
        pronunciationPassedAt: timestamp('pronunciation_passed_at'),
        completedAt: timestamp('completed_at'),
        answeredAt: timestamp('answered_at').notNull().defaultNow(),
    },
    (table) => [
        unique('teacher_syntax_exercise_attempts_attempt_id_exercise_id_uidx').on(
            table.attemptId,
            table.exerciseId,
        ),
        index('teacher_syntax_exercise_attempts_attempt_id_fkey').on(table.attemptId),
        index('teacher_syntax_exercise_attempts_lesson_id_fkey').on(table.lessonId),
        index('teacher_syntax_exercise_attempts_exercise_id_fkey').on(table.exerciseId),
    ],
);

// LLM System Prompts Table
export const llmSystemPrompts = pgTable('llm_system_prompts', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    type: llmPromptTypeEnum('type').notNull().unique(),
    topic: varchar('topic', { length: 100 }),
    content: text('content').notNull(),
    model: varchar('model', { length: 100 }),
    temperature: real('temperature'),
    maxTokens: integer('max_tokens'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

// LLM Text Usage Table
export const llmTextUsage = pgTable(
    'llm_text_usage',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        llmSystemPromptId: bigint('llm_system_prompt_id', { mode: 'bigint' }),
        model: varchar('model', { length: 100 }).notNull(),
        feature: llmTextFeatureEnum('feature').notNull(),
        finalPrompt: text('final_prompt').notNull().default(''),
        promptTokens: integer('prompt_tokens').notNull().default(0),
        completionTokens: integer('completion_tokens').notNull().default(0),
        totalTokens: integer('total_tokens').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('llm_text_usage_user_id_fkey').on(table.userId),
        index('llm_text_usage_created_at_idx').on(table.createdAt),
    ],
);

// LLM Image Usage Table
export const llmImageUsage = pgTable(
    'llm_image_usage',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        llmSystemPromptId: bigint('llm_system_prompt_id', { mode: 'bigint' }),
        model: varchar('model', { length: 100 }).notNull(),
        feature: llmImageFeatureEnum('feature').notNull(),
        imageCount: integer('image_count').notNull().default(1),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('llm_image_usage_user_id_fkey').on(table.userId),
        index('llm_image_usage_created_at_idx').on(table.createdAt),
    ],
);

// Inworld TTS Usage Table
export const inworldTtsUsage = pgTable(
    'inworld_tts_usage',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        model: varchar('model', { length: 100 }).notNull(),
        voice: varchar('voice', { length: 100 }).notNull(),
        feature: inworldTtsFeatureEnum('feature').notNull(),
        characterCount: integer('character_count').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('inworld_tts_usage_user_id_idx').on(table.userId),
        index('inworld_tts_usage_created_at_idx').on(table.createdAt),
    ],
);

// Grok TTS Usage Table
export const grokTtsUsage = pgTable(
    'grok_tts_usage',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        voice: varchar('voice', { length: 100 }).notNull(),
        language: varchar('language', { length: 20 }).notNull().default(''),
        feature: grokTtsFeatureEnum('feature').notNull(),
        characterCount: integer('character_count').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('grok_tts_usage_user_id_idx').on(table.userId),
        index('grok_tts_usage_created_at_idx').on(table.createdAt),
    ],
);

// LLM Audio Usage Table
export const llmAudioUsage = pgTable(
    'llm_audio_usage',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        model: varchar('model', { length: 100 }).notNull(),
        feature: llmAudioFeatureEnum('feature').notNull(),
        audioBytes: integer('audio_bytes').notNull().default(0),
        textLength: integer('text_length').notNull().default(0),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('llm_audio_usage_user_id_idx').on(table.userId),
        index('llm_audio_usage_created_at_idx').on(table.createdAt),
    ],
);

// Teacher Settings Table
export const teacherSettings = pgTable('teacher_settings', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' }).notNull(),
    langNative:    varchar('lang_native',    { length: 10  }).notNull().default('ru'),
    langLearning:  varchar('lang_learning',  { length: 10  }).notNull().default('en'),
    topic:         varchar('topic',          { length: 50  }).notNull().default('everyday'),
    teacherVoice:       varchar('teacher_voice',        { length: 100 }).notNull().default('Ashley'),
    teacherVoiceGender: varchar('teacher_voice_gender', { length: 10  }).notNull().default('female'),
    teacherName:        varchar('teacher_name',          { length: 100 }).notNull().default(''),
    ownVoice:           varchar('own_voice',             { length: 100 }).notNull().default('Ashley'),
    ownVoiceGender:     varchar('own_voice_gender',      { length: 10  }).notNull().default('female'),
    proficiencyLevel:   varchar('proficiency_level',     { length: 20  }).notNull().default('beginner'),
    learningGoal:       varchar('learning_goal',         { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    unique('teacher_settings_user_id_key').on(table.userId),
    index('teacher_settings_user_id_fkey').on(table.userId),
]);

// Support Knowledge Base Table
export const supportKnowledgeBase = pgTable(
    'support_knowledge_base',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        title: varchar('title', { length: 255 }).notNull(),
        content: text('content').notNull(),
        category: varchar('category', { length: 100 }),
        screenshotKey: varchar('screenshot_key', { length: 500 }),
        screenshotMime: varchar('screenshot_mime', { length: 50 }),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('support_kb_category_idx').on(table.category),
    ],
);

// Support Chat History Table
export const supportChatHistory = pgTable(
    'support_chat_history',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        role: chatRoleEnum('role').notNull(),
        content: text('content').notNull(),
        screenshots: jsonb('screenshots'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('support_chat_history_user_idx').on(table.userId),
    ],
);

// Promo Codes Table
export const promoCodes = pgTable(
    'promo_codes',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        code: varchar('code', { length: 50 }).notNull().unique(),
        benefitType: promoCodeBenefitEnum('benefit_type').notNull(),
        benefitValue: integer('benefit_value').notNull().default(0),
        discountPercent: integer('discount_percent').notNull().default(0),
        maxUses: integer('max_uses').notNull().default(1),
        currentUses: integer('current_uses').notNull().default(0),
        isActive: boolean('is_active').notNull().default(true),
        expiresAt: timestamp('expires_at'),
        partnerId: bigint('partner_id', { mode: 'bigint' }),
        createdBy: bigint('created_by', { mode: 'bigint' }).notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
    },
    (table) => [
        index('promo_codes_code_idx').on(table.code),
        index('promo_codes_created_by_fkey').on(table.createdBy),
        index('promo_codes_partner_id_fkey').on(table.partnerId),
    ],
);

// Referral Usages Table
export const referralUsages = pgTable(
    'referral_usages',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        referrerId: bigint('referrer_id', { mode: 'bigint' }).notNull(),
        refereeId: bigint('referee_id', { mode: 'bigint' }).notNull().unique(),
        rewardGrantedAt: timestamp('reward_granted_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('referral_usages_referrer_id_fkey').on(table.referrerId),
    ],
);

// Referral Link Clicks Table
export const referralLinkClicks = pgTable(
    'referral_link_clicks',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        referrerId: bigint('referrer_id', { mode: 'bigint' }).notNull(),
        fingerprint: varchar('fingerprint', { length: 64 }),
        convertedAt: timestamp('converted_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('referral_link_clicks_referrer_id_fkey').on(table.referrerId),
        index('referral_link_clicks_created_at_idx').on(table.createdAt),
    ],
);

// Relations
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
    user: one(users, {
        fields: [oauthAccounts.userId],
        references: [users.id],
    }),
}));

export const emailVerificationsRelations = relations(emailVerifications, ({ one }) => ({
    user: one(users, {
        fields: [emailVerifications.userId],
        references: [users.id],
    }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
    oauthAccounts: many(oauthAccounts),
    emailVerifications: many(emailVerifications),
    passwordResetTokens: many(passwordResetTokens),
    promoCode: one(promoCodes, {
        fields: [users.promoCodeId],
        references: [promoCodes.id],
    }),
    onlineSessions: many(userOnline),
    calendarEvents: many(calendar),
    contactOf: many(contactList, { relationName: 'ContactOfUser' }),
    contacts: many(contactList, { relationName: 'UserContacts' }),
    receivedInvitations: many(invitations, {
        relationName: 'ReceivedInvitations',
    }),
    createdInvitations: many(invitations, {
        relationName: 'CreatedInvitations',
    }),
    receivedMessages: many(messages, { relationName: 'ReceivedMessages' }),
    sentMessages: many(messages, { relationName: 'SentMessages' }),
    notes: many(notes),
    pushSubscriptions: many(pushSubscriptions),
    pushNotificationLogs: many(pushNotificationLogs),
    translatorSessions: many(translatorSessions),
    teacherStudentProfiles: many(teacherStudentProfiles),
    teacherStudentFacts: many(teacherStudentFacts),
    teacherLessons: many(teacherLessons),
    teacherChatHistory: many(teacherChatHistory),
    teacherVocabularyCollections: many(teacherVocabularyCollections),
    teacherVocabularyUserCollections: many(teacherVocabularyUserCollections),
    teacherVocabularyWordAudio: many(teacherVocabularyWordAudio),
    teacherVocabularyExampleAudio: many(teacherVocabularyExampleAudio),
    teacherVocabularyProgress: many(teacherVocabularyProgress),
    teacherSyntaxLessons: many(teacherSyntaxLessons),
    teacherSyntaxUserLessons: many(teacherSyntaxUserLessons),
}));

export const userOnlineRelations = relations(userOnline, ({ one }) => ({
    user: one(users, {
        fields: [userOnline.userId],
        references: [users.id],
    }),
}));

export const contactListRelations = relations(contactList, ({ one }) => ({
    user: one(users, {
        fields: [contactList.userId],
        references: [users.id],
        relationName: 'UserContacts',
    }),
    contact: one(users, {
        fields: [contactList.contactId],
        references: [users.id],
        relationName: 'ContactOfUser',
    }),
    lastMessage: one(messages, {
        fields: [contactList.lastMessageId],
        references: [messages.id],
    }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
    sender: one(users, {
        fields: [messages.senderId],
        references: [users.id],
        relationName: 'SentMessages',
    }),
    receiver: one(users, {
        fields: [messages.receiverId],
        references: [users.id],
        relationName: 'ReceivedMessages',
    }),
    calendar: one(calendar, {
        fields: [messages.calendarId],
        references: [calendar.id],
    }),
    contactList: many(contactList),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
    user: one(users, {
        fields: [invitations.userId],
        references: [users.id],
        relationName: 'CreatedInvitations',
    }),
    invited: one(users, {
        fields: [invitations.invitedId],
        references: [users.id],
        relationName: 'ReceivedInvitations',
    }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
    user: one(users, {
        fields: [notes.userId],
        references: [users.id],
    }),
    photos: many(notesPhotos),
}));

export const notesPhotosRelations = relations(notesPhotos, ({ one }) => ({
    note: one(notes, {
        fields: [notesPhotos.noteId],
        references: [notes.id],
    }),
}));

export const calendarRelations = relations(calendar, ({ one, many }) => ({
    user: one(users, {
        fields: [calendar.userId],
        references: [users.id],
    }),
    messages: many(messages),
}));

export const pushSubscriptionsRelations = relations(
    pushSubscriptions,
    ({ one, many }) => ({
        user: one(users, {
            fields: [pushSubscriptions.userId],
            references: [users.id],
        }),
        notificationLogs: many(pushNotificationLogs),
    }),
);

export const pushNotificationLogsRelations = relations(
    pushNotificationLogs,
    ({ one }) => ({
        user: one(users, {
            fields: [pushNotificationLogs.userId],
            references: [users.id],
        }),
        subscription: one(pushSubscriptions, {
            fields: [pushNotificationLogs.subscriptionId],
            references: [pushSubscriptions.id],
        }),
    }),
);

export const translatorSessionsRelations = relations(
    translatorSessions,
    ({ one, many }) => ({
        user: one(users, {
            fields: [translatorSessions.userId],
            references: [users.id],
        }),
        messages: many(translatorMessages),
        realtimeMessages: many(translatorRealtimeMessages),
    }),
);

export const translatorMessagesRelations = relations(
    translatorMessages,
    ({ one }) => ({
        session: one(translatorSessions, {
            fields: [translatorMessages.sessionId],
            references: [translatorSessions.id],
        }),
    }),
);

export const translatorRealtimeMessagesRelations = relations(
    translatorRealtimeMessages,
    ({ one }) => ({
        session: one(translatorSessions, {
            fields: [translatorRealtimeMessages.sessionId],
            references: [translatorSessions.id],
        }),
    }),
);

export const teacherStudentProfilesRelations = relations(
    teacherStudentProfiles,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherStudentProfiles.userId],
            references: [users.id],
        }),
    }),
);

export const teacherStudentFactsRelations = relations(
    teacherStudentFacts,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherStudentFacts.userId],
            references: [users.id],
        }),
    }),
);

export const teacherLessonsRelations = relations(
    teacherLessons,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherLessons.userId],
            references: [users.id],
        }),
    }),
);

export const teacherChatHistoryRelations = relations(
    teacherChatHistory,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherChatHistory.userId],
            references: [users.id],
        }),
    }),
);

export const teacherVocabularyCollectionsRelations = relations(
    teacherVocabularyCollections,
    ({ one, many }) => ({
        user: one(users, {
            fields: [teacherVocabularyCollections.userId],
            references: [users.id],
        }),
        batches: many(teacherVocabularyBatches),
        words: many(teacherVocabularyWords),
        userCollections: many(teacherVocabularyUserCollections),
    }),
);

export const teacherVocabularyBatchesRelations = relations(
    teacherVocabularyBatches,
    ({ one, many }) => ({
        collection: one(teacherVocabularyCollections, {
            fields: [teacherVocabularyBatches.collectionId],
            references: [teacherVocabularyCollections.id],
        }),
        words: many(teacherVocabularyWords),
    }),
);

export const teacherVocabularyWordsRelations = relations(
    teacherVocabularyWords,
    ({ one, many }) => ({
        collection: one(teacherVocabularyCollections, {
            fields: [teacherVocabularyWords.collectionId],
            references: [teacherVocabularyCollections.id],
        }),
        batch: one(teacherVocabularyBatches, {
            fields: [teacherVocabularyWords.batchId],
            references: [teacherVocabularyBatches.id],
        }),
        examples: many(teacherVocabularyExamples),
        progress: many(teacherVocabularyProgress),
        audio: many(teacherVocabularyWordAudio),
    }),
);

export const teacherVocabularyExamplesRelations = relations(
    teacherVocabularyExamples,
    ({ one, many }) => ({
        word: one(teacherVocabularyWords, {
            fields: [teacherVocabularyExamples.wordId],
            references: [teacherVocabularyWords.id],
        }),
        audio: many(teacherVocabularyExampleAudio),
    }),
);

export const teacherVocabularyProgressRelations = relations(
    teacherVocabularyProgress,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherVocabularyProgress.userId],
            references: [users.id],
        }),
        word: one(teacherVocabularyWords, {
            fields: [teacherVocabularyProgress.wordId],
            references: [teacherVocabularyWords.id],
        }),
    }),
);

export const teacherVocabularyUserCollectionsRelations = relations(
    teacherVocabularyUserCollections,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherVocabularyUserCollections.userId],
            references: [users.id],
        }),
        collection: one(teacherVocabularyCollections, {
            fields: [teacherVocabularyUserCollections.collectionId],
            references: [teacherVocabularyCollections.id],
        }),
    }),
);

export const teacherVocabularyWordAudioRelations = relations(
    teacherVocabularyWordAudio,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherVocabularyWordAudio.userId],
            references: [users.id],
        }),
        word: one(teacherVocabularyWords, {
            fields: [teacherVocabularyWordAudio.wordId],
            references: [teacherVocabularyWords.id],
        }),
    }),
);

export const teacherVocabularyExampleAudioRelations = relations(
    teacherVocabularyExampleAudio,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherVocabularyExampleAudio.userId],
            references: [users.id],
        }),
        example: one(teacherVocabularyExamples, {
            fields: [teacherVocabularyExampleAudio.exampleId],
            references: [teacherVocabularyExamples.id],
        }),
    }),
);

export const teacherSyntaxLessonsRelations = relations(
    teacherSyntaxLessons,
    ({ one, many }) => ({
        author: one(users, {
            fields: [teacherSyntaxLessons.userId],
            references: [users.id],
        }),
        sections: many(teacherSyntaxSections),
        examples: many(teacherSyntaxExamples),
        exercises: many(teacherSyntaxExercises),
        attempts: many(teacherSyntaxAttempts),
        userLessons: many(teacherSyntaxUserLessons),
    }),
);

export const teacherSyntaxSectionsRelations = relations(
    teacherSyntaxSections,
    ({ one }) => ({
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxSections.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
    }),
);

export const teacherSyntaxExamplesRelations = relations(
    teacherSyntaxExamples,
    ({ one, many }) => ({
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxExamples.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
        audio: many(teacherSyntaxExampleAudio),
    }),
);

export const teacherSyntaxExercisesRelations = relations(
    teacherSyntaxExercises,
    ({ one, many }) => ({
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxExercises.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
        options: many(teacherSyntaxExerciseOptions),
    }),
);

export const teacherSyntaxExerciseOptionsRelations = relations(
    teacherSyntaxExerciseOptions,
    ({ one }) => ({
        exercise: one(teacherSyntaxExercises, {
            fields: [teacherSyntaxExerciseOptions.exerciseId],
            references: [teacherSyntaxExercises.id],
        }),
    }),
);

export const teacherSyntaxExampleAudioRelations = relations(
    teacherSyntaxExampleAudio,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherSyntaxExampleAudio.userId],
            references: [users.id],
        }),
        example: one(teacherSyntaxExamples, {
            fields: [teacherSyntaxExampleAudio.exampleId],
            references: [teacherSyntaxExamples.id],
        }),
    }),
);

export const teacherSyntaxUserLessonsRelations = relations(
    teacherSyntaxUserLessons,
    ({ one }) => ({
        user: one(users, {
            fields: [teacherSyntaxUserLessons.userId],
            references: [users.id],
        }),
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxUserLessons.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
    }),
);

export const teacherSyntaxAttemptsRelations = relations(
    teacherSyntaxAttempts,
    ({ one, many }) => ({
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxAttempts.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
        user: one(users, {
            fields: [teacherSyntaxAttempts.userId],
            references: [users.id],
        }),
        exerciseAttempts: many(teacherSyntaxExerciseAttempts),
    }),
);

export const teacherSyntaxExerciseAttemptsRelations = relations(
    teacherSyntaxExerciseAttempts,
    ({ one }) => ({
        attempt: one(teacherSyntaxAttempts, {
            fields: [teacherSyntaxExerciseAttempts.attemptId],
            references: [teacherSyntaxAttempts.id],
        }),
        lesson: one(teacherSyntaxLessons, {
            fields: [teacherSyntaxExerciseAttempts.lessonId],
            references: [teacherSyntaxLessons.id],
        }),
        exercise: one(teacherSyntaxExercises, {
            fields: [teacherSyntaxExerciseAttempts.exerciseId],
            references: [teacherSyntaxExercises.id],
        }),
    }),
);

export const llmTextUsageRelations = relations(llmTextUsage, ({ one }) => ({
    user: one(users, {
        fields: [llmTextUsage.userId],
        references: [users.id],
    }),
}));

export const llmImageUsageRelations = relations(llmImageUsage, ({ one }) => ({
    user: one(users, {
        fields: [llmImageUsage.userId],
        references: [users.id],
    }),
}));

export const llmAudioUsageRelations = relations(llmAudioUsage, ({ one }) => ({
    user: one(users, {
        fields: [llmAudioUsage.userId],
        references: [users.id],
    }),
}));
