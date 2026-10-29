import { Module } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import {
  JWT_AUTH_OPTIONS,
  JwtAuthGuard,
  KAFKA_OPTIONS,
  KafkaProducerService,
  OUTBOX_STORE,
  OutboxRelay,
  OutboxRepository,
} from '@app/common';
import { BoardCommandsService } from './boards/board-commands.service.js';
import { BoardQueriesService } from './boards/board-queries.service.js';
import { BoardsApiController } from './boards/boards-api.controller.js';
import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { config } from './config.js';
import { dataSourceOptions } from './database/options.js';
import { typeOrmOutboxStore } from './database/outbox-store.js';
import { BoardContentRepository } from './database/repositories/board-content.repository.js';
import { BoardsRepository } from './database/repositories/boards.repository.js';
import { OutboxMessagesRepository } from './database/repositories/outbox-messages.repository.js';
import { UsersRepository } from './database/repositories/users.repository.js';
import {
  PROJECTION_GROUP_ID,
  UsersProjectionConsumer,
} from './projection/users-projection.consumer.js';
import { UsersProjectionHandler } from './projection/users-projection.handler.js';

@Module({
  imports: [
    // Applies pending migrations before the app starts serving.
    TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true }),
  ],
  controllers: [BoardsController, BoardsApiController],
  providers: [
    BoardsService,
    { provide: KAFKA_OPTIONS, useValue: config.kafka },
    { provide: PROJECTION_GROUP_ID, useValue: config.kafka.groupId },
    { provide: JWT_AUTH_OPTIONS, useValue: config.auth },
    {
      provide: OUTBOX_STORE,
      useFactory: typeOrmOutboxStore,
      inject: [getDataSourceToken()],
    },
    UsersRepository,
    BoardsRepository,
    BoardContentRepository,
    OutboxMessagesRepository,
    OutboxRepository,
    KafkaProducerService,
    OutboxRelay,
    JwtAuthGuard,
    BoardCommandsService,
    BoardQueriesService,
    UsersProjectionHandler,
    UsersProjectionConsumer,
  ],
})
export class BoardsModule {}
