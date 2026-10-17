import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRegisteredHook } from './events/user-registered.hook.js';
import { KafkaProducerService } from './kafka/kafka-producer.service.js';

@Module({
  imports: [BetterAuthModule.forRoot({ auth })],
  controllers: [AuthController],
  providers: [AuthService, KafkaProducerService, UserRegisteredHook],
})
export class AuthModule {}
