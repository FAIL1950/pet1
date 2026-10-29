import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { DomainEvent } from '@app/contracts';
import { Kafka, type Producer } from 'kafkajs';

export interface KafkaOptions {
  clientId: string;
  brokers: string[];
}

/** Provide with `{ provide: KAFKA_OPTIONS, useValue: config.kafka }` in each service module. */
export const KAFKA_OPTIONS = Symbol('KAFKA_OPTIONS');

@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;

  constructor(@Inject(KAFKA_OPTIONS) private readonly options: KafkaOptions) {
    this.producer = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
    }).producer({ idempotent: true });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log(`Connected to Kafka (${this.options.brokers.join(',')})`);
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
