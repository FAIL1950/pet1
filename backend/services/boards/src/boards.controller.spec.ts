import { Test, TestingModule } from '@nestjs/testing';
import { BoardsController } from './boards.controller.js';
import { BoardsService } from './boards.service.js';

describe('BoardsController', () => {
  let boardsController: BoardsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [BoardsService],
    }).compile();

    boardsController = app.get<BoardsController>(BoardsController);
  });

  describe('root', () => {
    it('should return "Boards service is running"', () => {
      expect(boardsController.getHello()).toBe('Boards service is running');
    });
  });
});
