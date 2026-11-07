import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  In,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import { UsuarioBodega } from "../asignaciones/entities/usuario-bodega.entity";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { TipoBodega } from "../bodegas/enums/tipo-bodega.enum";
import { Producto } from "../productos/entities/producto.entity";
import { EstadoBienProducto } from "../productos/enums/estado-bien-producto.enum";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
import { TipoProducto } from "../productos/enums/tipo-producto.enum";
import { RolUsuario } from "../usuarios/enums/rol-usuario.enum";
import { AjustarExistenciaDto } from "./dto/ajustar-existencia.dto";
import { FiltrarInventarioDto } from "./dto/filtrar-inventario.dto";
import { RegistrarInventarioInicialDto } from "./dto/registrar-inventario-inicial.dto";
import { Existencia } from "./entities/existencia.entity";

export interface ProductoInventarioPublico {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcionBien: string;
  tipoProducto: TipoProducto;
  atributo: string | null;
  empresa: string | null;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: EstadoBienProducto;
  ubicacion: string;
  custodioActual: string;
  procedencia: string | null;
  codigoUleam: string | null;
  categoria: {
    id: string;
    nombre: string;
  };
  unidad: string;
  observacion: string | null;
  estado: EstadoProducto;
  fechaRegistro: string;
}

export interface ExistenciaPublica {
  id: string;
  cantidad: number;
  producto: ProductoInventarioPublico;
  bodega: {
    id: string;
    nombre: string;
    tipo: string;
    estado: EstadoBodega;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InventarioFrontendItem {
  id: string;
  productoId: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  bodega: string;
  fechaAsignacion: string;
  producto: ProductoInventarioPublico;
}


export interface StockSupervisorItem {
  existenciaId: string;
  productoId: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  bodegaStockId: string;
  area: {
    id: string;
    nombre: string;
  };
  destinos: Array<{
    id: string;
    nombre: string;
  }>;
  producto: ProductoInventarioPublico;
}

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(UsuarioBodega)
    private readonly asignacionesRepository: Repository<UsuarioBodega>,
  ) {}

  async listar(
    filtros: FiltrarInventarioDto,
  ): Promise<ExistenciaPublica[]> {
    const existencias = await this.aplicarFiltros(
      this.crearConsultaBase(),
      filtros,
    )
      .andWhere("bodega.tipo <> :tipoStockSupervisor", {
        tipoStockSupervisor: TipoBodega.STOCK_SUPERVISOR,
      })
      .orderBy("bodega.nombre", "ASC")
      .addOrderBy("producto.nombre", "ASC")
      .getMany();

    return existencias.map((existencia) =>
      this.convertirAPublica(existencia),
    );
  }

  async listarFrontend(
    usuario: UsuarioAutenticado,
    filtros: FiltrarInventarioDto,
  ): Promise<InventarioFrontendItem[]> {
    const consulta = this.aplicarFiltros(
      this.crearConsultaBase(),
      filtros,
    )
      .andWhere("bodega.tipo <> :tipoStockSupervisor", {
        tipoStockSupervisor: TipoBodega.STOCK_SUPERVISOR,
      })
      .andWhere("producto.estado = :estadoProducto", {
        estadoProducto: EstadoProducto.ACTIVO,
      })
      .andWhere("producto.estadoBien <> :estadoBienBaja", {
        estadoBienBaja: EstadoBienProducto.BAJA,
      });

    await this.aplicarAlcancePorRol(consulta, usuario);

    const existencias = await consulta
      .orderBy("bodega.nombre", "ASC")
      .addOrderBy("producto.nombre", "ASC")
      .getMany();

    return existencias.map((existencia) =>
      this.convertirAFrontend(existencia),
    );
  }

  async listarPorBodega(
    bodegaId: string,
    usuario: UsuarioAutenticado,
  ): Promise<ExistenciaPublica[]> {
    await this.validarAccesoABodega(usuario, bodegaId);

    const existencias = await this.crearConsultaBase()
      .where("existencia.bodegaId = :bodegaId", { bodegaId })
      .orderBy("producto.nombre", "ASC")
      .getMany();

    return existencias.map((existencia) =>
      this.convertirAPublica(existencia),
    );
  }

  async listarMio(
    usuario: UsuarioAutenticado,
  ): Promise<ExistenciaPublica[]> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return this.listar({});
    }

    const bodegaIds = await this.obtenerBodegasAcceso(usuario);

    if (bodegaIds.length === 0) {
      return [];
    }

    const existencias = await this.crearConsultaBase()
      .where("existencia.bodegaId IN (:...bodegaIds)", {
        bodegaIds,
      })
      .orderBy("bodega.nombre", "ASC")
      .addOrderBy("producto.nombre", "ASC")
      .getMany();

    return existencias.map((existencia) =>
      this.convertirAPublica(existencia),
    );
  }

  async listarStockSupervisor(
    usuario: UsuarioAutenticado,
  ): Promise<StockSupervisorItem[]> {
    if (usuario.rol !== RolUsuario.SUPERVISOR) {
      throw new ForbiddenException(
        "Solo los Supervisores pueden consultar sus productos en stock.",
      );
    }

    const stocks = await this.bodegasRepository.find({
      where: {
        tipo: TipoBodega.STOCK_SUPERVISOR,
        supervisorId: usuario.id,
        estado: EstadoBodega.ACTIVA,
      },
      relations: {
        bodegaPadre: true,
      },
      order: {
        createdAt: "ASC",
      },
    });

    if (stocks.length === 0) {
      return [];
    }

    const stockIds = stocks.map((stock) => stock.id);
    const stocksPorId = new Map(
      stocks.map((stock) => [stock.id, stock]),
    );
    const areaIds = Array.from(
      new Set(
        stocks
          .map((stock) => stock.bodegaPadreId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const sucursales =
      areaIds.length > 0
        ? await this.bodegasRepository.find({
            where: {
              bodegaPadreId: In(areaIds),
              tipo: TipoBodega.SUCURSAL,
              estado: EstadoBodega.ACTIVA,
            },
            order: {
              nombre: "ASC",
            },
          })
        : [];

    const sucursalesPorArea = new Map<string, Bodega[]>();

    sucursales.forEach((sucursal) => {
      if (!sucursal.bodegaPadreId) return;
      const actuales = sucursalesPorArea.get(sucursal.bodegaPadreId) || [];
      actuales.push(sucursal);
      sucursalesPorArea.set(sucursal.bodegaPadreId, actuales);
    });

    const existencias = await this.crearConsultaBase()
      .where("existencia.bodegaId IN (:...stockIds)", { stockIds })
      .andWhere("existencia.cantidad > 0")
      .andWhere("producto.estado = :estadoProducto", {
        estadoProducto: EstadoProducto.ACTIVO,
      })
      .andWhere("producto.estadoBien <> :estadoBienBaja", {
        estadoBienBaja: EstadoBienProducto.BAJA,
      })
      .orderBy("producto.nombre", "ASC")
      .getMany();

    return existencias.map((existencia) => {
      const stock = stocksPorId.get(existencia.bodegaId);
      const area = stock?.bodegaPadre;

      if (!stock || !area) {
        throw new ConflictException(
          "Existe un stock de Supervisor sin bodega principal asociada.",
        );
      }

      return {
        existenciaId: existencia.id,
        productoId: existencia.producto.id,
        codigo: existencia.producto.codigo,
        descripcion: existencia.producto.nombre,
        categoria: existencia.producto.categoria.nombre,
        unidad: existencia.producto.unidad,
        cantidad: existencia.cantidad,
        bodegaStockId: stock.id,
        area: {
          id: area.id,
          nombre: area.nombre,
        },
        destinos: (sucursalesPorArea.get(area.id) || [area]).map(
          (destino) => ({
            id: destino.id,
            nombre: destino.nombre,
          }),
        ),
        producto: this.convertirProductoInventario(existencia),
      };
    });
  }

  async registrarInicial(
    dto: RegistrarInventarioInicialDto,
  ): Promise<ExistenciaPublica> {
    const producto = await this.obtenerProducto(dto.productoId);
    const bodega = await this.obtenerBodega(dto.bodegaId);

    this.validarProductoActivo(producto);
    this.validarBodegaActiva(bodega);

    const existente = await this.existenciasRepository.findOne({
      where: {
        productoId: dto.productoId,
        bodegaId: dto.bodegaId,
      },
    });

    if (existente) {
      throw new ConflictException(
        "Ya existe un registro de inventario para ese producto en la bodega seleccionada.",
      );
    }

    const existencia = this.existenciasRepository.create({
      productoId: dto.productoId,
      bodegaId: dto.bodegaId,
      cantidad: dto.cantidad,
    });

    const guardada =
      await this.existenciasRepository.save(existencia);

    return this.buscarPorId(guardada.id);
  }

  async ajustar(
    id: string,
    dto: AjustarExistenciaDto,
  ): Promise<ExistenciaPublica> {
    const existencia = await this.obtenerPorId(id);

    this.validarProductoActivo(existencia.producto);
    this.validarBodegaActiva(existencia.bodega);

    existencia.cantidad = dto.cantidad;

    await this.existenciasRepository.save(existencia);

    return this.buscarPorId(id);
  }

  async buscarPorId(id: string): Promise<ExistenciaPublica> {
    const existencia = await this.obtenerPorId(id);
    return this.convertirAPublica(existencia);
  }

  private crearConsultaBase(): SelectQueryBuilder<Existencia> {
    return this.existenciasRepository
      .createQueryBuilder("existencia")
      .leftJoinAndSelect("existencia.producto", "producto")
      .leftJoinAndSelect("producto.categoria", "categoria")
      .leftJoinAndSelect("existencia.bodega", "bodega")
      .leftJoinAndSelect("bodega.bodegaPadre", "bodegaPadre")
      .leftJoinAndSelect("bodega.asignaciones", "asignacionBodega")
      .leftJoinAndSelect("asignacionBodega.usuario", "usuarioAsignado")
      .distinct(true);
  }

  private aplicarFiltros(
    consulta: SelectQueryBuilder<Existencia>,
    filtros: FiltrarInventarioDto,
  ): SelectQueryBuilder<Existencia> {
    if (filtros.bodegaId) {
      consulta.andWhere("existencia.bodegaId = :bodegaId", {
        bodegaId: filtros.bodegaId,
      });
    }

    if (filtros.productoId) {
      consulta.andWhere("existencia.productoId = :productoId", {
        productoId: filtros.productoId,
      });
    }

    if (filtros.categoriaId) {
      consulta.andWhere("producto.categoriaId = :categoriaId", {
        categoriaId: filtros.categoriaId,
      });
    }

    if (filtros.tipoProducto) {
      consulta.andWhere("producto.tipoProducto = :tipoProducto", {
        tipoProducto: filtros.tipoProducto,
      });
    }

    if (filtros.custodioId) {
      consulta.andWhere("asignacionBodega.usuarioId = :custodioId", {
        custodioId: filtros.custodioId,
      });
    }

    if (filtros.fechaInicio) {
      consulta.andWhere("existencia.createdAt >= :fechaInicio", {
        fechaInicio: `${filtros.fechaInicio}T00:00:00.000Z`,
      });
    }

    if (filtros.fechaFin) {
      consulta.andWhere("existencia.createdAt <= :fechaFin", {
        fechaFin: `${filtros.fechaFin}T23:59:59.999Z`,
      });
    }

    if (filtros.buscar?.trim()) {
      const buscar = `%${filtros.buscar.trim().toLowerCase()}%`;

      consulta.andWhere(
        `(LOWER(producto.codigo) LIKE :buscar
          OR LOWER(producto.nombre) LIKE :buscar
          OR LOWER(COALESCE(producto.codigoUleam, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.serie, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.modelo, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.marca, '')) LIKE :buscar
          OR LOWER(bodega.nombre) LIKE :buscar)`,
        { buscar },
      );
    }

    return consulta;
  }

  private async aplicarAlcancePorRol(
    consulta: SelectQueryBuilder<Existencia>,
    usuario: UsuarioAutenticado,
  ): Promise<void> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return;
    }

    const bodegaIds = await this.obtenerBodegasAcceso(usuario);

    const inventarioGeneral = await this.bodegasRepository.findOne({
      where: {
        nombre: "Inventario General",
      },
      select: {
        id: true,
      },
    });

    const idsPermitidos = new Set(bodegaIds);

    if (inventarioGeneral) {
      idsPermitidos.add(inventarioGeneral.id);
    }

    if (idsPermitidos.size === 0) {
      consulta.andWhere("1 = 0");
      return;
    }

    consulta.andWhere("existencia.bodegaId IN (:...idsPermitidos)", {
      idsPermitidos: [...idsPermitidos],
    });
  }

  private async obtenerPorId(id: string): Promise<Existencia> {
    const existencia = await this.crearConsultaBase()
      .where("existencia.id = :id", { id })
      .getOne();

    if (!existencia) {
      throw new NotFoundException(
        "El registro de inventario solicitado no existe.",
      );
    }

    return existencia;
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
        "No se puede registrar inventario para un producto inactivo o dado de baja.",
      );
    }
  }

  private validarBodegaActiva(bodega: Bodega): void {
    if (bodega.estado !== EstadoBodega.ACTIVA) {
      throw new ConflictException(
        "No se puede registrar inventario en una bodega inactiva.",
      );
    }
  }

  private async obtenerBodegasAsignadas(
    usuarioId: string,
  ): Promise<string[]> {
    const asignaciones = await this.asignacionesRepository.find({
      where: { usuarioId },
      select: {
        bodegaId: true,
      },
    });

    return asignaciones.map(
      (asignacion) => asignacion.bodegaId,
    );
  }

  private async obtenerBodegasAcceso(
    usuario: UsuarioAutenticado,
  ): Promise<string[]> {
    const asignadas = await this.obtenerBodegasAsignadas(usuario.id);

    if (
      usuario.rol !== RolUsuario.SUPERVISOR ||
      asignadas.length === 0
    ) {
      return asignadas;
    }

    const sucursales = await this.bodegasRepository.find({
      where: {
        bodegaPadreId: In(asignadas),
        tipo: TipoBodega.SUCURSAL,
        estado: EstadoBodega.ACTIVA,
      },
      select: {
        id: true,
      },
    });

    return Array.from(
      new Set([
        ...asignadas,
        ...sucursales.map((sucursal) => sucursal.id),
      ]),
    );
  }

  private async validarAccesoABodega(
    usuario: UsuarioAutenticado,
    bodegaId: string,
  ): Promise<void> {
    if (usuario.rol === RolUsuario.ADMINISTRADOR) {
      return;
    }

    const permitidas = await this.obtenerBodegasAcceso(usuario);

    if (!permitidas.includes(bodegaId)) {
      throw new ForbiddenException(
        "No tienes acceso al inventario de esta bodega.",
      );
    }
  }

  private obtenerCustodioActual(
    existencia: Existencia,
  ): string {
    const asignaciones = existencia.bodega.asignaciones ?? [];
    const asignacion = asignaciones.find(
      (item) => item.usuario?.nombre,
    );

    return (
      existencia.producto.custodioActual ??
      asignacion?.usuario?.nombre ??
      "Sin asignar"
    );
  }

  private convertirProductoInventario(
    existencia: Existencia,
  ): ProductoInventarioPublico {
    const producto = existencia.producto;
    const custodioActual = this.obtenerCustodioActual(existencia);

    return {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      descripcionBien: producto.nombre,
      tipoProducto: producto.tipoProducto,
      atributo: producto.atributo,
      empresa: producto.atributo,
      serie: producto.serie,
      modelo: producto.modelo,
      marca: producto.marca,
      material: producto.material,
      color: producto.color,
      dimensiones: producto.dimensiones,
      estadoBien: producto.estadoBien,
      ubicacion: existencia.bodega.nombre,
      custodioActual,
      procedencia: producto.procedencia,
      codigoUleam: producto.codigoUleam,
      categoria: {
        id: producto.categoria.id,
        nombre: producto.categoria.nombre,
      },
      unidad: producto.unidad,
      observacion: producto.observacion,
      estado: producto.estado,
      fechaRegistro: producto.fechaRegistro,
    };
  }

  private convertirAPublica(
    existencia: Existencia,
  ): ExistenciaPublica {
    return {
      id: existencia.id,
      cantidad: existencia.cantidad,
      producto: this.convertirProductoInventario(existencia),
      bodega: {
        id: existencia.bodega.id,
        nombre: existencia.bodega.nombre,
        tipo: existencia.bodega.tipo,
        estado: existencia.bodega.estado,
      },
      createdAt: existencia.createdAt,
      updatedAt: existencia.updatedAt,
    };
  }

  private convertirAFrontend(
    existencia: Existencia,
  ): InventarioFrontendItem {
    const producto = this.convertirProductoInventario(existencia);

    return {
      id: existencia.id,
      productoId: existencia.productoId,
      codigo: producto.codigo,
      descripcion: producto.nombre,
      categoria: producto.categoria.nombre,
      unidad: producto.unidad,
      cantidad: existencia.cantidad,
      bodega: existencia.bodega.nombre,
      fechaAsignacion: existencia.createdAt.toISOString().slice(0, 10),
      producto,
    };
  }
}
