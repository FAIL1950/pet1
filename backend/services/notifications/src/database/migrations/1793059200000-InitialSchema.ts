import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793059200000 implements MigrationInterface {
  name = 'InitialSchema1793059200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."email_delivery_status" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_deliveries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "source_event_id" uuid NOT NULL, "kind" character varying(50) NOT NULL, "recipient" text NOT NULL, "status" "public"."email_delivery_status" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "last_error" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_email_deliveries_source_event_kind" UNIQUE ("source_event_id", "kind"), CONSTRAINT "PK_aa4e94683dafee7c55aaeb9f59d" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_deliveries"`);
    await queryRunner.query(`DROP TYPE "public"."email_delivery_status"`);
  }
}
