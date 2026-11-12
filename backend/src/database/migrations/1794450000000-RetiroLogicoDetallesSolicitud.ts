import { MigrationInterface, QueryRunner } from "typeorm";

// Migración aditiva y no destructiva: conserva cada detalle y sus relaciones.
export class RetiroLogicoDetallesSolicitud1794450000000 implements MigrationInterface {
  name = "RetiroLogicoDetallesSolicitud1794450000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solicitud_detalles" ADD COLUMN "retirado" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Evitar que un rollback haga reaparecer bienes previamente retirados.
    const registros: Array<{ cantidad: string }> = await queryRunner.query(
      `SELECT COUNT(*)::text AS cantidad FROM "solicitud_detalles" WHERE "retirado" = true`,
    );
    if (Number(registros[0]?.cantidad ?? 0) > 0) {
      throw new Error("No se puede revertir esta migración mientras existan bienes retirados del pedido. Conserva el historial.");
    }
    await queryRunner.query(
      `ALTER TABLE "solicitud_detalles" DROP COLUMN "retirado"`,
    );
  }
}
