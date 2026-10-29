import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Events written in the same transaction as the board change they describe; `OutboxRelay`
 * (`@app/common`) publishes them to Kafka in `created_at` order and deletes them.
 */
@Entity({ name: 'outbox' })
@Index('IDX_outbox_order', ['createdAt', 'id'])
export class OutboxMessage {
  /** The event's `eventId`. */
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text' })
  topic: string;

  /** Kafka message key (the aggregate id). */
  @Column({ type: 'text' })
  key: string;

  @Column({ name: 'event_type', type: 'text' })
  eventType: string;

  /** The serialized `DomainEvent` envelope. */
  @Column({ type: 'text' })
  event: string;

  // clock_timestamp(), not now(): several events of one transaction keep their insert order.
  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;
}
