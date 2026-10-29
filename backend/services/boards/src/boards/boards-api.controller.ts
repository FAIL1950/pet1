import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  ZodValidationPipe,
  type AuthUser,
} from '@app/common';
import { BoardRole } from '../database/entities/board-member.entity.js';
import { BoardCommandsService } from './board-commands.service.js';
import {
  createBoardSchema,
  type CreateBoardInput,
} from './create-board.schema.js';

export interface BoardResponse {
  id: string;
  title: string;
  description: string | null;
  role: BoardRole;
  createdAt: string;
}

// The ingress forwards `/api/boards` unchanged, hence the full prefix here.
@Controller('api/boards')
@UseGuards(JwtAuthGuard)
export class BoardsApiController {
  constructor(private readonly commands: BoardCommandsService) {}

  /** 201 with the created board; the caller becomes its OWNER. */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBoardSchema)) input: CreateBoardInput,
  ): Promise<BoardResponse> {
    const board = await this.commands.createBoard(user, input);
    return {
      id: board.id,
      title: board.title,
      description: board.description,
      role: BoardRole.OWNER,
      createdAt: board.createdAt.toISOString(),
    };
  }
}
