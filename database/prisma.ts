import { PrismaClient } from '@prisma/client';
import appConfig from '#config/app.js';

const prisma = (appConfig.env === 'prod' || appConfig.env === 'production') ? new PrismaClient() : new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

export { prisma }; 