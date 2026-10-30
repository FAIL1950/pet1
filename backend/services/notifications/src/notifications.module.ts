import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailDeliveriesRepository } from './database/repositories/email-deliveries.repository.js';
import { dataSourceOptions } from './database/options.js';
import { DeliveryService } from './deliveries/delivery.service.js';
import { RetryWorker } from './deliveries/retry.worker.js';
import { EMAIL_SENDER } from './email/email-sender.js';
import { SmtpEmailSender } from './email/smtp-email-sender.js';
import { AuthEventsConsumer } from './events/auth-events.consumer.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [
    // Applies pending migrations before the app starts serving.
    TypeOrmModule.forRoot({ ...dataSourceOptions, migrationsRun: true }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailDeliveriesRepository,
    { provide: EMAIL_SENDER, useClass: SmtpEmailSender },
    DeliveryService,
    RetryWorker,
    AuthEventsConsumer,
  ],
})
export class NotificationsModule {}
