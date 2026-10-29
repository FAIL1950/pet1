import { Module } from '@nestjs/common';
import { KAFKA_OPTIONS, KafkaProducerService } from '@app/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRegisteredHook } from './events/user-registered.hook.js';
import { config } from './config.js';

@Module({
  imports: [BetterAuthModule.forRoot({ auth })],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: KAFKA_OPTIONS, useValue: config.kafka },
    KafkaProducerService,
    UserRegisteredHook,
  ],
})
export class AuthModule {}
