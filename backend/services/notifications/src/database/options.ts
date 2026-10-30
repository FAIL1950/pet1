import type { DataSourceOptions } from 'typeorm';
import { config } from '../config.js';
import { EmailDelivery } from './entities/email-delivery.entity.js';
import { InitialSchema1793059200000 } from './migrations/1793059200000-InitialSchema.js';
import { AddDeliveryRetry1793232000000 } from './migrations/1793232000000-AddDeliveryRetry.js';

// Entities and migrations are listed explicitly (no globs): the service runs from TS source under Bun.
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: config.databaseUrl,
  // gen_random_uuid() is built into Postgres 13+; uuid-ossp would need a superuser to install.
  uuidExtension: 'pgcrypto',
  synchronize: false,
  entities: [EmailDelivery],
  migrations: [InitialSchema1793059200000, AddDeliveryRetry1793232000000],
  migrationsTransactionMode: 'all',
};
