import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JWT_AUTH_OPTIONS,
  JwtAuthGuard,
  KAFKA_OPTIONS,
  KafkaProducerService,
} from '@app/common';
import { BoardCommandsService } from './boards/board-commands.service.js';
import { BoardsApiController } from './boards/boards-api.controller.js';
import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { config } from './config.js';
import { Board } from './database/entities/board.entity.js';
import { dataSourceOptions } from './database/options.js';
import {
  PROJECTION_GROUP_ID,
  ProjectionConsumer,
} from './projection/projection.consumer.js';
import { ProjectionHandler } from './projection/projection.handler.js';

@Module({
  imports: [
    // Applies pending migrations before the app starts serving.
    TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true }),
    TypeOrmModule.forFeature([Board]),
  ],
  controllers: [BoardsController, BoardsApiController],
  providers: [
    BoardsService,
    { provide: KAFKA_OPTIONS, useValue: config.kafka },
    { provide: PROJECTION_GROUP_ID, useValue: config.kafka.groupId },
    { provide: JWT_AUTH_OPTIONS, useValue: config.auth },
    KafkaProducerService,
    JwtAuthGuard,
    BoardCommandsService,
    ProjectionHandler,
    ProjectionConsumer,
  ],
})
export class BoardsModule {}
