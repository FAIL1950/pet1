import { NestFactory } from '@nestjs/core';
import { getMigrations } from 'better-auth/db/migration';
import { auth } from './auth.js';
import { AuthModule } from './auth.module.js';
import { config } from './config.js';

async function bootstrap() {
  // Idempotent: creates/extends the Better Auth tables (user, session, account, verification, jwks, outbox).
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  const app = await NestFactory.create(AuthModule, {
    bodyParser: false, // Better Auth reads the raw body; the auth module re-adds parsers for other routes.
  });
  app.enableShutdownHooks();
  await app.listen(config.port);
}
await bootstrap();
