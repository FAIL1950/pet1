import { z } from 'zod';
import { BoardRole } from '../../database/entities/board-member.entity.js';

/** Roles the OWNER can grant (there is exactly one OWNER). */
const grantableRole = z.enum([BoardRole.EDITOR, BoardRole.VIEWER]);

export const addMemberSchema = z.object({
  // Normalize first (checks run before transforms), then validate; Better Auth stores emails lowercased.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: grantableRole,
});

export type AddMemberInput = z.output<typeof addMemberSchema>;

export const changeMemberRoleSchema = z.object({
  role: grantableRole,
});

export type ChangeMemberRoleInput = z.output<typeof changeMemberRoleSchema>;
