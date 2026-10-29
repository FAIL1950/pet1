import { Injectable } from '@nestjs/common';
import type { OutboxMessage as OutboxMessageData } from '@app/common';
import type { EntityManager } from 'typeorm';
import { OutboxMessage } from '../entities/outbox-message.entity.js';

/**
 * Writes events to the `outbox` table. Always called with the manager of the transaction that
 * changes the state the events describe (reading and deleting is `OutboxRepository` in `@app/common`).
 */
@Injectable()
export class OutboxMessagesRepository {
  async add(
    messages: OutboxMessageData[],
    manager: EntityManager,
  ): Promise<void> {
    if (messages.length > 0) await manager.insert(OutboxMessage, messages);
  }
}
