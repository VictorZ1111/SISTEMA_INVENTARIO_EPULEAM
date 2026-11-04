import { MigrationInterface, QueryRunner } from "typeorm";

export class SepararAuditoriaAdministrativa1784857000000
  implements MigrationInterface
{
  name = "SepararAuditoriaAdministrativa1784857000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auditorias_administrativas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "modulo" character varying(50) NOT NULL,
        "accion" character varying(50) NOT NULL,
        "registro_id" uuid NOT NULL,
        "descripcion" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_AUDITORIAS_ADMINISTRATIVAS"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_AUDITORIAS_ADMIN_USUARIO"
          FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_AUDITORIAS_ADMIN_MODULO"
       ON "auditorias_administrativas" ("modulo")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_AUDITORIAS_ADMIN_REGISTRO"
       ON "auditorias_administrativas" ("registro_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_AUDITORIAS_ADMIN_USUARIO"
       ON "auditorias_administrativas" ("usuario_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_AUDITORIAS_ADMIN_FECHA"
       ON "auditorias_administrativas" ("created_at")`,
    );

    await queryRunner.query(`
      INSERT INTO "auditorias_administrativas" (
        "usuario_id",
        "modulo",
        "accion",
        "registro_id",
        "descripcion",
        "created_at"
      )
      SELECT
        "usuario_id",
        "modulo",
        "accion",
        "registro_id",
        COALESCE("observacion", 'Modificación administrativa'),
        "created_at"
      FROM "movimientos"
      WHERE "tipo" = 'modificacion'
        AND "modulo" IN (
          'usuarios',
          'bodegas',
          'categorias',
          'asignaciones'
        )
        AND "registro_id" IS NOT NULL
    `);

    await queryRunner.query(`
      DELETE FROM "movimientos"
      WHERE "tipo" = 'modificacion'
        AND "modulo" IN (
          'usuarios',
          'bodegas',
          'categorias',
          'asignaciones'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "movimientos" (
        "tipo",
        "producto_id",
        "bodega_origen_id",
        "bodega_destino_id",
        "usuario_id",
        "solicitud_id",
        "solicitud_detalle_id",
        "movimiento_original_id",
        "modulo",
        "accion",
        "registro_id",
        "cantidad",
        "cantidad_anterior",
        "cantidad_nueva",
        "observacion",
        "created_at"
      )
      SELECT
        'modificacion',
        NULL,
        NULL,
        NULL,
        "usuario_id",
        NULL,
        NULL,
        NULL,
        "modulo",
        "accion",
        "registro_id",
        0,
        NULL,
        NULL,
        "descripcion",
        "created_at"
      FROM "auditorias_administrativas"
    `);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_AUDITORIAS_ADMIN_FECHA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AUDITORIAS_ADMIN_USUARIO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AUDITORIAS_ADMIN_REGISTRO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AUDITORIAS_ADMIN_MODULO"`,
    );
    await queryRunner.query(
      `DROP TABLE "auditorias_administrativas"`,
    );
  }
}
