import { NestFactory } from '@nestjs/core';
import { BoardsModule } from './boards.module.js';

async function bootstrap() {
  const app = await NestFactory.create(BoardsModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
