import { MigrationInterface, QueryRunner } from "typeorm";

/** Excepciones con vencimiento automático; no modifican el estado permanente. */
export class ExcepcionesTemporalesAcceso1794470000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "acceso_temporal_permitido" boolean NULL`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "acceso_temporal_hasta" timestamptz NULL`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "acceso_temporal_hasta"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "acceso_temporal_permitido"`);
  }
}
