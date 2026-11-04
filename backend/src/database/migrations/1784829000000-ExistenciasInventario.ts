import { MigrationInterface, QueryRunner } from "typeorm";

export class ExistenciasInventario1784829000000
  implements MigrationInterface
{
  name = "ExistenciasInventario1784829000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "existencias" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "producto_id" uuid NOT NULL,
        "bodega_id" uuid NOT NULL,
        "cantidad" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_EXISTENCIAS_CANTIDAD_NO_NEGATIVA"
          CHECK ("cantidad" >= 0),
        CONSTRAINT "UQ_EXISTENCIAS_PRODUCTO_BODEGA"
          UNIQUE ("producto_id", "bodega_id"),
        CONSTRAINT "PK_EXISTENCIAS"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_EXISTENCIAS_PRODUCTO"
          FOREIGN KEY ("producto_id")
          REFERENCES "productos"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_EXISTENCIAS_BODEGA"
          FOREIGN KEY ("bodega_id")
          REFERENCES "bodegas"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_EXISTENCIAS_PRODUCTO" ON "existencias" ("producto_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_EXISTENCIAS_BODEGA" ON "existencias" ("bodega_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_EXISTENCIAS_BODEGA"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_EXISTENCIAS_PRODUCTO"`,
    );

    await queryRunner.query(`DROP TABLE "existencias"`);
  }
}
