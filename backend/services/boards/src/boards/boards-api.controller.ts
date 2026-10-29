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
import {
  moveCardSchema,
  moveColumnSchema,
  type MoveCardInput,
  type MoveColumnInput,
} from './move.schema.js';

const BoardId = () => Param('boardId', ParseUUIDPipe);
const ColumnId = () => Param('columnId', ParseUUIDPipe);
const CardId = () => Param('cardId', ParseUUIDPipe);

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

  // Column/card writes below: OWNER/EDITOR only (403), 404 for non-members or items of another board.

  @Patch(':boardId/columns/:columnId')
  async updateColumn(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @ColumnId() columnId: string,
    @Body(new ZodValidationPipe(createColumnSchema)) input: CreateColumnInput,
  ): Promise<ColumnResponse> {
    return toColumnResponse(
      await this.commands.updateColumn(user, boardId, columnId, input),
    );
  }

  /** Places the column after `afterColumnId` (null = first). */
  @Post(':boardId/columns/:columnId/move')
  @HttpCode(HttpStatus.OK)
  async moveColumn(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @ColumnId() columnId: string,
    @Body(new ZodValidationPipe(moveColumnSchema)) input: MoveColumnInput,
  ): Promise<ColumnResponse> {
    return toColumnResponse(
      await this.commands.moveColumn(user, boardId, columnId, input),
    );
  }

  /** Deletes the column with its cards. */
  @Delete(':boardId/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteColumn(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @ColumnId() columnId: string,
  ): Promise<void> {
    await this.commands.deleteColumn(user, boardId, columnId);
  }

  @Patch(':boardId/cards/:cardId')
  async updateCard(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @CardId() cardId: string,
    @Body(new ZodValidationPipe(createCardSchema)) input: CreateCardInput,
  ): Promise<CardResponse> {
    return toCardResponse(
      await this.commands.updateCard(user, boardId, cardId, input),
    );
  }

  /** Places the card in `columnId` after `afterCardId` (null = first). */
  @Post(':boardId/cards/:cardId/move')
  @HttpCode(HttpStatus.OK)
  async moveCard(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @CardId() cardId: string,
    @Body(new ZodValidationPipe(moveCardSchema)) input: MoveCardInput,
  ): Promise<CardResponse> {
    return toCardResponse(
      await this.commands.moveCard(user, boardId, cardId, input),
    );
  }

  @Delete(':boardId/cards/:cardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @CurrentUser() user: AuthUser,
    @BoardId() boardId: string,
    @CardId() cardId: string,
  ): Promise<void> {
    await this.commands.deleteCard(user, boardId, cardId);
  }
}
