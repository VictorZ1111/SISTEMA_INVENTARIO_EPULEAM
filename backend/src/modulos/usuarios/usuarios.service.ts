import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { createHmac } from "node:crypto";
import { MoreThan, Repository } from "typeorm";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Existencia } from "../inventario/entities/existencia.entity";

import { ActualizarUsuarioDto } from "./dto/actualizar-usuario.dto";
import { CrearUsuarioDto } from "./dto/crear-usuario.dto";
import { EstadoUsuario } from "./enums/estado-usuario.enum";
import { RolUsuario } from "./enums/rol-usuario.enum";
import { Usuario } from "./entities/usuario.entity";

export interface UsuarioPublico {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: RolUsuario;
  estado: EstadoUsuario;
  esAdministradorGeneral: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsuariosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsuariosService.name);
  private readonly rondasBcrypt = 12;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    private readonly configService: ConfigService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.asegurarAdministradorGeneral();
  }

  normalizarCorreo(correo: string): string {
    return correo.trim().toLowerCase();
  }

  normalizarCodigo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }

  crearHuellaCodigo(codigo: string): string {
    const pepper =
      this.configService.getOrThrow<string>("ACCESS_CODE_PEPPER");

    return createHmac("sha256", pepper)
      .update(this.normalizarCodigo(codigo))
      .digest("hex");
  }

  async crearHashCodigo(codigo: string): Promise<string> {
    return bcrypt.hash(this.normalizarCodigo(codigo), this.rondasBcrypt);
  }

  async compararCodigo(codigo: string, hash: string): Promise<boolean> {
    return bcrypt.compare(this.normalizarCodigo(codigo), hash);
  }

  async buscarParaAutenticacion(
    correo: string,
    codigo: string,
  ): Promise<Usuario | null> {
    const correoNormalizado = this.normalizarCorreo(correo);
    const huella = this.crearHuellaCodigo(codigo);

    return this.usuariosRepository
      .createQueryBuilder("usuario")
      .addSelect("usuario.codigoAccesoHash")
      .addSelect("usuario.codigoAccesoBusqueda")
      .where("LOWER(usuario.correo) = :correo", {
        correo: correoNormalizado,
      })
      .andWhere("usuario.codigoAccesoBusqueda = :huella", { huella })
      .andWhere("usuario.estado = :estado", {
        estado: EstadoUsuario.ACTIVO,
      })
      .getOne();
  }

  async buscarActivoPorId(id: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: {
        id,
        estado: EstadoUsuario.ACTIVO,
      },
    });
  }

  async listar(): Promise<UsuarioPublico[]> {
    const usuarios = await this.usuariosRepository.find({
      order: {
        nombre: "ASC",
        createdAt: "ASC",
      },
    });

    return usuarios.map((usuario) => this.convertirAPublico(usuario));
  }

  async buscarPublicoPorId(id: string): Promise<UsuarioPublico> {
    const usuario = await this.obtenerPorId(id);
    return this.convertirAPublico(usuario);
  }

  async crear(dto: CrearUsuarioDto, actor: UsuarioAutenticado): Promise<UsuarioPublico> {
    await this.validarCodigoDisponible(dto.codigoAcceso);

    const usuario = this.usuariosRepository.create({
      nombre: dto.nombre.trim(),
      correo: this.obtenerCorreoPorRol(dto.rol),
      telefono: this.normalizarTelefono(dto.telefono),
      codigoAccesoHash: await this.crearHashCodigo(dto.codigoAcceso),
      codigoAccesoBusqueda: this.crearHuellaCodigo(dto.codigoAcceso),
      rol: dto.rol,
      estado: EstadoUsuario.ACTIVO,
      esAdministradorGeneral: false,
    });

    const guardado = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "usuarios",
      accion: "crear",
      registroId: guardado.id,
      descripcion: `Creación del usuario ${guardado.nombre} (${guardado.rol}).`,
    });
    return this.convertirAPublico(guardado);
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    actor: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    const usuario = await this.obtenerPorId(id);
    this.validarNoAdministradorGeneral(usuario);

    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre.trim();
    }

    if (dto.telefono !== undefined) {
      usuario.telefono = this.normalizarTelefono(dto.telefono);
    }

    if (
      dto.rol !== undefined &&
      usuario.rol === RolUsuario.SUPERVISOR &&
      dto.rol !== RolUsuario.SUPERVISOR
    ) {
      await this.validarSupervisorSinStock(usuario.id);
    }

    if (dto.rol !== undefined) {
      usuario.rol = dto.rol;
      usuario.correo = this.obtenerCorreoPorRol(dto.rol);
    }

    const guardado = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "usuarios",
      accion: "editar",
      registroId: guardado.id,
      descripcion: `Edición del usuario ${guardado.nombre}.`,
    });
    return this.convertirAPublico(guardado);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoUsuario,
    actor: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    const usuario = await this.obtenerPorId(id);
    this.validarNoAdministradorGeneral(usuario);

    if (
      usuario.rol === RolUsuario.SUPERVISOR &&
      estado === EstadoUsuario.INACTIVO
    ) {
      await this.validarSupervisorSinStock(usuario.id);
    }

    usuario.estado = estado;

    const guardado = await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "usuarios",
      accion: estado === EstadoUsuario.ACTIVO ? "activar" : "inactivar",
      registroId: guardado.id,
      descripcion: `${estado === EstadoUsuario.ACTIVO ? "Activación" : "Inactivación"} del usuario ${guardado.nombre}.`,
    });
    return this.convertirAPublico(guardado);
  }

  async eliminar(id: string): Promise<{ message: string }> {
    const usuario = await this.obtenerPorId(id);
    this.validarNoAdministradorGeneral(usuario);

    if (usuario.rol === RolUsuario.SUPERVISOR) {
      await this.validarSupervisorSinStock(usuario.id);
    }

    await this.usuariosRepository.remove(usuario);

    return {
      message: "Usuario eliminado correctamente.",
    };
  }

  async restablecerCodigo(
    id: string,
    nuevoCodigo: string,
    codigoAdministradorGeneral: string,
    actor: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    const usuario = await this.obtenerPorId(id);
    this.validarNoAdministradorGeneral(usuario);

    await this.validarAutorizacionAdministradorGeneral(
      codigoAdministradorGeneral,
    );
    await this.validarCodigoDisponible(nuevoCodigo, usuario.id);

    usuario.codigoAccesoHash = await this.crearHashCodigo(nuevoCodigo);
    usuario.codigoAccesoBusqueda = this.crearHuellaCodigo(nuevoCodigo);

    await this.usuariosRepository.save(usuario);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "usuarios",
      accion: "restablecer_codigo",
      registroId: usuario.id,
      descripcion: `Restablecimiento del código de acceso del usuario ${usuario.nombre}.`,
    });

    return {
      message: "Código de acceso actualizado correctamente.",
    };
  }

  convertirAPublico(usuario: Usuario): UsuarioPublico {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      rol: usuario.rol,
      estado: usuario.estado,
      esAdministradorGeneral: usuario.esAdministradorGeneral,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
  }

  private async obtenerPorId(id: string): Promise<Usuario> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException("El usuario solicitado no existe.");
    }

    return usuario;
  }

  private async validarSupervisorSinStock(
    supervisorId: string,
  ): Promise<void> {
    const stocks = await this.bodegasRepository.find({
      where: {
        tipo: TipoBodega.STOCK_SUPERVISOR,
        supervisorId,
      },
      select: {
        id: true,
      },
    });

    if (stocks.length === 0) {
      return;
    }

    const existenciasPendientes = await this.existenciasRepository.count({
      where: stocks.map((stock) => ({
        bodegaId: stock.id,
        cantidad: MoreThan(0),
      })),
    });

    if (existenciasPendientes > 0) {
      throw new ConflictException(
        "No se puede inactivar, eliminar ni cambiar el rol de este Supervisor mientras tenga productos en stock. Debe distribuirlos o devolverlos al Inventario General.",
      );
    }
  }

  private obtenerCorreoPorRol(rol: RolUsuario): string {
    const correos: Record<RolUsuario, string> = {
      [RolUsuario.ADMINISTRADOR]: "administrador@epuleam.com",
      [RolUsuario.SUPERVISOR]: "supervisor@epuleam.com",
      [RolUsuario.RESPONSABLE]: "responsable@epuleam.com",
    };

    return correos[rol];
  }

  private normalizarTelefono(telefono?: string): string | null {
    const valor = telefono?.trim();
    return valor ? valor : null;
  }

  private validarNoAdministradorGeneral(usuario: Usuario): void {
    if (usuario.esAdministradorGeneral) {
      throw new ForbiddenException(
        "El Administrador General está protegido y no puede modificarse.",
      );
    }
  }

  private async validarCodigoDisponible(
    codigo: string,
    usuarioExcluidoId?: string,
  ): Promise<void> {
    const huella = this.crearHuellaCodigo(codigo);

    const consulta = this.usuariosRepository
      .createQueryBuilder("usuario")
      .where("usuario.codigoAccesoBusqueda = :huella", { huella });

    if (usuarioExcluidoId) {
      consulta.andWhere("usuario.id <> :usuarioExcluidoId", {
        usuarioExcluidoId,
      });
    }

    const cantidad = await consulta.getCount();

    if (cantidad > 0) {
      throw new ConflictException(
        "Ya existe un usuario con ese código de acceso.",
      );
    }
  }

  private async validarAutorizacionAdministradorGeneral(
    codigo: string,
  ): Promise<void> {
    const administradorGeneral = await this.usuariosRepository
      .createQueryBuilder("usuario")
      .addSelect("usuario.codigoAccesoHash")
      .where("usuario.esAdministradorGeneral = :protegido", {
        protegido: true,
      })
      .andWhere("usuario.estado = :estado", {
        estado: EstadoUsuario.ACTIVO,
      })
      .getOne();

    if (!administradorGeneral?.codigoAccesoHash) {
      throw new BadRequestException(
        "No se encontró un Administrador General activo.",
      );
    }

    const valido = await this.compararCodigo(
      codigo,
      administradorGeneral.codigoAccesoHash,
    );

    if (!valido) {
      throw new ForbiddenException(
        "El código del Administrador General es incorrecto.",
      );
    }
  }

  private async asegurarAdministradorGeneral(): Promise<void> {
    const existente = await this.usuariosRepository.findOne({
      where: { esAdministradorGeneral: true },
    });

    if (existente) {
      if (
        existente.estado !== EstadoUsuario.ACTIVO ||
        existente.rol !== RolUsuario.ADMINISTRADOR
      ) {
        existente.estado = EstadoUsuario.ACTIVO;
        existente.rol = RolUsuario.ADMINISTRADOR;
        await this.usuariosRepository.save(existente);
      }

      return;
    }

    const nombre =
      this.configService.getOrThrow<string>("ADMIN_GENERAL_NAME").trim();
    const correo = this.normalizarCorreo(
      this.configService.getOrThrow<string>("ADMIN_GENERAL_EMAIL"),
    );
    const codigo =
      this.configService.getOrThrow<string>("ADMIN_GENERAL_CODE");

    await this.validarCodigoDisponible(codigo);

    const administradorGeneral = this.usuariosRepository.create({
      nombre,
      correo,
      telefono: null,
      codigoAccesoHash: await this.crearHashCodigo(codigo),
      codigoAccesoBusqueda: this.crearHuellaCodigo(codigo),
      rol: RolUsuario.ADMINISTRADOR,
      estado: EstadoUsuario.ACTIVO,
      esAdministradorGeneral: true,
    });

    await this.usuariosRepository.save(administradorGeneral);

    this.logger.log(
      "Administrador General creado correctamente en PostgreSQL.",
    );
  }
}
