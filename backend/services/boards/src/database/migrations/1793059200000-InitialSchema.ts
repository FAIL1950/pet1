import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793059200000 implements MigrationInterface {
  name = 'InitialSchema1793059200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "boards" ("id" uuid NOT NULL, "title" character varying(200) NOT NULL, "description" text, "version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_606923b0b068ef262dfdcd18f44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "columns" ("id" uuid NOT NULL, "board_id" uuid NOT NULL, "title" character varying(200) NOT NULL, "position" text COLLATE "C" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4ac339ccbbfed1dcd96812abbd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4a76339b019ce2f6d29be1670" ON "columns"  ("board_id", "position") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" text NOT NULL, "email" text NOT NULL, "name" text NOT NULL, "image" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."board_role" AS ENUM('OWNER', 'EDITOR', 'VIEWER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "board_members" ("board_id" uuid NOT NULL, "user_id" text NOT NULL, "role" "public"."board_role" NOT NULL, "added_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_159415b4beacf33c9393cfe673c" PRIMARY KEY ("board_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9989bac63c51805e59ce91a54" ON "board_members"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_board_members_owner" ON "board_members"  ("board_id") WHERE "role" = 'OWNER'`,
    );
    await queryRunner.query(
      `CREATE TABLE "cards" ("id" uuid NOT NULL, "board_id" uuid NOT NULL, "column_id" uuid NOT NULL, "title" character varying(500) NOT NULL, "description" text, "position" text COLLATE "C" NOT NULL, "created_by" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_98f2b644870026b55fc42b9ae3" ON "cards"  ("board_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5aad09f4e042654adab0e6349a" ON "cards"  ("column_id", "position") `,
    );
    await queryRunner.query(
      `ALTER TABLE "columns" ADD CONSTRAINT "FK_3f88407849daf390e93035b15ef" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD CONSTRAINT "FK_ca2c72a39c80199717012df3932" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD CONSTRAINT "FK_a9989bac63c51805e59ce91a541" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD CONSTRAINT "FK_98f2b644870026b55fc42b9ae32" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD CONSTRAINT "FK_ce7087ed72b4e5e5a0c72a8c5aa" FOREIGN KEY ("column_id") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" ADD CONSTRAINT "FK_79fbe121b19f7fb04d794ba97cb" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cards" DROP CONSTRAINT "FK_79fbe121b19f7fb04d794ba97cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" DROP CONSTRAINT "FK_ce7087ed72b4e5e5a0c72a8c5aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cards" DROP CONSTRAINT "FK_98f2b644870026b55fc42b9ae32"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP CONSTRAINT "FK_a9989bac63c51805e59ce91a541"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP CONSTRAINT "FK_ca2c72a39c80199717012df3932"`,
    );
    await queryRunner.query(
      `ALTER TABLE "columns" DROP CONSTRAINT "FK_3f88407849daf390e93035b15ef"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5aad09f4e042654adab0e6349a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_98f2b644870026b55fc42b9ae3"`,
    );
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_board_members_owner"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9989bac63c51805e59ce91a54"`,
    );
    await queryRunner.query(`DROP TABLE "board_members"`);
    await queryRunner.query(`DROP TYPE "public"."board_role"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4a76339b019ce2f6d29be1670"`,
    );
    await queryRunner.query(`DROP TABLE "columns"`);
    await queryRunner.query(`DROP TABLE "boards"`);
  }
}
