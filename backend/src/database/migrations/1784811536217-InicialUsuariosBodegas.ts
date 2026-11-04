import { MigrationInterface, QueryRunner } from "typeorm";

export class InicialUsuariosBodegas1784811536217 implements MigrationInterface {
    name = 'InicialUsuariosBodegas1784811536217'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tipo_bodega_enum" AS ENUM('inventario_general', 'principal', 'sucursal')`);
        await queryRunner.query(`CREATE TYPE "public"."estado_bodega_enum" AS ENUM('activa', 'inactiva')`);
        await queryRunner.query(`CREATE TABLE "bodegas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(120) NOT NULL, "descripcion" character varying(255), "tipo" "public"."tipo_bodega_enum" NOT NULL, "estado" "public"."estado_bodega_enum" NOT NULL DEFAULT 'activa', "bodega_padre_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b28c5adff6f42b3ae75ff69b604" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_BODEGAS_NOMBRE" ON "bodegas"  ("nombre") `);
        await queryRunner.query(`CREATE TYPE "public"."rol_usuario_enum" AS ENUM('administrador', 'supervisor', 'responsable')`);
        await queryRunner.query(`CREATE TYPE "public"."estado_usuario_enum" AS ENUM('activo', 'inactivo')`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(120) NOT NULL, "correo" character varying(150) NOT NULL, "telefono" character varying(20), "codigo_acceso_hash" character varying(255) NOT NULL, "codigo_acceso_busqueda" character(64) NOT NULL, "rol" "public"."rol_usuario_enum" NOT NULL, "estado" "public"."estado_usuario_enum" NOT NULL DEFAULT 'activo', "es_administrador_general" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_USUARIOS_CODIGO_BUSQUEDA" ON "usuarios"  ("codigo_acceso_busqueda") `);
        await queryRunner.query(`CREATE INDEX "IDX_USUARIOS_CORREO_ROL" ON "usuarios"  ("correo", "rol") `);
        await queryRunner.query(`CREATE TYPE "public"."tipo_asignacion_enum" AS ENUM('supervisor', 'responsable')`);
        await queryRunner.query(`CREATE TABLE "usuario_bodega" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "usuario_id" uuid NOT NULL, "bodega_id" uuid NOT NULL, "tipo_asignacion" "public"."tipo_asignacion_enum" NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_54e10a4802188d7627ea1282610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_USUARIO_BODEGA_TIPO" ON "usuario_bodega"  ("usuario_id", "bodega_id", "tipo_asignacion") `);
        await queryRunner.query(`ALTER TABLE "bodegas" ADD CONSTRAINT "FK_2a5c91994f3b153d9b276503e1a" FOREIGN KEY ("bodega_padre_id") REFERENCES "bodegas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario_bodega" ADD CONSTRAINT "FK_3d048b81b66c5811c54387f4d8f" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuario_bodega" ADD CONSTRAINT "FK_8fe6893f3e82525c0cd2f515971" FOREIGN KEY ("bodega_id") REFERENCES "bodegas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuario_bodega" DROP CONSTRAINT "FK_8fe6893f3e82525c0cd2f515971"`);
        await queryRunner.query(`ALTER TABLE "usuario_bodega" DROP CONSTRAINT "FK_3d048b81b66c5811c54387f4d8f"`);
        await queryRunner.query(`ALTER TABLE "bodegas" DROP CONSTRAINT "FK_2a5c91994f3b153d9b276503e1a"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_USUARIO_BODEGA_TIPO"`);
        await queryRunner.query(`DROP TABLE "usuario_bodega"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_asignacion_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_USUARIOS_CORREO_ROL"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_USUARIOS_CODIGO_BUSQUEDA"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TYPE "public"."estado_usuario_enum"`);
        await queryRunner.query(`DROP TYPE "public"."rol_usuario_enum"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_BODEGAS_NOMBRE"`);
        await queryRunner.query(`DROP TABLE "bodegas"`);
        await queryRunner.query(`DROP TYPE "public"."estado_bodega_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tipo_bodega_enum"`);
    }

}
