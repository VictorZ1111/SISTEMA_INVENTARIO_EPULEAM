import { MigrationInterface, QueryRunner } from "typeorm";

export class AbastecimientoSolicitudesVinculadas1794440000000 implements MigrationInterface {
  name = "AbastecimientoSolicitudesVinculadas1794440000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "solicitudes" ADD COLUMN "solicitud_origen_id" uuid NULL`);
    await queryRunner.query(`ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_SOLICITUD_ORIGEN" FOREIGN KEY ("solicitud_origen_id") REFERENCES "solicitudes"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE INDEX "IDX_SOLICITUDES_ORIGEN" ON "solicitudes"("solicitud_origen_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_SOLICITUDES_ORIGEN"`);
    await queryRunner.query(`ALTER TABLE "solicitudes" DROP CONSTRAINT "FK_SOLICITUD_ORIGEN"`);
    await queryRunner.query(`ALTER TABLE "solicitudes" DROP COLUMN "solicitud_origen_id"`);
  }
}
