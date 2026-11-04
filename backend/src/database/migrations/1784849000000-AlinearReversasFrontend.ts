import { MigrationInterface, QueryRunner } from "typeorm";

export class AlinearReversasFrontend1784849000000
  implements MigrationInterface
{
  name = "AlinearReversasFrontend1784849000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tipo_movimiento_enum"
       ADD VALUE IF NOT EXISTS 'modificacion'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."tipo_movimiento_enum"
       ADD VALUE IF NOT EXISTS 'baja'`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD COLUMN "movimiento_original_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD CONSTRAINT "FK_MOVIMIENTOS_ORIGINAL"
       FOREIGN KEY ("movimiento_original_id")
       REFERENCES "movimientos"("id")
       ON DELETE RESTRICT
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_MOVIMIENTOS_ORIGINAL"
       ON "movimientos" ("movimiento_original_id")
       WHERE "movimiento_original_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_MOVIMIENTOS_ORIGINAL"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP CONSTRAINT "FK_MOVIMIENTOS_ORIGINAL"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "movimiento_original_id"`,
    );
  }
}
