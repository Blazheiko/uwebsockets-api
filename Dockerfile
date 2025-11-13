# --- Этап 1: сборка ---
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
    EXPOSE 8088
    ENV NODE_ENV=production
    
    # Копируем только нужное
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # Копируем собранный код и Prisma Client
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
    
    # Запуск миграций и старта
    CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]