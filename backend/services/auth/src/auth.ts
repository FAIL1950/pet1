import { betterAuth, type DBAdapter } from 'better-auth';
import { jwt } from 'better-auth/plugins/jwt';
import { Pool } from 'pg';
import { config } from './config.js';
import { outboxPlugin } from './database/outbox.plugin.js';
import { OutboxMessagesRepository } from './database/repositories/outbox-messages.repository.js';
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  verificationEmailRequester,
} from './events/email-verification.js';

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
    // Sign-in answers 403 EMAIL_NOT_VERIFIED until the link from the email is opened.
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Users who signed up before verification was required get a fresh link on sign-in.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
    // Writes EmailVerificationRequested to the outbox; the notifications service sends the email.
    sendVerificationEmail: verificationEmailRequester(
      new OutboxMessagesRepository(),
      baseAdapter,
    ),
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
    // `outbox` table for UserRegistered / EmailVerificationRequested (see database/repositories/outbox-messages.repository.ts).
    outboxPlugin(),
  ],
  // Populated at runtime by @DatabaseHook() providers (see events/user-registered.hook.ts).
  databaseHooks: {},
});

/** Better Auth's own adapter: the fallback when an outbox write happens outside a transaction. */
async function baseAdapter(): Promise<DBAdapter> {
  // The adapter type is generic over these options; the outbox only needs the base interface.
  return (await auth.$context).adapter as unknown as DBAdapter;
}
