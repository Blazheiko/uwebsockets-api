import {
    mysqlTable,
    bigint,
    varchar,
    boolean,
    datetime,
    text,
    mysqlEnum,
    int,
    smallint,
    index,
    unique,
    float,
    json,
    date,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Enums - In MySQL, enums are defined inline in the column definition
// The first parameter is just a reference name for TypeScript, not a database type name

// Users Table
export const users = mysqlTable('users', {
    id: bigint('id', { mode: 'bigint', unsigned: true })
        .primaryKey()
        .autoincrement(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }).unique(),
    isAdmin: boolean('isAdmin').notNull().default(false),
    createdAt: datetime('created_at').notNull().default(new Date()),
    updatedAt: datetime('updated_at')
        .notNull()
        .default(new Date())
        .$onUpdate(() => new Date()),
});

// Contact List Table
export const contactList = mysqlTable(
    'contact_list',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        contactId: bigint('contact_id', {
            mode: 'bigint',
            unsigned: true,
        }).notNull(),
        status: varchar('status', { length: 50 }).notNull().default('pending'),
        unreadCount: int('unread_count').notNull().default(0),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
        lastMessageAt: datetime('last_message_at').notNull().default(new Date()),
        rename: varchar('rename', { length: 100 }),
        lastMessageId: bigint('last_message_id', {
            mode: 'bigint',
            unsigned: true,
        }),
    },
    (table) => ({
        contactIdIdx: index('contact_list_contact_id_fkey').on(table.contactId),
        lastMessageIdIdx: index('contact_list_last_message_id_fkey').on(
            table.lastMessageId,
        ),
        userContactUnique: unique('contact_list_user_id_contact_id_key').on(
            table.userId,
            table.contactId,
        ),
    }),
);

// Messages Table
export const messages = mysqlTable(
    'messages',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        senderId: bigint('sender_id', {
            mode: 'bigint',
            unsigned: true,
        }).notNull(),
        receiverId: bigint('receiver_id', {
            mode: 'bigint',
            unsigned: true,
        }).notNull(),
        type: mysqlEnum('type', ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO'])
            .notNull()
            .default('TEXT'),
        content: text('content').notNull(),
        src: varchar('src', { length: 500 }),
        isRead: boolean('is_read').notNull().default(false),
        calendarId: bigint('calendar_id', { mode: 'bigint', unsigned: true }),
        taskId: bigint('task_id', { mode: 'bigint', unsigned: true }),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        calendarIdIdx: index('messages_calendar_id_fkey').on(table.calendarId),
        receiverIdIdx: index('messages_receiver_id_fkey').on(table.receiverId),
        senderIdIdx: index('messages_sender_id_fkey').on(table.senderId),
        taskIdIdx: index('messages_task_id_fkey').on(table.taskId),
    }),
);

// Invitations Table
export const invitations = mysqlTable(
    'invitations',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        token: varchar('token', { length: 255 }).notNull().unique(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        invitedId: bigint('invited_id', { mode: 'bigint', unsigned: true }),
        isUsed: boolean('is_used').notNull().default(false),
        expiresAt: datetime('expires_at').notNull(),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
        name: varchar('name', { length: 100 }).notNull(),
    },
    (table) => ({
        invitedIdIdx: index('invitations_invited_id_fkey').on(table.invitedId),
        userIdIdx: index('invitations_user_id_fkey').on(table.userId),
    }),
);

// Notes Table
export const notes = mysqlTable(
    'notes',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description').notNull(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        userIdIdx: index('notes_user_id_fkey').on(table.userId),
    }),
);

// Notes Photos Table
export const notesPhotos = mysqlTable(
    'notes_photos',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        noteId: bigint('note_id', { mode: 'bigint', unsigned: true }).notNull(),
        src: varchar('src', { length: 500 }).notNull(),
        filename: varchar('filename', { length: 255 }),
        size: int('size'),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        noteIdIdx: index('notes_photos_note_id_fkey').on(table.noteId),
    }),
);

// Calendar Table
export const calendar = mysqlTable(
    'calendar',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description').notNull(),
        startTime: datetime('start_time').notNull(),
        endTime: datetime('end_time').notNull(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        userIdIdx: index('calendar_user_id_fkey').on(table.userId),
    }),
);

// Tasks Table
export const tasks = mysqlTable(
    'tasks',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description'),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        projectId: bigint('project_id', { mode: 'bigint', unsigned: true }),
        status: mysqlEnum('status', [
            'TODO',
            'IN_PROGRESS',
            'ON_HOLD',
            'COMPLETED',
            'CANCELLED',
        ])
            .notNull()
            .default('TODO'),
        priority: mysqlEnum('priority', ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
            .notNull()
            .default('MEDIUM'),
        progress: int('progress').notNull().default(0),
        isCompleted: boolean('is_completed').notNull().default(false),
        tags: varchar('tags', { length: 500 }),
        dueDate: datetime('due_date'),
        startDate: datetime('start_date'),
        estimatedHours: float('estimated_hours'),
        actualHours: float('actual_hours'),
        parentTaskId: bigint('parent_task_id', {
            mode: 'bigint',
            unsigned: true,
        }),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        parentTaskIdIdx: index('tasks_parent_task_id_fkey').on(
            table.parentTaskId,
        ),
        projectIdIdx: index('tasks_project_id_fkey').on(table.projectId),
        userIdIdx: index('tasks_user_id_fkey').on(table.userId),
    }),
);

// Projects Table
export const projects = mysqlTable(
    'projects',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        title: varchar('title', { length: 255 }).notNull(),
        description: text('description'),
        color: varchar('color', { length: 50 }),
        isActive: boolean('is_active').notNull().default(true),
        startDate: datetime('start_date'),
        endDate: datetime('end_date'),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
        dueDate: date('due_date'),
        priority: mysqlEnum('priority', ['low', 'medium', 'high'])
            .notNull()
            .default('medium'),
        progress: smallint('progress').notNull().default(0),
        status: mysqlEnum('status', [
            'planning',
            'in_progress',
            'on_hold',
            'completed',
            'archived',
        ])
            .notNull()
            .default('planning'),
    },
    (table) => ({
        userIdIdx: index('projects_user_id_fkey').on(table.userId),
    }),
);

// Project Tags Table
export const projectTags = mysqlTable(
    'project_tags',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        projectId: bigint('project_id', {
            mode: 'bigint',
            unsigned: true,
        }).notNull(),
        tag: varchar('tag', { length: 100 }).notNull(),
        createdAt: datetime('created_at').notNull().default(new Date()),
    },
    (table) => ({
        projectTagUnique: unique('project_tags_project_id_tag_key').on(
            table.projectId,
            table.tag,
        ),
    }),
);

// Project Assignees Table
export const projectAssignees = mysqlTable(
    'project_assignees',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        projectId: bigint('project_id', {
            mode: 'bigint',
            unsigned: true,
        }).notNull(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        label: varchar('label', { length: 255 }),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
    },
    (table) => ({
        userIdIdx: index('project_assignees_user_id_fkey').on(table.userId),
        projectUserUnique: unique(
            'project_assignees_project_id_user_id_key',
        ).on(table.projectId, table.userId),
    }),
);

// Push Subscriptions Table
export const pushSubscriptions = mysqlTable(
    'push_subscriptions',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }).notNull(),
        endpoint: varchar('endpoint', { length: 500 }).notNull().unique(),
        p256dhKey: text('p256dh_key').notNull(),
        authKey: text('auth_key').notNull(),
        userAgent: text('user_agent'),
        ipAddress: varchar('ip_address', { length: 45 }),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: datetime('created_at').notNull().default(new Date()),
        updatedAt: datetime('updated_at')
            .notNull()
            .default(new Date())
            .$onUpdate(() => new Date()),
        lastUsedAt: datetime('last_used_at'),
        deviceType: varchar('device_type', { length: 50 }),
        browserName: varchar('browser_name', { length: 100 }),
        browserVersion: varchar('browser_version', { length: 50 }),
        osName: varchar('os_name', { length: 100 }),
        osVersion: varchar('os_version', { length: 50 }),
        notificationTypes: json('notification_types'),
        timezone: varchar('timezone', { length: 50 }),
    },
    (table) => ({
        userIdIdx: index('push_subscriptions_user_id_fkey').on(table.userId),
    }),
);

// Push Notification Logs Table
export const pushNotificationLogs = mysqlTable(
    'push_notifications_log',
    {
        id: bigint('id', { mode: 'bigint', unsigned: true })
            .primaryKey()
            .autoincrement(),
        userId: bigint('user_id', { mode: 'bigint', unsigned: true }),
        subscriptionId: bigint('subscription_id', {
            mode: 'bigint',
            unsigned: true,
        }),
        messageTitle: varchar('message_title', { length: 255 }),
        messageBody: text('message_body'),
        messageData: json('message_data'),
        sentAt: datetime('sent_at').notNull().default(new Date()),
        status: mysqlEnum('status', ['SENT', 'FAILED', 'PENDING']),
        errorMessage: text('error_message'),
        responseData: json('response_data'),
    },
    (table) => ({
        userIdIdx: index('push_notifications_log_user_id_fkey').on(
            table.userId,
        ),
        subscriptionIdIdx: index(
            'push_notifications_log_subscription_id_fkey',
        ).on(table.subscriptionId),
    }),
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
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
    assignedProjects: many(projectAssignees),
    projects: many(projects),
    tasks: many(tasks),
    pushSubscriptions: many(pushSubscriptions),
    pushNotificationLogs: many(pushNotificationLogs),
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
    task: one(tasks, {
        fields: [messages.taskId],
        references: [tasks.id],
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

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    user: one(users, {
        fields: [tasks.userId],
        references: [users.id],
    }),
    project: one(projects, {
        fields: [tasks.projectId],
        references: [projects.id],
    }),
    parentTask: one(tasks, {
        fields: [tasks.parentTaskId],
        references: [tasks.id],
        relationName: 'SubTasks',
    }),
    subTasks: many(tasks, { relationName: 'SubTasks' }),
    messages: many(messages),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    tasks: many(tasks),
    assignees: many(projectAssignees),
    projectTags: many(projectTags),
}));

export const projectTagsRelations = relations(projectTags, ({ one }) => ({
    project: one(projects, {
        fields: [projectTags.projectId],
        references: [projects.id],
    }),
}));

export const projectAssigneesRelations = relations(
    projectAssignees,
    ({ one }) => ({
        project: one(projects, {
            fields: [projectAssignees.projectId],
            references: [projects.id],
        }),
        user: one(users, {
            fields: [projectAssignees.userId],
            references: [users.id],
        }),
    }),
);

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
