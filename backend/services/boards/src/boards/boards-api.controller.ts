import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  ZodValidationPipe,
  type AuthUser,
} from '@app/common';
import type { Response } from 'express';
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

export interface BoardPendingResponse {
  boardId: string;
}

// The ingress forwards `/api/boards` unchanged, hence the full prefix here.
@Controller('api/boards')
@UseGuards(JwtAuthGuard)
export class BoardsApiController {
  constructor(private readonly commands: BoardCommandsService) {}

  /** 201 with the board once projected; 202 with its id if the projection is still catching up. */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBoardSchema)) input: CreateBoardInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BoardResponse | BoardPendingResponse> {
    const result = await this.commands.createBoard(user, input);
    if (result.status === 'pending') {
      res.status(HttpStatus.ACCEPTED);
      return { boardId: result.boardId };
    }

    const { board } = result;
    res.status(HttpStatus.CREATED);
    return {
      id: board.id,
      title: board.title,
      description: board.description,
      role: BoardRole.OWNER,
      createdAt: board.createdAt.toISOString(),
    };
  }
}
