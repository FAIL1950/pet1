import type { OutboxStore } from '@app/common';
import type { DataSource } from 'typeorm';

/** `OutboxRelay` store over the service's TypeORM connection. */
export function typeOrmOutboxStore(dataSource: DataSource): OutboxStore {
  return {
    withTransaction: (work) =>
      dataSource.transaction((manager) =>
        work((sql, params) => manager.query(sql, params)),
      ),
  };
}
