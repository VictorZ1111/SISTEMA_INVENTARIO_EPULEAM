import { MigrationInterface, QueryRunner } from "typeorm";

export class AlinearProductoInventarioFrontend1784861000000
  implements MigrationInterface
{
  name = "AlinearProductoInventarioFrontend1784861000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'estado_bien_producto_enum'
        ) THEN
          CREATE TYPE "public"."estado_bien_producto_enum"
            AS ENUM('bueno', 'regular', 'malo', 'baja');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "productos"
        ADD COLUMN IF NOT EXISTS "serie" character varying(120) NOT NULL DEFAULT 'S/N',
        ADD COLUMN IF NOT EXISTS "modelo" character varying(120) NOT NULL DEFAULT 'No aplica',
        ADD COLUMN IF NOT EXISTS "marca" character varying(120) NOT NULL DEFAULT 'S/M',
        ADD COLUMN IF NOT EXISTS "material" character varying(120) NOT NULL DEFAULT 'No especifica',
        ADD COLUMN IF NOT EXISTS "color" character varying(80) NOT NULL DEFAULT 'No especifica',
        ADD COLUMN IF NOT EXISTS "dimensiones" character varying(120) NOT NULL DEFAULT 'No especifica',
        ADD COLUMN IF NOT EXISTS "estado_bien" "public"."estado_bien_producto_enum" NOT NULL DEFAULT 'bueno',
        ADD COLUMN IF NOT EXISTS "ubicacion" character varying(150),
        ADD COLUMN IF NOT EXISTS "custodio_actual" character varying(120),
        ADD COLUMN IF NOT EXISTS "procedencia" character varying(150),
        ADD COLUMN IF NOT EXISTS "codigo_uleam" character varying(60),
        ADD COLUMN IF NOT EXISTS "unidad" character varying(60) NOT NULL DEFAULT 'Unidad',
        ADD COLUMN IF NOT EXISTS "observacion" character varying(500),
        ADD COLUMN IF NOT EXISTS "fecha_registro" date NOT NULL DEFAULT CURRENT_DATE
    `);

    await queryRunner.query(`
      UPDATE "productos"
      SET "codigo_uleam" = "codigo"
      WHERE "codigo_uleam" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "productos"
        DROP COLUMN IF EXISTS "fecha_registro",
        DROP COLUMN IF EXISTS "observacion",
        DROP COLUMN IF EXISTS "unidad",
        DROP COLUMN IF EXISTS "codigo_uleam",
        DROP COLUMN IF EXISTS "procedencia",
        DROP COLUMN IF EXISTS "custodio_actual",
        DROP COLUMN IF EXISTS "ubicacion",
        DROP COLUMN IF EXISTS "estado_bien",
        DROP COLUMN IF EXISTS "dimensiones",
        DROP COLUMN IF EXISTS "color",
        DROP COLUMN IF EXISTS "material",
        DROP COLUMN IF EXISTS "marca",
        DROP COLUMN IF EXISTS "modelo",
        DROP COLUMN IF EXISTS "serie"
    `);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."estado_bien_producto_enum"`,
    );
  }
}
