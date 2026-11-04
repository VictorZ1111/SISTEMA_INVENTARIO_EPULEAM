import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AsignacionesModule } from "./modulos/asignaciones/asignaciones.module";
import { AuthModule } from "./modulos/auth/auth.module";
import { BodegasModule } from "./modulos/bodegas/bodegas.module";
import { CategoriasModule } from "./modulos/categorias/categorias.module";
import { InventarioModule } from "./modulos/inventario/inventario.module";
import { MovimientosModule } from "./modulos/movimientos/movimientos.module";
import { ProductosModule } from "./modulos/productos/productos.module";
import { ReportesModule } from "./modulos/reportes/reportes.module";
import { SolicitudesModule } from "./modulos/solicitudes/solicitudes.module";
import { UsuariosModule } from "./modulos/usuarios/usuarios.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .default("development"),
        PORT: Joi.number().port().default(3000),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().default(5432),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),

        FRONTEND_URL: Joi.string().uri().required(),

        JWT_SECRET: Joi.string().min(64).required(),
        JWT_EXPIRES_IN: Joi.string().default("8h"),
        ACCESS_CODE_PEPPER: Joi.string().min(64).required(),

        ADMIN_GENERAL_NAME: Joi.string().min(3).max(120).required(),
        ADMIN_GENERAL_EMAIL: Joi.string().email().required(),
        ADMIN_GENERAL_CODE: Joi.string()
          .pattern(/^[A-Za-z]{2}\d{5}[^A-Za-z0-9]$/)
          .required(),
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.getOrThrow<string>("DB_HOST"),
        port: configService.getOrThrow<number>("DB_PORT"),
        username: configService.getOrThrow<string>("DB_USERNAME"),
        password: configService.getOrThrow<string>("DB_PASSWORD"),
        database: configService.getOrThrow<string>("DB_DATABASE"),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        logging:
          configService.get<string>("NODE_ENV") === "development"
            ? ["error", "warn"]
            : false,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),

    UsuariosModule,
    BodegasModule,
    AsignacionesModule,
    CategoriasModule,
    ProductosModule,
    InventarioModule,
    MovimientosModule,
    ReportesModule,
    SolicitudesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
