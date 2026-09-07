import { PrismaClient } from '@prisma/client';
import { env } from './config/env';
import { resolvePrismaDatabaseUrl } from './config/pg-ssl';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolvePrismaDatabaseUrl({
        databaseUrl: env.DATABASE_URL,
        nodeEnv: env.NODE_ENV,
        dbSsl: env.DB_SSL,
      }),
    },
  },
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});
