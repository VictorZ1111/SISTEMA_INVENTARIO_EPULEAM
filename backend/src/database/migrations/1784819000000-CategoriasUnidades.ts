import { MigrationInterface, QueryRunner } from "typeorm";

export class CategoriasUnidades1784819000000
  implements MigrationInterface
{
  name = "CategoriasUnidades1784819000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_categoria_enum" AS ENUM('activa', 'inactiva')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estado_unidad_enum" AS ENUM('activa', 'inactiva')`,
    );

    await queryRunner.query(`
      CREATE TABLE "categorias" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(100) NOT NULL,
        "descripcion" character varying(255),
        "estado" "public"."estado_categoria_enum" NOT NULL DEFAULT 'activa',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_CATEGORIAS_NOMBRE" UNIQUE ("nombre"),
        CONSTRAINT "PK_CATEGORIAS" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "unidades" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(80) NOT NULL,
        "abreviatura" character varying(15) NOT NULL,
        "estado" "public"."estado_unidad_enum" NOT NULL DEFAULT 'activa',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_UNIDADES_NOMBRE" UNIQUE ("nombre"),
        CONSTRAINT "UQ_UNIDADES_ABREVIATURA" UNIQUE ("abreviatura"),
        CONSTRAINT "PK_UNIDADES" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_CATEGORIAS_NOMBRE_NORMALIZADO" ON "categorias" (LOWER(TRIM("nombre")))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_UNIDADES_NOMBRE_NORMALIZADO" ON "unidades" (LOWER(TRIM("nombre")))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_UNIDADES_ABREVIATURA_NORMALIZADA" ON "unidades" (LOWER(TRIM("abreviatura")))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_UNIDADES_ABREVIATURA_NORMALIZADA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_UNIDADES_NOMBRE_NORMALIZADO"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_CATEGORIAS_NOMBRE_NORMALIZADO"`,
    );
    await queryRunner.query(`DROP TABLE "unidades"`);
    await queryRunner.query(`DROP TABLE "categorias"`);
    await queryRunner.query(
      `DROP TYPE "public"."estado_unidad_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."estado_categoria_enum"`,
    );
  }
}
