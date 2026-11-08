import { MigrationInterface, QueryRunner } from "typeorm";

export class NormalizarGastronomiaTrazabilidad1784875000000
  implements MigrationInterface
{
  name = "NormalizarGastronomiaTrazabilidad1784875000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "bodegas"
      SET
        "nombre" = 'Gastronomía',
        "descripcion" = CASE
          WHEN "descripcion" ILIKE '%Gastronomía Tasty%'
            THEN REPLACE("descripcion", 'Gastronomía Tasty', 'Gastronomía')
          ELSE "descripcion"
        END,
        "updated_at" = NOW()
      WHERE "nombre" = 'Gastronomía Tasty'
        AND "tipo" = 'principal'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "bodegas"
      SET
        "nombre" = 'Gastronomía Tasty',
        "updated_at" = NOW()
      WHERE "nombre" = 'Gastronomía'
        AND "tipo" = 'principal'
    `);
  }
}
