import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { AUTH_EVENTS_TOPIC, type DomainEvent } from '@app/contracts';
import { Kafka, type Consumer } from 'kafkajs';
import { config } from '../config.js';
import { DeliveryService } from '../deliveries/delivery.service.js';
import { handleAuthEvent } from './handle-auth-event.js';

/**
 * Consumes `auth.events` in the `KAFKA_GROUP_ID` group: with several replicas, Kafka assigns
 * each partition to one of them, so every event is handled once (per group). The offset is
 * committed after the handler, so delivery is at least once — `email_deliveries` dedupes.
 */
@Injectable()
export class AuthEventsConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AuthEventsConsumer.name);
  private readonly consumer: Consumer;

  constructor(private readonly delivery: DeliveryService) {
    this.consumer = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
    }).consumer({ groupId: config.kafka.groupId });
  }

  async onModuleInit() {
    await this.consumer.connect();
    // A new group starts at the end: old sign-ups must not get emails now.
    await this.consumer.subscribe({
      topics: [AUTH_EVENTS_TOPIC],
      fromBeginning: false,
    });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;
        const event = JSON.parse(
          message.value.toString(),
        ) as DomainEvent<unknown>;
        try {
          await handleAuthEvent(event, this.delivery);
        } catch (error) {
          this.logger.error(
            `Failed to handle ${event.eventType} (${event.eventId}) from ${topic}[${partition}]@${message.offset}`,
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
