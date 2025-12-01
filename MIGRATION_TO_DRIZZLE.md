# Migration from Prisma to Drizzle ORM

This document describes the migration from Prisma ORM to Drizzle ORM.

## What Changed

### Dependencies
- **Removed**: `@prisma/client`, `prisma`
- **Added/Kept**: `drizzle-orm`, `drizzle-kit`, `mysql2`

### Files Created
- `database/schema.ts` - Drizzle schema definition
- `database/db.ts` - Drizzle database connection
- `drizzle.config.ts` - Drizzle Kit configuration

### Files Updated
- All model files in `app/models/`
- All controllers in `app/controllers/http/`
- Service files in `app/servises/`
- `package.json` - scripts and dependencies
- `Dockerfile` - removed Prisma-specific steps

### Files Removed
- `database/prisma.ts` - replaced by `database/db.ts`

## New Scripts

Replace Prisma commands with Drizzle commands:

### Old (Prisma)
```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

### New (Drizzle)
```bash
npm run db:generate      # Generate SQL migrations
npm run db:migrate       # Apply migrations
npm run db:push          # Push schema to database (dev only)
npm run db:studio        # Open Drizzle Studio
npm run db:introspect    # Introspect existing database
```

## How to Use

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Ensure your `.env` file has the following variables:
```env
DATABASE_URL="mysql://user:password@host:port/database"
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB_NAME=your_database
```

### 3. Push Schema to Database
For development, you can push the schema directly:
```bash
npm run db:push
```

Or generate and run migrations:
```bash
npm run db:generate
npm run db:migrate
```

### 4. Start Development
```bash
npm run dev
```

## Key Differences

### Query Syntax

#### Prisma
```typescript
const user = await prisma.user.findUnique({
    where: { id: 1 }
});
```

#### Drizzle
```typescript
const user = await db.select()
    .from(users)
    .where(eq(users.id, 1n))
    .limit(1);
```

### Relations

Drizzle uses explicit joins instead of automatic relation loading:

```typescript
// Get user with related data
const userWithContacts = await db.select()
    .from(users)
    .leftJoin(contactList, eq(contactList.userId, users.id))
    .where(eq(users.id, userId));
```

### Transactions

#### Prisma
```typescript
await prisma.$transaction(async (prisma) => {
    // operations
});
```

#### Drizzle
```typescript
await db.transaction(async (tx) => {
    // operations using tx instead of db
});
```

## BigInt Handling

Drizzle uses `bigint` type for auto-increment IDs. Make sure to convert numbers to BigInt when needed:

```typescript
// Converting number to BigInt
const id = BigInt(userId);

// Using in queries
await db.select().from(users).where(eq(users.id, BigInt(userId)));
```

## Benefits of Drizzle

1. **Type Safety**: Better TypeScript inference
2. **Performance**: Lighter weight, no query engine
3. **SQL-like**: More control over queries
4. **Flexibility**: Easy to write complex queries
5. **No Code Generation**: Direct schema definition

## Troubleshooting

### Issue: Connection errors
**Solution**: Check your database credentials in `.env` file

### Issue: Type errors with BigInt
**Solution**: Use `BigInt()` to convert numbers to bigint type

### Issue: Migration conflicts
**Solution**: Use `npm run db:push` in development to sync schema directly

## Documentation

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [MySQL with Drizzle](https://orm.drizzle.team/docs/get-started-mysql)

