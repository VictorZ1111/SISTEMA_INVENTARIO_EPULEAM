import { MigrationInterface, QueryRunner } from "typeorm";

export class Solicitudes1784837000000
  implements MigrationInterface
{
  name = "Solicitudes1784837000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_solicitud_enum" AS ENUM('pendiente', 'parcial', 'atendida', 'rechazada')`,
    );

    await queryRunner.query(`
      CREATE TABLE "solicitudes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(40) NOT NULL,
        "usuario_solicitante_id" uuid NOT NULL,
        "bodega_solicitante_id" uuid NOT NULL,
        "estado" "public"."estado_solicitud_enum" NOT NULL DEFAULT 'pendiente',
        "observacion_solicitante" character varying(500),
        "observacion_atencion" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_SOLICITUDES_CODIGO" UNIQUE ("codigo"),
        CONSTRAINT "PK_SOLICITUDES" PRIMARY KEY ("id"),
        CONSTRAINT "FK_SOLICITUDES_USUARIO"
          FOREIGN KEY ("usuario_solicitante_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_SOLICITUDES_BODEGA"
          FOREIGN KEY ("bodega_solicitante_id")
          REFERENCES "bodegas"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "solicitud_detalles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitud_id" uuid NOT NULL,
        "producto_id" uuid NOT NULL,
        "cantidad_solicitada" integer NOT NULL,
        "cantidad_entregada" integer NOT NULL DEFAULT 0,
        "cantidad_rechazada" integer NOT NULL DEFAULT 0,
        "cantidad_pendiente" integer NOT NULL,
        CONSTRAINT "CHK_SOLICITUD_DETALLE_CANTIDADES"
          CHECK (
            "cantidad_solicitada" > 0
            AND "cantidad_entregada" >= 0
            AND "cantidad_rechazada" >= 0
            AND "cantidad_pendiente" >= 0
            AND (
              "cantidad_entregada"
              + "cantidad_rechazada"
              + "cantidad_pendiente"
            ) = "cantidad_solicitada"
          ),
        CONSTRAINT "UQ_SOLICITUD_DETALLE_PRODUCTO"
          UNIQUE ("solicitud_id", "producto_id"),
        CONSTRAINT "PK_SOLICITUD_DETALLES"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_SOLICITUD_DETALLES_SOLICITUD"
          FOREIGN KEY ("solicitud_id")
          REFERENCES "solicitudes"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_SOLICITUD_DETALLES_PRODUCTO"
          FOREIGN KEY ("producto_id")
          REFERENCES "productos"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUDES_USUARIO" ON "solicitudes" ("usuario_solicitante_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUDES_BODEGA" ON "solicitudes" ("bodega_solicitante_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUDES_ESTADO" ON "solicitudes" ("estado")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUDES_FECHA" ON "solicitudes" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUD_DETALLES_SOLICITUD" ON "solicitud_detalles" ("solicitud_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SOLICITUD_DETALLES_PRODUCTO" ON "solicitud_detalles" ("producto_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUD_DETALLES_PRODUCTO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUD_DETALLES_SOLICITUD"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUDES_FECHA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUDES_ESTADO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUDES_BODEGA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SOLICITUDES_USUARIO"`,
    );

    await queryRunner.query(`DROP TABLE "solicitud_detalles"`);
    await queryRunner.query(`DROP TABLE "solicitudes"`);
    await queryRunner.query(
      `DROP TYPE "public"."estado_solicitud_enum"`,
    );
  }
}
