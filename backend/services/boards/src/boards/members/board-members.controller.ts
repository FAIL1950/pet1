import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  ZodValidationPipe,
  type AuthUser,
} from '@app/common';
import type { BoardRole } from '../../database/entities/board-member.entity.js';
import type { MemberProfile } from '../../database/repositories/board-members.repository.js';
import { BoardMembersService } from './board-members.service.js';
import {
  addMemberSchema,
  changeMemberRoleSchema,
  type AddMemberInput,
  type ChangeMemberRoleInput,
} from './members.schema.js';

export interface MemberResponse {
  userId: string;
  email: string;
  name: string;
  image: string | null;
  role: BoardRole;
  addedAt: string;
}

export function toMemberResponse(member: MemberProfile): MemberResponse {
  return { ...member, addedAt: member.addedAt.toISOString() };
}

/**
 * `api/boards/:boardId/members` (the ingress forwards `/api/boards` unchanged). Errors: 403 not
 * the OWNER, 404 not a member / unknown member, 422 no user with that email, 409 already a
 * member or the OWNER targeted.
 */
@Controller('api/boards/:boardId/members')
@UseGuards(JwtAuthGuard)
export class BoardMembersController {
  constructor(private readonly members: BoardMembersService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
  ): Promise<MemberResponse[]> {
    return (await this.members.list(user, boardId)).map(toMemberResponse);
  }

  @Post()
  async add(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body(new ZodValidationPipe(addMemberSchema)) input: AddMemberInput,
  ): Promise<MemberResponse> {
    return toMemberResponse(await this.members.add(user, boardId, input));
  }

  // User ids are Better Auth ids (not uuids), so `:userId` isn't parsed as one.
  @Patch(':userId')
  async changeRole(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('userId') memberId: string,
    @Body(new ZodValidationPipe(changeMemberRoleSchema))
    input: ChangeMemberRoleInput,
  ): Promise<MemberResponse> {
    return toMemberResponse(
      await this.members.changeRole(user, boardId, memberId, input),
    );
  }

  /** Removes the member (OWNER), or leaves the board when `userId` is the caller. */
  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('userId') memberId: string,
  ): Promise<void> {
    await this.members.remove(user, boardId, memberId);
  }
}
