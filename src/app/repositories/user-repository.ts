import { db } from "#database/db.js";
import { promoCodes, users } from "#database/schema.js";
import { and, count, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel, SQL } from "drizzle-orm";

export type UserRow = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;
export type UserUpdate = Partial<
  Pick<UserInsert, "name" | "email" | "password" | "phone" | "avatar"
    | "role" | "referralCode" | "premiumUntil" | "betaAccess"
    | "sessionToken"
    | "discountPercent" | "promoCodeId" | "emailVerifiedAt">
>;

export interface AdminUserListFilters {
  userId?: bigint;
  dateFrom?: Date;
  dateTo?: Date;
  promoCode?: string;
  limit?: number;
}

export interface AdminUserListRow {
  id: bigint;
  name: string;
  email: string;
  referralCode: string | null;
  createdAt: Date;
  promoCode: string | null;
}

export interface AdminOnlineUserRow {
  id: bigint;
  name: string;
  email: string;
  promoCode: string | null;
}

export interface AdminUserDetailRow {
  id: bigint;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin" | "partner";
  promoCode: string | null;
  referralCode: string | null;
  premiumUntil: Date | null;
  betaAccess: boolean;
  discountPercent: number;
  createdAt: Date;
}

export interface IUserRepository {
  create(data: UserInsert): Promise<UserRow>;
  findById(id: bigint): Promise<UserRow | undefined>;
  findByEmail(email: string): Promise<UserRow | undefined>;
  findByPhone(phone: string): Promise<UserRow | undefined>;
  findByReferralCode(referralCode: string): Promise<UserRow | undefined>;
  findBySessionToken(token: string): Promise<UserRow | undefined>;
  findByRole(role: string): Promise<UserRow[]>;
  listAdminUsers(filters?: AdminUserListFilters): Promise<{ items: AdminUserListRow[]; total: number }>;
  findAdminOnlineUsersByIds(ids: bigint[]): Promise<AdminOnlineUserRow[]>;
  findAdminUserDetailById(id: bigint): Promise<AdminUserDetailRow | undefined>;
  phoneExistsForOtherUser(phone: string, excludeId: bigint): Promise<boolean>;
  update(id: bigint, data: UserUpdate): Promise<UserRow | undefined>;
  delete(id: bigint): Promise<boolean>;
}

export const userRepository: IUserRepository = {
  async create(data) {
    const now = new Date();
    const [created] = await db.insert(users).values({
      ...data,
      createdAt: now,
      updatedAt: now,
    }).returning();
    if (created === undefined) {
      throw new Error("Failed to create user");
    }
    return created;
  },

  async findById(id) {
    return await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findByEmail(email) {
    return await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`)
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findByPhone(phone) {
    return await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findByReferralCode(referralCode) {
    return await db
      .select()
      .from(users)
      .where(sql`UPPER(${users.referralCode}) = UPPER(${referralCode})`)
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findBySessionToken(token) {
    return await db
      .select()
      .from(users)
      .where(eq(users.sessionToken, token))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async findByRole(role) {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role as "user" | "admin" | "partner"));
  },

  async listAdminUsers(filters = {}) {
    const conditions: SQL[] = [];
    const promoCodeFilter = filters.promoCode?.trim();
    const shouldJoinPromoCodes = promoCodeFilter !== undefined && promoCodeFilter !== "";

    if (filters.userId !== undefined) {
      conditions.push(eq(users.id, filters.userId));
    }

    if (filters.dateFrom !== undefined) {
      conditions.push(gte(users.createdAt, filters.dateFrom));
    }

    if (filters.dateTo !== undefined) {
      const nextDay = new Date(filters.dateTo);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(lt(users.createdAt, nextDay));
    }

    if (shouldJoinPromoCodes) {
      conditions.push(sql`UPPER(${promoCodes.code}) = UPPER(${promoCodeFilter})`);
    }

    let whereClause: SQL | undefined;
    if (conditions.length === 1) {
      whereClause = conditions.at(0);
    } else if (conditions.length > 1) {
      whereClause = and(...conditions);
    }
    const limit = Math.min(Math.max(filters.limit ?? 100, 1), 100);

    const rowsQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        createdAt: users.createdAt,
        promoCode: promoCodes.code,
      })
      .from(users)
      .leftJoin(promoCodes, eq(users.promoCodeId, promoCodes.id))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit);

    const totalQueryBase = db
      .select({ total: count() })
      .from(users);

    const totalQuery = shouldJoinPromoCodes
      ? totalQueryBase
        .leftJoin(promoCodes, eq(users.promoCodeId, promoCodes.id))
        .where(whereClause)
      : totalQueryBase.where(whereClause);

    const [rows, totalRows] = await Promise.all([rowsQuery, totalQuery]);

    return {
      items: rows,
      total: totalRows.at(0)?.total ?? 0,
    };
  },

  async findAdminOnlineUsersByIds(ids) {
    if (ids.length === 0) return [];

    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        promoCode: promoCodes.code,
      })
      .from(users)
      .leftJoin(promoCodes, eq(users.promoCodeId, promoCodes.id))
      .where(inArray(users.id, ids));
  },

  async findAdminUserDetailById(id) {
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        promoCode: promoCodes.code,
        referralCode: users.referralCode,
        premiumUntil: users.premiumUntil,
        betaAccess: users.betaAccess,
        discountPercent: users.discountPercent,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(promoCodes, eq(users.promoCodeId, promoCodes.id))
      .where(eq(users.id, id))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async phoneExistsForOtherUser(phone, excludeId) {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, phone), ne(users.id, excludeId)))
      .limit(1);
    return result.length > 0;
  },

  async update(id, data) {
    await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
    return userRepository.findById(id);
  },

  async delete(id) {
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted.length > 0;
  },
};
