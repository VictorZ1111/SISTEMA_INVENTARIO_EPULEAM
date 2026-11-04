import { MigrationInterface, QueryRunner } from "typeorm";

export class ReversasSolicitudes1784845000000
  implements MigrationInterface
{
  name = "ReversasSolicitudes1784845000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tipo_movimiento_enum" ADD VALUE IF NOT EXISTS 'reversa'`,
    );

    await queryRunner.query(`
      CREATE TABLE "reversas_solicitud" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "solicitud_id" uuid NOT NULL,
        "usuario_id" uuid NOT NULL,
        "motivo" character varying(500) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_REVERSAS_SOLICITUD"
          UNIQUE ("solicitud_id"),
        CONSTRAINT "PK_REVERSAS_SOLICITUD"
          PRIMARY KEY ("id"),
        CONSTRAINT "FK_REVERSAS_SOLICITUD"
          FOREIGN KEY ("solicitud_id")
          REFERENCES "solicitudes"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION,
        CONSTRAINT "FK_REVERSAS_USUARIO"
          FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id")
          ON DELETE RESTRICT
          ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_REVERSAS_USUARIO" ON "reversas_solicitud" ("usuario_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_REVERSAS_FECHA" ON "reversas_solicitud" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_REVERSAS_FECHA"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_REVERSAS_USUARIO"`,
    );
    await queryRunner.query(
      `DROP TABLE "reversas_solicitud"`,
    );
  }
}
