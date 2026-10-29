import { Injectable } from '@nestjs/common';
import type { OutboxMessage } from '@app/common';
import { getCurrentAdapter, type DBAdapter } from 'better-auth';
import { OUTBOX_MODEL } from '../outbox.plugin.js';

/**
 * Writes events to the `outbox` table through Better Auth's adapter. Inside a Better Auth
 * transaction (e.g. a `create.before` database hook during sign-up) `getCurrentAdapter`
 * returns the transaction-bound adapter, so the row commits together with the user;
 * `fallback` (the endpoint context's adapter) is used outside a transaction.
 */
@Injectable()
export class OutboxMessagesRepository {
  async add(
    { id, ...message }: OutboxMessage,
    fallback: DBAdapter | undefined,
  ): Promise<void> {
    const adapter = await getCurrentAdapter(fallback as DBAdapter);
    if (!adapter) {
      throw new Error('No Better Auth adapter to write the outbox');
    }
    await adapter.create({
      model: OUTBOX_MODEL,
      data: { id, ...message, createdAt: new Date() },
      forceAllowId: true,
    });
  }
}
