import { NestFactory } from '@nestjs/core';
import { BoardsModule } from './boards.module.js';
import { config } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create(BoardsModule);
  app.enableShutdownHooks();
  await app.listen(config.port);
}
await bootstrap();
