import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutbox1793145600000 implements MigrationInterface {
  name = 'AddOutbox1793145600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "outbox" ("id" uuid NOT NULL, "topic" text NOT NULL, "key" text NOT NULL, "event_type" text NOT NULL, "event" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(), CONSTRAINT "PK_outbox" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_outbox_order" ON "outbox" ("created_at", "id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_outbox_order"`);
    await queryRunner.query(`DROP TABLE "outbox"`);
  }
}
