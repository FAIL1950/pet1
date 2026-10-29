import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  JwtAuthGuard,
  ZodValidationPipe,
  type AuthUser,
} from '@app/common';
import { BoardRole } from '../database/entities/board-member.entity.js';
import { BoardCommandsService } from './board-commands.service.js';
import { BoardQueriesService } from './board-queries.service.js';
import {
  toBoardDetailsResponse,
  toBoardResponse,
  toCardResponse,
  toColumnResponse,
  type BoardDetailsResponse,
  type BoardResponse,
  type CardResponse,
  type ColumnResponse,
} from './board.dto.js';
import {
  createBoardSchema,
  type CreateBoardInput,
} from './create-board.schema.js';
import {
  createCardSchema,
  type CreateCardInput,
} from './create-card.schema.js';
import {
  createColumnSchema,
  type CreateColumnInput,
} from './create-column.schema.js';

// The ingress forwards `/api/boards` unchanged, hence the full prefix here.
@Controller('api/boards')
@UseGuards(JwtAuthGuard)
export class BoardsApiController {
  constructor(
    private readonly commands: BoardCommandsService,
    private readonly queries: BoardQueriesService,
  ) {}

  /** Boards the caller is a member of, newest first. */
  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<BoardResponse[]> {
    const boards = await this.queries.listForUser(user.id);
    return boards.map(toBoardResponse);
  }

  /** The board with its columns and cards; 404 if it doesn't exist or the caller isn't a member. */
  @Get(':boardId')
  async get(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
  ): Promise<BoardDetailsResponse> {
    return toBoardDetailsResponse(
      await this.queries.getForUser(boardId, user.id),
    );
  }

  /** 201 with the created board; the caller becomes its OWNER. */
  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBoardSchema)) input: CreateBoardInput,
  ): Promise<BoardResponse> {
    const board = await this.commands.createBoard(user, input);
    return toBoardResponse({ ...board, role: BoardRole.OWNER });
  }

  /** Appends a column; OWNER/EDITOR only (403), 404 for non-members. */
  @Post(':boardId/columns')
  async createColumn(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Body(new ZodValidationPipe(createColumnSchema)) input: CreateColumnInput,
  ): Promise<ColumnResponse> {
    return toColumnResponse(
      await this.commands.createColumn(user, boardId, input),
    );
  }

  /** Appends a card to the column; OWNER/EDITOR only (403), 404 for non-members or a foreign column. */
  @Post(':boardId/columns/:columnId/cards')
  async createCard(
    @CurrentUser() user: AuthUser,
    @Param('boardId', ParseUUIDPipe) boardId: string,
    @Param('columnId', ParseUUIDPipe) columnId: string,
    @Body(new ZodValidationPipe(createCardSchema)) input: CreateCardInput,
  ): Promise<CardResponse> {
    return toCardResponse(
      await this.commands.createCard(user, boardId, columnId, input),
    );
  }
}
