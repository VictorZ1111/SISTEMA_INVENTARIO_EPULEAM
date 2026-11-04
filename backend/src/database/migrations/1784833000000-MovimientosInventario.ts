import { MigrationInterface, QueryRunner } from "typeorm";

export class MovimientosInventario1784833000000
  implements MigrationInterface
{
  name = "MovimientosInventario1784833000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tipo_movimiento_enum" AS ENUM('entrada', 'transferencia', 'salida', 'ajuste')`,
    );

    await queryRunner.query(`
      CREATE TABLE "movimientos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tipo" "public"."tipo_movimiento_enum" NOT NULL,
        "producto_id" uuid NOT NULL,
        "bodega_origen_id" uuid,
        "bodega_destino_id" uuid,
        "usuario_id" uuid NOT NULL,
        "cantidad" integer NOT NULL,
        "cantidad_anterior" integer,
        "cantidad_nueva" integer,
        "observacion" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_MOVIMIENTOS_CANTIDAD_POSITIVA"
          CHECK ("cantidad" >= 0),
        CONSTRAINT "PK_MOVIMIENTOS"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_MOVIMIENTOS_PRODUCTO"
          FOREIGN KEY ("producto_id")
          REFERENCES "productos"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_MOVIMIENTOS_BODEGA_ORIGEN"
          FOREIGN KEY ("bodega_origen_id")
          REFERENCES "bodegas"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_MOVIMIENTOS_BODEGA_DESTINO"
          FOREIGN KEY ("bodega_destino_id")
          REFERENCES "bodegas"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_MOVIMIENTOS_USUARIO"
          FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_PRODUCTO" ON "movimientos" ("producto_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_BODEGA_ORIGEN" ON "movimientos" ("bodega_origen_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_BODEGA_DESTINO" ON "movimientos" ("bodega_destino_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_USUARIO" ON "movimientos" ("usuario_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_TIPO" ON "movimientos" ("tipo")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_FECHA" ON "movimientos" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_FECHA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_TIPO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_USUARIO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_BODEGA_DESTINO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_BODEGA_ORIGEN"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_PRODUCTO"`,
    );

    await queryRunner.query(`DROP TABLE "movimientos"`);
    await queryRunner.query(
      `DROP TYPE "public"."tipo_movimiento_enum"`,
    );
  }
}
