import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  async comprobarEstado() {
    try {
      await this.dataSource.query("SELECT 1");

      return {
        status: "ok",
        backend: "connected",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        backend: "connected",
        database: "disconnected",
        message: "No se pudo establecer conexión con PostgreSQL.",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
