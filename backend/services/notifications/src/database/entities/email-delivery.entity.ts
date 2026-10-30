import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum EmailDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * One row per email triggered by an event. The unique (source_event_id, kind) key makes
 * consuming a redelivered event a no-op instead of a duplicate email.
 */
@Entity({ name: 'email_deliveries' })
@Unique('UQ_email_deliveries_source_event_kind', ['sourceEventId', 'kind'])
// Retry worker: due PENDING rows.
@Index('IDX_email_deliveries_due', ['status', 'nextAttemptAt'])
export class EmailDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** `eventId` of the domain event that caused this email. */
  @Column({ name: 'source_event_id', type: 'uuid' })
  sourceEventId: string;

  /** Email template, e.g. `welcome`. */
  @Column({ type: 'varchar', length: 50 })
  kind: string;

  @Column({ type: 'text' })
  recipient: string;

  @Column({
    type: 'enum',
    enum: EmailDeliveryStatus,
    enumName: 'email_delivery_status',
    default: EmailDeliveryStatus.PENDING,
  })
  status: EmailDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /** Template data (e.g. `name`, `url`); cleared once sent, so a link's token isn't kept. */
  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, string>;

  /**
   * When the retry worker may (re)send a PENDING row. Set at claim time as a lease, so a row
   * whose sender crashed mid-way is picked up again instead of being lost.
   */
  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: true })
  nextAttemptAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}
