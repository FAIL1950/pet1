import { NestFactory } from '@nestjs/core';
import { config } from './config.js';
import { NotificationsModule } from './notifications.module.js';

async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}
await bootstrap();
