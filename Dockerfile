FROM node:22 AS builder
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем весь проект
COPY . .

# Генерация Prisma Client и сборка проекта
RUN npm run build:docker


# --- Этап 2: продакшн ---
FROM node:22 AS production
WORKDIR /app

ENV NODE_ENV=production

# Копируем только нужное
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем Prisma схему
COPY --from=builder /app/prisma ./prisma

# Копируем сгенерированный Prisma Client (важно: .prisma с точкой!)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Копируем @prisma/client пакет
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Копируем папки public и public-test (нужны для static-server)
COPY --from=builder /app/public ./public
COPY --from=builder /app/public-test ./public-test

# Запуск миграций и старта
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]