import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditoriaAdministrativa1784853000000
  implements MigrationInterface
{
  name = "AuditoriaAdministrativa1784853000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ALTER COLUMN "producto_id" DROP NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD COLUMN "modulo" character varying(50)`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD COLUMN "accion" character varying(50)`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD COLUMN "registro_id" uuid`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_MODULO"
       ON "movimientos" ("modulo")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_REGISTRO"
       ON "movimientos" ("registro_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_REGISTRO"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_MODULO"`,
    );

    await queryRunner.query(
      `DELETE FROM "movimientos"
       WHERE "producto_id" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "registro_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "accion"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "modulo"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ALTER COLUMN "producto_id" SET NOT NULL`,
    );
  }
}
