import { requireEnv } from '@app/common';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
};
