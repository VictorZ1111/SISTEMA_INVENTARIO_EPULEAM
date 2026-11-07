import { MigrationInterface, QueryRunner } from "typeorm";

export class StockSupervisorDevoluciones1784870000000
  implements MigrationInterface
{
  name = "StockSupervisorDevoluciones1784870000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."tipo_bodega_enum"
      RENAME TO "tipo_bodega_enum_anterior"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."tipo_bodega_enum"
      AS ENUM(
        'inventario_general',
        'principal',
        'sucursal',
        'stock_supervisor'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "bodegas"
      ALTER COLUMN "tipo"
      TYPE "public"."tipo_bodega_enum"
      USING "tipo"::text::"public"."tipo_bodega_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."tipo_bodega_enum_anterior"
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."tipo_movimiento_enum"
      RENAME TO "tipo_movimiento_enum_anterior"
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."tipo_movimiento_enum"
      AS ENUM(
        'entrada',
        'transferencia',
        'salida',
        'ajuste',
        'reversa',
        'modificacion',
        'baja',
        'devolucion'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "movimientos"
      ALTER COLUMN "tipo"
      TYPE "public"."tipo_movimiento_enum"
      USING "tipo"::text::"public"."tipo_movimiento_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."tipo_movimiento_enum_anterior"
    `);

    await queryRunner.query(`
      ALTER TABLE "bodegas"
      ADD COLUMN "supervisor_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "bodegas"
      ADD CONSTRAINT "FK_BODEGAS_SUPERVISOR"
      FOREIGN KEY ("supervisor_id")
      REFERENCES "usuarios"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_BODEGAS_SUPERVISOR"
      ON "bodegas" ("supervisor_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_BODEGAS_STOCK_SUPERVISOR_AREA"
      ON "bodegas" ("supervisor_id", "bodega_padre_id")
      WHERE "tipo" = 'stock_supervisor'
    `);

    await queryRunner.query(`
      INSERT INTO "bodegas" (
        "id",
        "nombre",
        "descripcion",
        "tipo",
        "estado",
        "es_sistema",
        "bodega_padre_id",
        "supervisor_id",
        "created_at",
        "updated_at"
      )
      SELECT
        uuid_generate_v4(),
        CONCAT('Stock Supervisor ', usuario."id", ' ', bodega."id"),
        CONCAT('Stock interno de ', usuario."nombre", ' para ', bodega."nombre", '.'),
        'stock_supervisor',
        'activa',
        true,
        bodega."id",
        usuario."id",
        NOW(),
        NOW()
      FROM "usuario_bodega" asignacion
      INNER JOIN "usuarios" usuario
        ON usuario."id" = asignacion."usuario_id"
      INNER JOIN "bodegas" bodega
        ON bodega."id" = asignacion."bodega_id"
      WHERE
        usuario."rol" = 'supervisor'
        AND asignacion."tipo_asignacion" = 'supervisor'
        AND bodega."tipo" = 'principal'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "bodegas"
      WHERE "tipo" = 'stock_supervisor'
        AND NOT EXISTS (
          SELECT 1
          FROM "existencias"
          WHERE "existencias"."bodega_id" = "bodegas"."id"
            AND "existencias"."cantidad" > 0
        )
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."UQ_BODEGAS_STOCK_SUPERVISOR_AREA"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_BODEGAS_SUPERVISOR"
    `);

    await queryRunner.query(`
      ALTER TABLE "bodegas"
      DROP CONSTRAINT IF EXISTS "FK_BODEGAS_SUPERVISOR"
    `);

    await queryRunner.query(`
      ALTER TABLE "bodegas"
      DROP COLUMN IF EXISTS "supervisor_id"
    `);

    // Los nuevos valores de los ENUM se conservan para no invalidar historial.
  }
}
