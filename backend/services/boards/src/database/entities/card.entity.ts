import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { BoardColumn } from './board-column.entity.js';
import { Board } from './board.entity.js';
import { User } from './user.entity.js';

@Entity({ name: 'cards' })
@Index(['columnId', 'position'])
export class Card {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  /** Denormalized from the column so a whole board loads with one query. */
  @Index()
  @Column({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @Column({ name: 'column_id', type: 'uuid' })
  columnId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Fractional-index key (see ../position.ts); byte-order collation so keys sort as generated. */
  @Column({ type: 'text', collation: 'C' })
  position: string;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Relation<Board>;

  @ManyToOne(() => BoardColumn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'column_id' })
  column: Relation<BoardColumn>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Relation<User> | null;
}
