import { MigrationInterface, QueryRunner } from "typeorm";
/** Los usuarios existentes quedan sin restricciones hasta que el Administrador configure un horario. */
export class HorariosAccesoUsuarios1794460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "horario_acceso" jsonb NULL`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "horario_acceso"`);
  }
}
