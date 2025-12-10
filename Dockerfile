FROM node:22 AS builder
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем весь проект
COPY . .

# Сборка проекта
RUN npm run build:docker


# --- Этап 2: продакшн ---
FROM node:22 AS production
WORKDIR /app

ENV NODE_ENV=production

# Копируем только нужное
COPY package*.json ./
# Нужны dev-зависимости, чтобы выполнять миграции drizzle
RUN npm ci

# Копируем собранный код
COPY --from=builder /app/dist ./dist

# Копируем папки public и public-test (нужны для static-server)
COPY --from=builder /app/public ./public
COPY --from=builder /app/public-test ./public-test

# Копируем конфигурационные файлы
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
# Копируем миграции drizzle
COPY --from=builder /app/drizzle ./drizzle

# Запускаем миграции и приложение
CMD ["sh", "-c", "npm run db:migrate" , "&&" , "node dist/index.js"]
