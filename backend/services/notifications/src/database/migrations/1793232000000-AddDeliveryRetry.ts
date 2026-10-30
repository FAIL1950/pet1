import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveryRetry1793232000000 implements MigrationInterface {
  name = 'AddDeliveryRetry1793232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_deliveries" ADD "payload" jsonb NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_deliveries" ADD "next_attempt_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_deliveries_due" ON "email_deliveries" ("status", "next_attempt_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_email_deliveries_due"`);
    await queryRunner.query(
      `ALTER TABLE "email_deliveries" DROP COLUMN "next_attempt_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_deliveries" DROP COLUMN "payload"`,
    );
  }
}
