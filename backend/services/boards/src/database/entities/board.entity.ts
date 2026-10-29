import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'boards' })
export class Board {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Incremented by every board command in the same transaction as the change; the event
   * written to the outbox carries the new value. Commands carry an expected version for
   * optimistic concurrency (`UPDATE ... WHERE version = $expected`); consumers of
   * `board.events` use it to skip duplicates.
   */
  @Column({ type: 'int' })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
