import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins/jwt';
import { Pool } from 'pg';
import { config } from './config.js';
import { outboxPlugin } from './database/outbox.plugin.js';

const { clientId: googleClientId, clientSecret: googleClientSecret } =
  config.google;

/** Shared with the outbox relay (auth.module.ts). */
export const pool = new Pool({ connectionString: config.databaseUrl });

export const auth = betterAuth({
  // Built-in Kysely adapter, so `getMigrations` (see main.ts) can manage the schema.
  database: pool,
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
  plugins: [
    // Short-lived access tokens (`GET /api/auth/token`) that other services verify locally
    // against `GET /api/auth/jwks`, so they never call auth per request. `sub` is the user id.
    jwt({
      jwt: {
        definePayload: ({ user }) => ({
          email: user.email,
          name: user.name,
          image: user.image ?? null,
        }),
      },
    }),
    // `outbox` table for UserRegistered (see database/repositories/outbox-messages.repository.ts).
    outboxPlugin(),
  ],
  // Populated at runtime by @DatabaseHook() providers (see events/user-registered.hook.ts).
  databaseHooks: {},
});
