import { db } from '#database/db.js';
import { calendar } from '#database/schema.js';
import { and, asc, eq, gte, lte, or } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type CalendarRow = InferSelectModel<typeof calendar>;
export type CalendarInsert = InferInsertModel<typeof calendar>;
export type CalendarUpdate = Partial<
    Pick<CalendarInsert, 'title' | 'description' | 'startTime' | 'endTime'>
>;

export interface ICalendarRepository {
    create(data: CalendarInsert): Promise<CalendarRow>;
    findById(id: bigint): Promise<CalendarRow | undefined>;
    findByIdAndUserId(id: bigint, userId: bigint): Promise<CalendarRow | undefined>;
    findByUserId(userId: bigint): Promise<CalendarRow[]>;
    findByDate(userId: bigint, date: Date): Promise<CalendarRow[]>;
    findByRange(userId: bigint, startDate: Date, endDate: Date): Promise<CalendarRow[]>;
    update(id: bigint, userId: bigint, data: CalendarUpdate): Promise<CalendarRow | undefined>;
    delete(id: bigint, userId: bigint): Promise<boolean>;
}

export const calendarRepository: ICalendarRepository = {
    async create(data) {
        const now = new Date();
        const [created] = await db.insert(calendar).values({
            ...data,
            createdAt: data.createdAt ?? now,
            updatedAt: data.updatedAt ?? now,
        }).returning();
        if (created === undefined) {
            throw new Error('Failed to create calendar event');
        }
        return created;
    },

    async findById(id) {
        return await db
            .select()
            .from(calendar)
            .where(eq(calendar.id, id))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByIdAndUserId(id, userId) {
        return await db
            .select()
            .from(calendar)
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)))
            .limit(1)
            .then((rows) => rows.at(0));
    },

    async findByUserId(userId) {
        return await db
            .select()
            .from(calendar)
            .where(eq(calendar.userId, userId))
            .orderBy(asc(calendar.startTime));
    },

    async findByDate(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await db
            .select()
            .from(calendar)
            .where(
                and(
                    eq(calendar.userId, userId),
                    or(
                        and(gte(calendar.startTime, startOfDay), lte(calendar.startTime, endOfDay)),
                        and(gte(calendar.endTime, startOfDay), lte(calendar.endTime, endOfDay)),
                        and(lte(calendar.startTime, startOfDay), gte(calendar.endTime, endOfDay)),
                    ),
                ),
            )
            .orderBy(asc(calendar.startTime));
    },

    async findByRange(userId, startDate, endDate) {
        return await db
            .select()
            .from(calendar)
            .where(
                and(
                    eq(calendar.userId, userId),
                    or(
                        and(gte(calendar.startTime, startDate), lte(calendar.startTime, endDate)),
                        and(gte(calendar.endTime, startDate), lte(calendar.endTime, endDate)),
                        and(lte(calendar.startTime, startDate), gte(calendar.endTime, endDate)),
                    ),
                ),
            )
            .orderBy(asc(calendar.startTime));
    },

    async update(id, userId, data) {
        await db
            .update(calendar)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)));
        return calendarRepository.findById(id);
    },

    async delete(id, userId) {
        const deleted = await db
            .delete(calendar)
            .where(and(eq(calendar.id, id), eq(calendar.userId, userId)))
            .returning();
        return deleted.length > 0;
    },
};
