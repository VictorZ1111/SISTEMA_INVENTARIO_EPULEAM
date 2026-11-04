import { MigrationInterface, QueryRunner } from "typeorm";

export class AtencionSolicitudes1784841000000
  implements MigrationInterface
{
  name = "AtencionSolicitudes1784841000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "solicitudes" ADD "usuario_atencion_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "solicitudes" ADD "atendida_at" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `ALTER TABLE "solicitudes"
       ADD CONSTRAINT "FK_SOLICITUDES_USUARIO_ATENCION"
       FOREIGN KEY ("usuario_atencion_id")
       REFERENCES "usuarios"("id")
       ON DELETE RESTRICT
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos" ADD "solicitud_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos" ADD "solicitud_detalle_id" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD CONSTRAINT "FK_MOVIMIENTOS_SOLICITUD"
       FOREIGN KEY ("solicitud_id")
       REFERENCES "solicitudes"("id")
       ON DELETE RESTRICT
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       ADD CONSTRAINT "FK_MOVIMIENTOS_SOLICITUD_DETALLE"
       FOREIGN KEY ("solicitud_detalle_id")
       REFERENCES "solicitud_detalles"("id")
       ON DELETE RESTRICT
       ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_MOVIMIENTOS_SOLICITUD" ON "movimientos" ("solicitud_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MOVIMIENTOS_SOLICITUD"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP CONSTRAINT "FK_MOVIMIENTOS_SOLICITUD_DETALLE"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP CONSTRAINT "FK_MOVIMIENTOS_SOLICITUD"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "solicitud_detalle_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "movimientos"
       DROP COLUMN "solicitud_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "solicitudes"
       DROP CONSTRAINT "FK_SOLICITUDES_USUARIO_ATENCION"`,
    );

    await queryRunner.query(
      `ALTER TABLE "solicitudes"
       DROP COLUMN "atendida_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "solicitudes"
       DROP COLUMN "usuario_atencion_id"`,
    );
  }
}
