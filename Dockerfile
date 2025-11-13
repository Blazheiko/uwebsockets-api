# --- Этап 1: сборка ---
    FROM node:lts AS builder
    WORKDIR /app
    
    # Устанавливаем зависимости
    COPY package*.json ./
    RUN npm ci
    
    # Копируем весь проект
    COPY . .
    
    # Сборка проекта (если TypeScript) и генерация Prisma Client
    RUN npm run build && npx prisma generate
    
    
    # --- Этап 2: продакшн ---
    FROM node:lts AS production
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