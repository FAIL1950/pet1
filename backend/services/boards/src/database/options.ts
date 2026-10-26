import type { DataSourceOptions } from 'typeorm';
import { config } from '../config.js';
import { BoardColumn } from './entities/board-column.entity.js';
import { BoardMember } from './entities/board-member.entity.js';
import { Board } from './entities/board.entity.js';
import { Card } from './entities/card.entity.js';
import { User } from './entities/user.entity.js';
import { InitialSchema1793059200000 } from './migrations/1793059200000-InitialSchema.js';

// Entities and migrations are listed explicitly (no globs): the service runs from TS source under Bun.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: config.databaseUrl,
  // gen_random_uuid() is built into Postgres 13+; uuid-ossp would need a superuser to install.
  uuidExtension: 'pgcrypto',
  synchronize: false,
  entities: [User, Board, BoardMember, BoardColumn, Card],
  migrations: [InitialSchema1793059200000],
  migrationsTransactionMode: 'all',
};
