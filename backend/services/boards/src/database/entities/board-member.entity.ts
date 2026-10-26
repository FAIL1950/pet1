import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Board } from './board.entity.js';
import { User } from './user.entity.js';

export enum BoardRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

@Entity({ name: 'board_members' })
// Exactly one OWNER per board.
@Index('UQ_board_members_owner', ['boardId'], {
  unique: true,
  where: `"role" = 'OWNER'`,
})
export class BoardMember {
  @PrimaryColumn({ name: 'board_id', type: 'uuid' })
  boardId: string;

  @Index()
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({ type: 'enum', enum: BoardRole, enumName: 'board_role' })
  role: BoardRole;

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Relation<Board>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;
}
