import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Local projection of auth users, fed by `UserRegistered` from `auth.events` (the auth DB is not reachable from here). */
@Entity({ name: 'users' })
export class User {
  /** Better Auth user id (a string, not a uuid). */
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text' })
  name: string;

  /** Avatar URL; null for email sign-ups. */
  @Column({ type: 'text', nullable: true })
  image: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
