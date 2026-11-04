import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataSource,
  In,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Producto } from "../productos/entities/producto.entity";
import { EstadoBienProducto } from "../productos/enums/estado-bien-producto.enum";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { FiltrarMovimientosDto } from "./dto/filtrar-movimientos.dto";
import { RegistrarAjusteDto } from "./dto/registrar-ajuste.dto";
import { RegistrarEntradaDto } from "./dto/registrar-entrada.dto";
import { RegistrarSalidaDto } from "./dto/registrar-salida.dto";
import { RegistrarTransferenciaDto } from "./dto/registrar-transferencia.dto";
import { Movimiento } from "./entities/movimiento.entity";
import { TipoMovimiento } from "./enums/tipo-movimiento.enum";

export interface MovimientoPublico {
  id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  cantidadAnterior: number | null;
  cantidadNueva: number | null;
  observacion: string | null;
  createdAt: Date;
  solicitudId: string | null;
  solicitudDetalleId: string | null;
  movimientoOriginalId: string | null;
  modulo: string | null;
  accion: string | null;
  registroId: string | null;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
  bodegaOrigen: {
    id: string;
    nombre: string;
  } | null;
  bodegaDestino: {
    id: string;
    nombre: string;
  } | null;
  usuario: {
    id: string;
    nombre: string;
    rol: RolUsuario;
  };
}

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(Movimiento)
    private readonly movimientosRepository: Repository<Movimiento>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    @InjectRepository(UsuarioBodega)
    private readonly asignacionesRepository: Repository<UsuarioBodega>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(
    filtros: FiltrarMovimientosDto,
  ): Promise<MovimientoPublico[]> {
    const movimientos = await this.aplicarFiltros(
      this.crearConsultaBase(),
      filtros,
    )
      .orderBy("movimiento.createdAt", "DESC")
      .getMany();

    return movimientos.map((movimiento) =>
      this.convertirAPublico(movimiento),
    );
  }

  async listarMios(
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico[]> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return this.listar({});
    }

    const bodegaIds = await this.obtenerBodegasAsignadas(
      usuario.id,
    );

    if (bodegaIds.length === 0) {
      return [];
    }

    const movimientos = await this.crearConsultaBase()
      .where(
        `(movimiento.bodegaOrigenId IN (:...bodegaIds) OR movimiento.bodegaDestinoId IN (:...bodegaIds))`,
        { bodegaIds },
      )
      .orderBy("movimiento.createdAt", "DESC")
      .getMany();

    return movimientos.map((movimiento) =>
      this.convertirAPublico(movimiento),
    );
  }

  async registrarEntrada(
    dto: RegistrarEntradaDto,
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    const producto = await this.obtenerProducto(dto.productoId);
    const destino = await this.obtenerBodega(dto.bodegaDestinoId);

    this.validarProductoActivo(producto);
    this.validarBodegaActiva(destino);

    if (
      destino.tipo !== TipoBodega.INVENTARIO_GENERAL ||
      destino.nombre !== "Inventario General"
    ) {
      throw new ConflictException(
        "Las entradas externas solo pueden registrarse en Inventario General.",
      );
    }

    const movimientoId = await this.dataSource.transaction(
      async (administrador) => {
        const existencias = administrador.getRepository(Existencia);
        const movimientos = administrador.getRepository(Movimiento);

        let existencia = await existencias.findOne({
          where: {
            productoId: dto.productoId,
            bodegaId: dto.bodegaDestinoId,
          },
          lock: {
            mode: "pessimistic_write",
          },
        });

        const anterior = existencia?.cantidad ?? 0;

        if (!existencia) {
          existencia = existencias.create({
            productoId: dto.productoId,
            bodegaId: dto.bodegaDestinoId,
            cantidad: 0,
          });
        }

        existencia.cantidad += dto.cantidad;
        await existencias.save(existencia);

        const movimiento = movimientos.create({
          tipo: TipoMovimiento.ENTRADA,
          productoId: dto.productoId,
          bodegaOrigenId: null,
          bodegaDestinoId: dto.bodegaDestinoId,
          usuarioId: usuario.id,
          cantidad: dto.cantidad,
          cantidadAnterior: anterior,
          cantidadNueva: existencia.cantidad,
          observacion: this.normalizarObservacion(dto.observacion),
        });

        const guardado = await movimientos.save(movimiento);
        return guardado.id;
      },
    );

    return this.buscarPorId(movimientoId);
  }

  async registrarTransferencia(
    dto: RegistrarTransferenciaDto,
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    if (dto.bodegaOrigenId === dto.bodegaDestinoId) {
      throw new ConflictException(
        "La bodega de origen y destino no pueden ser la misma.",
      );
    }

    const producto = await this.obtenerProducto(dto.productoId);
    const origen = await this.obtenerBodega(dto.bodegaOrigenId);
    const destino = await this.obtenerBodega(dto.bodegaDestinoId);

    this.validarProductoActivo(producto);
    this.validarBodegaActiva(origen);
    this.validarBodegaActiva(destino);
    this.validarRutaTransferencia(origen, destino);
    await this.validarPermisoMovimiento(
      usuario,
      origen.id,
      destino.id,
    );

    const movimientoId = await this.dataSource.transaction(
      async (administrador) => {
        const existencias = administrador.getRepository(Existencia);
        const movimientos = administrador.getRepository(Movimiento);

        const existenciaOrigen = await existencias.findOne({
          where: {
            productoId: dto.productoId,
            bodegaId: dto.bodegaOrigenId,
          },
          lock: {
            mode: "pessimistic_write",
          },
        });

        if (!existenciaOrigen) {
          throw new ConflictException(
            "El producto no tiene existencias en la bodega de origen.",
          );
        }

        if (existenciaOrigen.cantidad < dto.cantidad) {
          throw new ConflictException(
            "La bodega de origen no tiene stock suficiente.",
          );
        }

        let existenciaDestino = await existencias.findOne({
          where: {
            productoId: dto.productoId,
            bodegaId: dto.bodegaDestinoId,
          },
          lock: {
            mode: "pessimistic_write",
          },
        });

        if (!existenciaDestino) {
          existenciaDestino = existencias.create({
            productoId: dto.productoId,
            bodegaId: dto.bodegaDestinoId,
            cantidad: 0,
          });
        }

        existenciaOrigen.cantidad -= dto.cantidad;
        existenciaDestino.cantidad += dto.cantidad;

        await existencias.save([
          existenciaOrigen,
          existenciaDestino,
        ]);

        const movimiento = movimientos.create({
          tipo: TipoMovimiento.TRANSFERENCIA,
          productoId: dto.productoId,
          bodegaOrigenId: dto.bodegaOrigenId,
          bodegaDestinoId: dto.bodegaDestinoId,
          usuarioId: usuario.id,
          cantidad: dto.cantidad,
          cantidadAnterior: null,
          cantidadNueva: null,
          observacion: this.normalizarObservacion(dto.observacion),
        });

        const guardado = await movimientos.save(movimiento);
        return guardado.id;
      },
    );

    return this.buscarPorId(movimientoId);
  }

  async registrarSalida(
    dto: RegistrarSalidaDto,
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    const producto = await this.obtenerProducto(dto.productoId);
    const origen = await this.obtenerBodega(dto.bodegaOrigenId);

    this.validarProductoActivo(producto);
    this.validarBodegaActiva(origen);
    await this.validarPermisoMovimiento(
      usuario,
      origen.id,
      null,
    );

    const movimientoId = await this.dataSource.transaction(
      async (administrador) => {
        const existencias = administrador.getRepository(Existencia);
        const movimientos = administrador.getRepository(Movimiento);

        const existencia = await existencias.findOne({
          where: {
            productoId: dto.productoId,
            bodegaId: dto.bodegaOrigenId,
          },
          lock: {
            mode: "pessimistic_write",
          },
        });

        if (!existencia) {
          throw new ConflictException(
            "El producto no tiene existencias en la bodega seleccionada.",
          );
        }

        if (existencia.cantidad < dto.cantidad) {
          throw new ConflictException(
            "La bodega no tiene stock suficiente para registrar la salida.",
          );
        }

        const anterior = existencia.cantidad;
        existencia.cantidad -= dto.cantidad;
        await existencias.save(existencia);

        const movimiento = movimientos.create({
          tipo: TipoMovimiento.SALIDA,
          productoId: dto.productoId,
          bodegaOrigenId: dto.bodegaOrigenId,
          bodegaDestinoId: null,
          usuarioId: usuario.id,
          cantidad: dto.cantidad,
          cantidadAnterior: anterior,
          cantidadNueva: existencia.cantidad,
          observacion: this.normalizarObservacion(dto.observacion),
        });

        const guardado = await movimientos.save(movimiento);
        return guardado.id;
      },
    );

    return this.buscarPorId(movimientoId);
  }

  async registrarAjuste(
    dto: RegistrarAjusteDto,
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoPublico> {
    const producto = await this.obtenerProducto(dto.productoId);
    const bodega = await this.obtenerBodega(dto.bodegaId);

    this.validarProductoActivo(producto);
    this.validarBodegaActiva(bodega);

    const movimientoId = await this.dataSource.transaction(
      async (administrador) => {
        const existencias = administrador.getRepository(Existencia);
        const movimientos = administrador.getRepository(Movimiento);

        let existencia = await existencias.findOne({
          where: {
            productoId: dto.productoId,
            bodegaId: dto.bodegaId,
          },
          lock: {
            mode: "pessimistic_write",
          },
        });

        const anterior = existencia?.cantidad ?? 0;

        if (!existencia) {
          existencia = existencias.create({
            productoId: dto.productoId,
            bodegaId: dto.bodegaId,
            cantidad: 0,
          });
        }

        existencia.cantidad = dto.cantidadNueva;
        await existencias.save(existencia);

        const movimiento = movimientos.create({
          tipo: TipoMovimiento.AJUSTE,
          productoId: dto.productoId,
          bodegaOrigenId: dto.bodegaId,
          bodegaDestinoId: dto.bodegaId,
          usuarioId: usuario.id,
          cantidad: Math.abs(dto.cantidadNueva - anterior),
          cantidadAnterior: anterior,
          cantidadNueva: dto.cantidadNueva,
          observacion: dto.observacion.trim(),
        });

        const guardado = await movimientos.save(movimiento);
        return guardado.id;
      },
    );

    return this.buscarPorId(movimientoId);
  }

  async buscarPorId(id: string): Promise<MovimientoPublico> {
    const movimiento = await this.crearConsultaBase()
      .where("movimiento.id = :id", { id })
      .getOne();

    if (!movimiento) {
      throw new NotFoundException(
        "El movimiento solicitado no existe.",
      );
    }

    return this.convertirAPublico(movimiento);
  }

  private crearConsultaBase(): SelectQueryBuilder<Movimiento> {
    return this.movimientosRepository
      .createQueryBuilder("movimiento")
      .leftJoinAndSelect("movimiento.producto", "producto")
      .leftJoinAndSelect(
        "movimiento.bodegaOrigen",
        "bodegaOrigen",
      )
      .leftJoinAndSelect(
        "movimiento.bodegaDestino",
        "bodegaDestino",
      )
      .leftJoinAndSelect("movimiento.usuario", "usuario");
  }

  private aplicarFiltros(
    consulta: SelectQueryBuilder<Movimiento>,
    filtros: FiltrarMovimientosDto,
  ): SelectQueryBuilder<Movimiento> {
    if (filtros.tipo) {
      consulta.andWhere("movimiento.tipo = :tipo", {
        tipo: filtros.tipo,
      });
    }

    if (filtros.productoId) {
      consulta.andWhere("movimiento.productoId = :productoId", {
        productoId: filtros.productoId,
      });
    }

    if (filtros.bodegaId) {
      consulta.andWhere(
        `(movimiento.bodegaOrigenId = :bodegaId OR movimiento.bodegaDestinoId = :bodegaId)`,
        { bodegaId: filtros.bodegaId },
      );
    }

    if (filtros.buscar?.trim()) {
      const buscar = `%${filtros.buscar.trim().toLowerCase()}%`;

      consulta.andWhere(
        `(LOWER(producto.codigo) LIKE :buscar OR LOWER(producto.nombre) LIKE :buscar OR LOWER(usuario.nombre) LIKE :buscar OR LOWER(COALESCE(movimiento.observacion, '')) LIKE :buscar)`,
        { buscar },
      );
    }

    return consulta;
  }

  private async obtenerProducto(id: string): Promise<Producto> {
    const producto = await this.productosRepository.findOne({
      where: { id },
    });

    if (!producto) {
      throw new NotFoundException(
        "El producto seleccionado no existe.",
      );
    }

    return producto;
  }

  private async obtenerBodega(id: string): Promise<Bodega> {
    const bodega = await this.bodegasRepository.findOne({
      where: { id },
    });

    if (!bodega) {
      throw new NotFoundException(
        "La bodega seleccionada no existe.",
      );
    }

    return bodega;
  }

  private validarProductoActivo(producto: Producto): void {
    if (
      producto.estado !== EstadoProducto.ACTIVO ||
      producto.estadoBien === EstadoBienProducto.BAJA
    ) {
      throw new ConflictException(
        "No se pueden registrar movimientos para un producto inactivo o dado de baja.",
      );
    }
  }

  private validarBodegaActiva(bodega: Bodega): void {
    if (bodega.estado !== EstadoBodega.ACTIVA) {
      throw new ConflictException(
        `La bodega "${bodega.nombre}" está inactiva.`,
      );
    }
  }

  private validarRutaTransferencia(
    origen: Bodega,
    destino: Bodega,
  ): void {
    const desdeInventarioGeneral =
      origen.tipo === TipoBodega.INVENTARIO_GENERAL &&
      destino.tipo === TipoBodega.PRINCIPAL;

    const desdeGastronomia =
      origen.nombre === "Gastronomía Tasty" &&
      destino.tipo === TipoBodega.SUCURSAL &&
      destino.bodegaPadreId === origen.id;

    if (!desdeInventarioGeneral && !desdeGastronomia) {
      throw new ConflictException(
        "La transferencia no respeta la jerarquía permitida de bodegas.",
      );
    }
  }

  private async validarPermisoMovimiento(
    usuario: UsuarioAutenticado,
    bodegaOrigenId: string,
    bodegaDestinoId: string | null,
  ): Promise<void> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return;
    }

    if (usuario.rol !== RolUsuario.SUPERVISOR) {
      throw new ForbiddenException(
        "Solo Administradores y Supervisores pueden registrar movimientos.",
      );
    }

    const asignaciones = await this.asignacionesRepository.find({
      where: {
        usuarioId: usuario.id,
      },
    });

    const asignadas = new Set(
      asignaciones.map((asignacion) => asignacion.bodegaId),
    );

    if (!asignadas.has(bodegaOrigenId)) {
      throw new ForbiddenException(
        "No tienes autorización sobre la bodega de origen.",
      );
    }

    if (bodegaDestinoId) {
      const destino = await this.obtenerBodega(bodegaDestinoId);

      const permitidoPorJerarquia =
        asignadas.has(bodegaDestinoId) ||
        destino.bodegaPadreId === bodegaOrigenId;

      if (!permitidoPorJerarquia) {
        throw new ForbiddenException(
          "No tienes autorización sobre la bodega de destino.",
        );
      }
    }
  }

  private async obtenerBodegasAsignadas(
    usuarioId: string,
  ): Promise<string[]> {
    const asignaciones = await this.asignacionesRepository.find({
      where: {
        usuarioId,
      },
      select: {
        bodegaId: true,
      },
    });

    return asignaciones.map(
      (asignacion) => asignacion.bodegaId,
    );
  }

  private normalizarObservacion(
    observacion?: string,
  ): string | null {
    const valor = observacion?.trim();
    return valor ? valor : null;
  }

  private convertirAPublico(
    movimiento: Movimiento,
  ): MovimientoPublico {
    return {
      id: movimiento.id,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      cantidadAnterior: movimiento.cantidadAnterior,
      cantidadNueva: movimiento.cantidadNueva,
      observacion: movimiento.observacion,
      createdAt: movimiento.createdAt,
      solicitudId: movimiento.solicitudId,
      solicitudDetalleId: movimiento.solicitudDetalleId,
      movimientoOriginalId: movimiento.movimientoOriginalId,
      modulo: movimiento.modulo,
      accion: movimiento.accion,
      registroId: movimiento.registroId,
      producto: movimiento.producto
        ? {
            id: movimiento.producto.id,
            codigo: movimiento.producto.codigo,
            nombre: movimiento.producto.nombre,
          }
        : null,
      bodegaOrigen: movimiento.bodegaOrigen
        ? {
            id: movimiento.bodegaOrigen.id,
            nombre: movimiento.bodegaOrigen.nombre,
          }
        : null,
      bodegaDestino: movimiento.bodegaDestino
        ? {
            id: movimiento.bodegaDestino.id,
            nombre: movimiento.bodegaDestino.nombre,
          }
        : null,
      usuario: {
        id: movimiento.usuario.id,
        nombre: movimiento.usuario.nombre,
        rol: movimiento.usuario.rol,
      },
    };
  }
}
