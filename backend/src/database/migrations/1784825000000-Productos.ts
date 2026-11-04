import { MigrationInterface, QueryRunner } from "typeorm";

export class Productos1784825000000
  implements MigrationInterface
{
  name = "Productos1784825000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tipo_producto_enum" AS ENUM('consumible', 'no_consumible')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."atributo_producto_enum" AS ENUM('BLD', 'BCA')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."estado_producto_enum" AS ENUM('activo', 'inactivo')`,
    );

    await queryRunner.query(`
      CREATE TABLE "productos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "codigo" character varying(40) NOT NULL,
        "nombre" character varying(150) NOT NULL,
        "descripcion" character varying(500),
        "categoria_id" uuid NOT NULL,
        "tipo_producto" "public"."tipo_producto_enum" NOT NULL,
        "atributo" "public"."atributo_producto_enum",
        "estado" "public"."estado_producto_enum" NOT NULL DEFAULT 'activo',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_PRODUCTOS_CODIGO" UNIQUE ("codigo"),
        CONSTRAINT "PK_PRODUCTOS" PRIMARY KEY ("id"),
        CONSTRAINT "FK_PRODUCTOS_CATEGORIA"
          FOREIGN KEY ("categoria_id")
          REFERENCES "categorias"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "CHK_PRODUCTOS_ATRIBUTO"
          CHECK (
            ("tipo_producto" = 'consumible' AND "atributo" IS NULL)
            OR
            ("tipo_producto" = 'no_consumible')
          )
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_PRODUCTOS_CODIGO_NORMALIZADO" ON "productos" (LOWER(TRIM("codigo")))`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_PRODUCTOS_CATEGORIA" ON "productos" ("categoria_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_PRODUCTOS_TIPO" ON "productos" ("tipo_producto")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_PRODUCTOS_ESTADO" ON "productos" ("estado")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_PRODUCTOS_ESTADO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_PRODUCTOS_TIPO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_PRODUCTOS_CATEGORIA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_PRODUCTOS_CODIGO_NORMALIZADO"`,
    );

    await queryRunner.query(`DROP TABLE "productos"`);

    await queryRunner.query(
      `DROP TYPE "public"."estado_producto_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."atributo_producto_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."tipo_producto_enum"`,
    );
  }
}
