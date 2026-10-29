import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, type Message, type Producer } from 'kafkajs';

export interface KafkaOptions {
  clientId: string;
  brokers: string[];
}

export interface KafkaTopicMessages {
  topic: string;
  messages: Message[];
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

  /** Sends already serialized messages; order is kept per topic partition. */
  async sendBatch(topicMessages: KafkaTopicMessages[]): Promise<void> {
    await this.producer.sendBatch({ topicMessages });
  }
}
