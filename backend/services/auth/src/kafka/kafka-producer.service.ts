import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { DomainEvent } from '@app/contracts';
import { Kafka, type Producer } from 'kafkajs';
import { config } from '../config.js';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
  }).producer({ idempotent: true });

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log(`Connected to Kafka (${config.kafka.brokers.join(',')})`);
  }

  async onApplicationShutdown() {
    await this.producer.disconnect();
  }

  /** Publishes an event keyed by its aggregate id, so events of one aggregate stay ordered. */
  async publish<T>(topic: string, event: DomainEvent<T>): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          key: event.aggregateId,
          value: JSON.stringify(event),
          headers: { eventType: event.eventType },
        },
      ],
    });
  }
}
