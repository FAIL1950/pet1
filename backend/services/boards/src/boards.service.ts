import { Injectable } from '@nestjs/common';

@Injectable()
export class BoardsService {
  getHello(): string {
    return 'Boards service is running';
  }
}
