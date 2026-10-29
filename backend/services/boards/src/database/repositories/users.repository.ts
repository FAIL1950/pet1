import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity.js';

export type UserProfile = Pick<User, 'id' | 'email' | 'name' | 'image'>;

/** The local `users` projection of auth users. */
@Injectable()
export class UsersRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Inserts or updates by id; re-applying the same profile is a no-op. */
  async upsert(user: UserProfile): Promise<void> {
    await this.dataSource.manager.upsert(User, user, ['id']);
  }

  /** Inserts the user only if no row conflicts; existing data is left untouched. */
  async insertIfMissing(
    user: UserProfile,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(user)
      .orIgnore()
      .execute();
  }
}
