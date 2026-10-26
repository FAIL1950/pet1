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
import { Board } from './board.entity.js';

@Entity({ name: 'columns' })
@Index(['boardId', 'position'])
export class BoardColumn {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  /** Fractional-index key (see ../position.ts); byte-order collation so keys sort as generated. */
  @Column({ type: 'text', collation: 'C' })
  position: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Relation<Board>;
}
