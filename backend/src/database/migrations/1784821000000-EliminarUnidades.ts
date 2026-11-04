import { MigrationInterface, QueryRunner } from "typeorm";

export class EliminarUnidades1784821000000
  implements MigrationInterface
{
  name = "EliminarUnidades1784821000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "unidades"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."estado_unidad_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."estado_unidad_enum" AS ENUM('activa', 'inactiva')`,
    );

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
      `CREATE UNIQUE INDEX "IDX_UNIDADES_NOMBRE_NORMALIZADO" ON "unidades" (LOWER(TRIM("nombre")))`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_UNIDADES_ABREVIATURA_NORMALIZADA" ON "unidades" (LOWER(TRIM("abreviatura")))`,
    );
  }
}
