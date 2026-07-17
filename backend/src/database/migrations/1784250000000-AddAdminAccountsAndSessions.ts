import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAccountsAndSessions1784250000000 implements MigrationInterface {
  name = 'AddAdminAccountsAndSessions1784250000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "admin_accounts" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "login_id" character varying(100) NOT NULL,
      "name" character varying(100) NOT NULL,
      "password_hash" character varying(255) NOT NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "last_login_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_admin_accounts_login_id" UNIQUE ("login_id"),
      CONSTRAINT "PK_admin_accounts" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE TABLE "admin_sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "token_hash" character varying(64) NOT NULL,
      "account_id" uuid NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "revoked_at" TIMESTAMP WITH TIME ZONE,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_admin_sessions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_admin_sessions_account" FOREIGN KEY ("account_id") REFERENCES "admin_accounts"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_admin_sessions_token_hash" ON "admin_sessions" ("token_hash")`);
    await queryRunner.query(`CREATE INDEX "IDX_admin_sessions_account_id" ON "admin_sessions" ("account_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin_sessions"`);
    await queryRunner.query(`DROP TABLE "admin_accounts"`);
  }
}
