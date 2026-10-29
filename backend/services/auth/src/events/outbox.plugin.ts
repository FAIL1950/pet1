import type { BetterAuthPlugin } from 'better-auth';

/** Model name of the outbox table in Better Auth's schema. */
export const OUTBOX_MODEL = 'outbox';

/**
 * Registers the `outbox` table with Better Auth, so `getMigrations()` (main.ts) creates it and
 * database hooks can write to it through the transaction-bound adapter. Columns match what
 * `OutboxRelay` (`@app/common`) reads.
 */
export const outboxPlugin = () =>
  ({
    id: 'outbox',
    schema: {
      [OUTBOX_MODEL]: {
        modelName: OUTBOX_MODEL,
        fields: {
          topic: { type: 'string', required: true },
          key: { type: 'string', required: true },
          eventType: {
            type: 'string',
            required: true,
            fieldName: 'event_type',
          },
          event: { type: 'string', required: true },
          createdAt: {
            type: 'date',
            required: true,
            fieldName: 'created_at',
            defaultValue: () => new Date(),
          },
        },
      },
    },
  }) satisfies BetterAuthPlugin;
