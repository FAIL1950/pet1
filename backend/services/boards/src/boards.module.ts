import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';
import { dataSourceOptions } from './database/options.js';

@Module({
  imports: [
    // Applies pending migrations before the app starts serving.
    TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true }),
  ],
  controllers: [BoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}
