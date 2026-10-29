import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { KAFKA_OPTIONS, type KafkaOptions } from '@app/common';
import { AUTH_EVENTS_TOPIC, type DomainEvent } from '@app/contracts';
import { Kafka, type Consumer } from 'kafkajs';
import { UsersProjectionHandler } from './users-projection.handler.js';

/** Consumer group id of the projection consumer; provide with `config.kafka.groupId`. */
export const PROJECTION_GROUP_ID = Symbol('PROJECTION_GROUP_ID');

/**
 * Feeds `auth.events` into UsersProjectionHandler (the local `users` table). Offsets are
 * committed only after a message is applied, so delivery is at least once; a failing message
 * is retried by kafkajs (no dead-letter topic yet).
 */
@Injectable()
export class UsersProjectionConsumer
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(UsersProjectionConsumer.name);
  private readonly consumer: Consumer;

  constructor(
    @Inject(KAFKA_OPTIONS) options: KafkaOptions,
    @Inject(PROJECTION_GROUP_ID) groupId: string,
    private readonly handler: UsersProjectionHandler,
  ) {
    this.consumer = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
    }).consumer({ groupId });
  }

  async onModuleInit() {
    await this.consumer.connect();
    // fromBeginning only applies to a new group: it replays all users into an empty projection.
    await this.consumer.subscribe({
      topics: [AUTH_EVENTS_TOPIC],
      fromBeginning: true,
    });
    // Resolves once the consumer is running; messages are then handled in the background.
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const event = JSON.parse(
          message.value.toString(),
        ) as DomainEvent<unknown>;
        try {
          await this.handler.apply(event);
        } catch (error) {
          this.logger.error(
            `Failed to apply ${event.eventType} (${event.eventId}) from ${topic}[${partition}]@${message.offset}`,
            error instanceof Error ? error.stack : String(error),
          );
          throw error;
        }
      },
    });
  }

  async onApplicationShutdown() {
    await this.consumer.disconnect();
  }
}
