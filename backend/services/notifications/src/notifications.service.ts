import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  getHello(): string {
    return 'Notifications service is running';
  }
}
