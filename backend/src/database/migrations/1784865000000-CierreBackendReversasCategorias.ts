import { MigrationInterface, QueryRunner } from "typeorm";

export class CierreBackendReversasCategorias1784865000000
  implements MigrationInterface
{
  name = "CierreBackendReversasCategorias1784865000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "movimientos"
      SET
        "tipo" = 'modificacion',
        "modulo" = COALESCE("modulo", 'solicitudes'),
        "accion" = COALESCE("accion", 'revertir'),
        "observacion" = COALESCE(
          "observacion",
          'Reversión registrada como modificación.'
        )
      WHERE "tipo" = 'reversa'
    `);

    await queryRunner.query(`
      INSERT INTO "categorias" (
        "nombre",
        "descripcion",
        "estado"
      )
      SELECT
        'Sin categoría',
        'Categoría base para productos que quedan sin categoría asignada.',
        'activa'
      WHERE NOT EXISTS (
        SELECT 1
        FROM "categorias"
        WHERE LOWER(TRIM("nombre")) = 'sin categoría'
      )
    `);

    await queryRunner.query(`
      UPDATE "categorias"
      SET "estado" = 'activa'
      WHERE LOWER(TRIM("nombre")) = 'sin categoría'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No se revierten datos históricos normalizados.
  }
}
