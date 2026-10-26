import { listEnv, optionalEnv, requireEnv } from '@app/common';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  betterAuth: {
    secret: requireEnv('BETTER_AUTH_SECRET'),
    url: requireEnv('BETTER_AUTH_URL'),
    trustedOrigins: listEnv('TRUSTED_ORIGINS'),
  },
  kafka: {
    brokers: listEnv('KAFKA_BROKERS'),
    clientId: requireEnv('KAFKA_CLIENT_ID'),
  },
  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID'),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET'),
  },
};
