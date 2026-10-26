// Entry point for the TypeORM CLI (`bun run migration:*:boards`); the app itself uses TypeOrmModule.
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './options.js';

export default new DataSource(dataSourceOptions);
