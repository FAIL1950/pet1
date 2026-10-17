import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { config } from './config.js';

const { clientId: googleClientId, clientSecret: googleClientSecret } =
  config.google;

export const auth = betterAuth({
  // Built-in Kysely adapter, so `getMigrations` (see main.ts) can manage the schema.
  database: new Pool({ connectionString: config.databaseUrl }),
  basePath: '/api/auth',
  baseURL: config.betterAuth.url,
  secret: config.betterAuth.secret,
  trustedOrigins: config.betterAuth.trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  // Populated at runtime by @DatabaseHook() providers (see events/user-registered.hook.ts).
  databaseHooks: {},
});
