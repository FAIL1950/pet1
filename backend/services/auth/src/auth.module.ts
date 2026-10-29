import { Module } from '@nestjs/common';
import {
  KAFKA_OPTIONS,
  KafkaProducerService,
  OUTBOX_STORE,
  OutboxRelay,
} from '@app/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth, pool } from './auth.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { pgOutboxStore } from './events/outbox-store.js';
import { UserRegisteredHook } from './events/user-registered.hook.js';
import { config } from './config.js';

@Module({
  imports: [BetterAuthModule.forRoot({ auth })],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: KAFKA_OPTIONS, useValue: config.kafka },
    { provide: OUTBOX_STORE, useValue: pgOutboxStore(pool) },
    KafkaProducerService,
    OutboxRelay,
    UserRegisteredHook,
  ],
})
export class AuthModule {}
