import { db } from '#database/db.js';
import { calendar } from '#database/schema.js';
import { eq, and, or, gte, lte, asc, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { serializeArray, serializeModel} from '#vendor/utils/serialization/serialize-model.js';

import logger from '#logger';

const schema = {
    created_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    updated_at: (value: Date) => DateTime.fromJSDate(value).toISO(),
    startTime: (value: Date) => DateTime.fromJSDate(value).toISO(),
    endTime: (value: Date) => DateTime.fromJSDate(value).toISO(),
};

const required = ['title', 'startTime', 'endTime', 'userId'];
const hidden: string[] = [];

export default {
    async create(payload: any) {
        logger.info('create calendar event');

        if (!payload || typeof payload !== 'object') {
            throw new Error('Payload must be object');
        }

        const keys = Object.keys(payload);
        for (let field of required) {
            if (!keys.includes(field)) {
                throw new Error(`Field ${field} required`);
            }
        }

        const now = new Date();
        const [event] = await db.insert(calendar).values({
            title: payload.title,
            description: payload.description || '',
            startTime: new Date(payload.startTime),
            endTime: new Date(payload.endTime),
            userId: BigInt(payload.userId),
            createdAt: now,
            updatedAt: now,
        });

        const createdEvent = await db.select()
            .from(calendar)
            .where(eq(calendar.id, BigInt(event.insertId)))
            .limit(1);

        return serializeModel(createdEvent[0], schema, hidden);
    },

    async findById(id: bigint, userId: bigint) {
        logger.info(`find calendar event by id: ${id} for user: ${userId}`);

        const event = await db.select()
            .from(calendar)
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)))
            .limit(1);

        if (event.length === 0) {
            throw new Error(`Calendar event with id ${id} not found`);
        }

        return serializeModel(event[0], schema, hidden);
    },

    async findByUserId(userId: bigint) {
        logger.info(`find all calendar events for user: ${userId}`);

        const events = await db.select()
            .from(calendar)
            .where(eq(calendar.userId, userId))
            .orderBy(asc(calendar.startTime));

        return this.serializeArray(events);
    },

    async findByDate(userId: bigint, date: Date) {
        logger.info(`find calendar events by date for user: ${userId}`);

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const events = await db.select()
            .from(calendar)
            .where(and(
                eq(calendar.userId, userId),
                or(
                    and(
                        gte(calendar.startTime, startOfDay),
                        lte(calendar.startTime, endOfDay)
                    ),
                    and(
                        gte(calendar.endTime, startOfDay),
                        lte(calendar.endTime, endOfDay)
                    ),
                    and(
                        lte(calendar.startTime, startOfDay),
                        gte(calendar.endTime, endOfDay)
                    )
                )
            ))
            .orderBy(asc(calendar.startTime));

        return this.serializeArray(events);
    },

    async findByRange(userId: bigint, startDate: Date, endDate: Date) {
        logger.info(`find calendar events by range for user: ${userId}`);

        const events = await db.select()
            .from(calendar)
            .where(and(
                eq(calendar.userId, userId),
                or(
                    and(
                        gte(calendar.startTime, startDate),
                        lte(calendar.startTime, endDate)
                    ),
                    and(
                        gte(calendar.endTime, startDate),
                        lte(calendar.endTime, endDate)
                    ),
                    and(
                        lte(calendar.startTime, startDate),
                        gte(calendar.endTime, endDate)
                    )
                )
            ))
            .orderBy(asc(calendar.startTime));

        return this.serializeArray(events);
    },

    async update(id: bigint, userId: bigint, payload: any) {
        logger.info(`update calendar event id: ${id} for user: ${userId}`);

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.startTime !== undefined) updateData.startTime = new Date(payload.startTime);
        if (payload.endTime !== undefined) updateData.endTime = new Date(payload.endTime);

        await db.update(calendar)
            .set(updateData)
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)));

        const updatedEvent = await db.select()
            .from(calendar)
            .where(eq(calendar.id, id))
            .limit(1);

        if (updatedEvent.length === 0) {
            throw new Error('Calendar event not found or access denied');
        }

        return serializeModel(updatedEvent[0], schema, hidden);
    },

    async delete(id: bigint, userId: bigint) {
        logger.info(`delete calendar event id: ${id} for user: ${userId}`);

        await db.delete(calendar)
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)));

        // Verify deletion
        const checkDeleted = await db.select({ count: sql<number>`count(*)` })
            .from(calendar)
            .where(eq(calendar.id, id));

        if (checkDeleted[0]?.count > 0) {
            throw new Error('Calendar event not found or access denied');
        }

        return true;
    },

    query() {
        return db.select().from(calendar);
    },

    serialize(event: any) {
        return serializeModel(event, schema, hidden);
    },

    serializeArray(events: any) {
        return serializeArray(events, schema, hidden);
    },
};

