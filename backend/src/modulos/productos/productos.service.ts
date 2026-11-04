import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import {
  DataSource,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

import { Categoria } from "../categorias/entities/categoria.entity";
import { Bodega } from "../bodegas/entities/bodega.entity";
import { EstadoBodega } from "../bodegas/enums/estado-bodega.enum";
import { EstadoCategoria } from "../categorias/enums/estado-categoria.enum";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Movimiento } from "../movimientos/entities/movimiento.entity";
import { TipoMovimiento } from "../movimientos/enums/tipo-movimiento.enum";
import { ActualizarProductoDto } from "./dto/actualizar-producto.dto";
import { CrearProductoDto } from "./dto/crear-producto.dto";
import { DarBajaProductoDto } from "./dto/dar-baja-producto.dto";
import { FiltrarProductosDto } from "./dto/filtrar-productos.dto";
import { Producto } from "./entities/producto.entity";
import { AtributoProducto } from "./enums/atributo-producto.enum";
import { EstadoBienProducto } from "./enums/estado-bien-producto.enum";
import { EstadoProducto } from "./enums/estado-producto.enum";
import { TipoProducto } from "./enums/tipo-producto.enum";

export interface ProductoPublico {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  descripcionBien: string;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
    estado: EstadoCategoria;
  };
  tipoProducto: TipoProducto;
  atributo: AtributoProducto | null;
  empresa: AtributoProducto | null;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: EstadoBienProducto;
  ubicacion: string | null;
  custodioActual: string | null;
  procedencia: string | null;
  codigoUleam: string | null;
  unidad: string;
  observacion: string | null;
  fechaRegistro: string;
  cantidad: number;
  estado: EstadoProducto;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    @InjectRepository(Movimiento)
    private readonly movimientosRepository: Repository<Movimiento>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(
    filtros: FiltrarProductosDto,
  ): Promise<ProductoPublico[]> {
    const consulta = this.crearConsultaBase();

    if (filtros.buscar?.trim()) {
      const buscar = `%${filtros.buscar.trim().toLowerCase()}%`;

      consulta.andWhere(
        `(LOWER(producto.codigo) LIKE :buscar
          OR LOWER(producto.nombre) LIKE :buscar
          OR LOWER(COALESCE(producto.descripcion, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.codigoUleam, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.serie, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.modelo, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.marca, '')) LIKE :buscar)`,
        { buscar },
      );
    }

    if (filtros.categoriaId) {
      consulta.andWhere(
        "producto.categoriaId = :categoriaId",
        {
          categoriaId: filtros.categoriaId,
        },
      );
    }

    if (filtros.tipoProducto) {
      consulta.andWhere(
        "producto.tipoProducto = :tipoProducto",
        {
          tipoProducto: filtros.tipoProducto,
        },
      );
    }

    if (filtros.estado) {
      consulta.andWhere("producto.estado = :estado", {
        estado: filtros.estado,
      });
    }

    const productos = await consulta
      .orderBy("producto.nombre", "ASC")
      .addOrderBy("producto.codigo", "ASC")
      .getMany();

    return Promise.all(
      productos.map((producto) =>
        this.convertirAPublico(producto),
      ),
    );
  }

  async listarActivos(): Promise<ProductoPublico[]> {
    const productos = await this.crearConsultaBase()
      .where("producto.estado = :estado", {
        estado: EstadoProducto.ACTIVO,
      })
      .andWhere("producto.estadoBien <> :estadoBien", {
        estadoBien: EstadoBienProducto.BAJA,
      })
      .orderBy("producto.nombre", "ASC")
      .getMany();

    return Promise.all(
      productos.map((producto) =>
        this.convertirAPublico(producto),
      ),
    );
  }

  async buscarPorId(id: string): Promise<ProductoPublico> {
    const producto = await this.obtenerPorId(id);
    return this.convertirAPublico(producto);
  }

  async crear(
    dto: CrearProductoDto,
    actor: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    await this.validarCodigoDisponible(dto.codigo);
    await this.validarCategoriaActiva(dto.categoriaId);

    const nombre = this.obtenerNombrePrincipal(
      dto.nombre,
      dto.descripcion,
    );

    const tipoProducto = dto.tipoProducto;
    const atributo = this.validarYNormalizarAtributo(
      tipoProducto,
      dto.empresa ?? dto.atributo ?? null,
    );

    const producto = this.productosRepository.create({
      codigo: this.normalizarCodigo(dto.codigo),
      nombre,
      descripcion: dto.nombre
        ? this.normalizarTextoOpcional(dto.descripcion)
        : null,
      categoriaId: dto.categoriaId,
      tipoProducto,
      atributo,
      estado: dto.estado ?? EstadoProducto.ACTIVO,
      serie: this.normalizarTexto(dto.serie, "S/N"),
      modelo: this.normalizarTexto(dto.modelo, "No aplica"),
      marca: this.normalizarTexto(dto.marca, "S/M"),
      material: this.normalizarTexto(dto.material, "No especifica"),
      color: this.normalizarTexto(dto.color, "No especifica"),
      dimensiones: this.normalizarTexto(
        dto.dimensiones,
        "No especifica",
      ),
      estadoBien: dto.estadoBien ?? EstadoBienProducto.BUENO,
      ubicacion: this.normalizarTextoOpcional(dto.ubicacion),
      custodioActual: this.normalizarTextoOpcional(
        dto.custodioActual,
      ),
      procedencia: this.normalizarTextoOpcional(dto.procedencia),
      codigoUleam:
        this.normalizarTextoOpcional(dto.codigoUleam) ??
        this.normalizarCodigo(dto.codigo),
      unidad: this.normalizarTexto(dto.unidad, "Unidad"),
      observacion: this.normalizarTextoOpcional(dto.observacion),
      fechaRegistro:
        dto.fechaRegistro ?? this.obtenerFechaActualISO(),
    });

    const cantidadInicial = dto.cantidad ?? 0;

    const productoId = await this.dataSource.transaction(
      async (administrador) => {
        const productos = administrador.getRepository(Producto);
        const bodegas = administrador.getRepository(Bodega);
        const existencias = administrador.getRepository(Existencia);
        const movimientos = administrador.getRepository(Movimiento);

        const guardado = await productos.save(producto);

        if (cantidadInicial > 0) {
          const inventarioGeneral = await bodegas.findOne({
            where: {
              nombre: "Inventario General",
            },
          });

          if (!inventarioGeneral) {
            throw new NotFoundException(
              "No se encontró la bodega Inventario General para registrar la cantidad inicial.",
            );
          }

          if (inventarioGeneral.estado !== EstadoBodega.ACTIVA) {
            throw new ConflictException(
              "Inventario General está inactivo y no puede recibir productos.",
            );
          }

          const existencia = existencias.create({
            productoId: guardado.id,
            bodegaId: inventarioGeneral.id,
            cantidad: cantidadInicial,
          });

          await existencias.save(existencia);

          await movimientos.save(
            movimientos.create({
              tipo: TipoMovimiento.ENTRADA,
              productoId: guardado.id,
              bodegaOrigenId: null,
              bodegaDestinoId: inventarioGeneral.id,
              usuarioId: actor.id,
              solicitudId: null,
              solicitudDetalleId: null,
              movimientoOriginalId: null,
              cantidad: cantidadInicial,
              cantidadAnterior: 0,
              cantidadNueva: cantidadInicial,
              observacion: `Registro inicial del producto ${guardado.codigo} - ${guardado.nombre}.`,
              modulo: "productos",
              accion: "entrada_inicial",
              registroId: guardado.id,
            }),
          );
        }

        return guardado.id;
      },
    );

    return this.buscarPorId(productoId);
  }

  async actualizar(
    id: string,
    dto: ActualizarProductoDto,
    actor: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    const producto = await this.obtenerPorId(id);

    this.validarProductoEditable(producto);

    if (dto.estadoBien === EstadoBienProducto.BAJA) {
      throw new ConflictException(
        "Para dar de baja un producto use la opción de baja. No se permite marcarlo como baja desde edición.",
      );
    }

    if (dto.codigo !== undefined) {
      await this.validarCodigoDisponible(dto.codigo, id);
      producto.codigo = this.normalizarCodigo(dto.codigo);
    }

    if (
      dto.nombre !== undefined ||
      dto.descripcion !== undefined
    ) {
      producto.nombre = this.obtenerNombrePrincipal(
        dto.nombre,
        dto.descripcion,
        producto.nombre,
      );

      if (dto.nombre !== undefined) {
        producto.descripcion = this.normalizarTextoOpcional(
          dto.descripcion,
        );
      }
    }

    if (dto.categoriaId !== undefined) {
      const categoria = await this.validarCategoriaActiva(dto.categoriaId);
      producto.categoriaId = categoria.id;
      producto.categoria = categoria;
    }

    const tipoFinal = dto.tipoProducto ?? producto.tipoProducto;
    const atributoFinal =
      dto.empresa !== undefined
        ? dto.empresa
        : dto.atributo !== undefined
          ? dto.atributo
          : producto.atributo;

    producto.tipoProducto = tipoFinal;
    producto.atributo = this.validarYNormalizarAtributo(
      tipoFinal,
      atributoFinal,
    );

    this.actualizarCampoTexto(producto, "serie", dto.serie);
    this.actualizarCampoTexto(producto, "modelo", dto.modelo);
    this.actualizarCampoTexto(producto, "marca", dto.marca);
    this.actualizarCampoTexto(producto, "material", dto.material);
    this.actualizarCampoTexto(producto, "color", dto.color);
    this.actualizarCampoTexto(
      producto,
      "dimensiones",
      dto.dimensiones,
    );

    if (dto.estadoBien !== undefined) {
      producto.estadoBien = dto.estadoBien;
    }

    this.actualizarCampoOpcional(
      producto,
      "ubicacion",
      dto.ubicacion,
    );
    this.actualizarCampoOpcional(
      producto,
      "custodioActual",
      dto.custodioActual,
    );
    this.actualizarCampoOpcional(
      producto,
      "procedencia",
      dto.procedencia,
    );
    this.actualizarCampoOpcional(
      producto,
      "codigoUleam",
      dto.codigoUleam,
    );
    this.actualizarCampoTexto(producto, "unidad", dto.unidad);
    this.actualizarCampoOpcional(
      producto,
      "observacion",
      dto.observacion,
    );

    if (dto.fechaRegistro !== undefined) {
      producto.fechaRegistro = dto.fechaRegistro;
    }

    if (dto.estado !== undefined) {
      producto.estado = dto.estado;
    }

    await this.productosRepository.save(producto);
    await this.registrarModificacionProducto({
      usuarioId: actor.id,
      modulo: "productos",
      accion: "editar",
      registroId: producto.id,
      descripcion: `Edición del producto ${producto.codigo} - ${producto.nombre}.`,
    });

    return this.buscarPorId(id);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoProducto,
    actor: UsuarioAutenticado,
  ): Promise<ProductoPublico> {
    const producto = await this.obtenerPorId(id);

    if (producto.estadoBien === EstadoBienProducto.BAJA) {
      throw new ConflictException(
        "Los productos dados de baja no pueden activarse o inactivarse manualmente. Para recuperarlos, revierta el movimiento de baja dentro del tiempo permitido.",
      );
    }

    if (estado === EstadoProducto.ACTIVO) {
      await this.validarCategoriaActiva(producto.categoriaId);
    }

    producto.estado = estado;
    await this.productosRepository.save(producto);
    await this.registrarModificacionProducto({
      usuarioId: actor.id,
      modulo: "productos",
      accion:
        estado === EstadoProducto.ACTIVO
          ? "activar"
          : "inactivar",
      registroId: producto.id,
      descripcion: `${
        estado === EstadoProducto.ACTIVO
          ? "Activación"
          : "Inactivación"
      } del producto ${producto.codigo} - ${producto.nombre}.`,
    });

    return this.buscarPorId(id);
  }

  async eliminar(
    id: string,
    dto: DarBajaProductoDto,
    actor: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    await this.dataSource.transaction(async (administrador) => {
      const productos = administrador.getRepository(Producto);
      const existencias = administrador.getRepository(Existencia);
      const movimientos = administrador.getRepository(Movimiento);

      const producto = await productos
        .createQueryBuilder("producto")
        .setLock("pessimistic_write")
        .where("producto.id = :id", { id })
        .getOne();

      if (!producto) {
        throw new NotFoundException(
          "El producto solicitado no existe.",
        );
      }

      if (producto.estadoBien === EstadoBienProducto.BAJA) {
        throw new ConflictException(
          "El producto ya fue dado de baja anteriormente.",
        );
      }

      const motivo =
        this.normalizarTextoOpcional(dto.observacion) ??
        `Baja del producto ${producto.codigo} - ${producto.nombre}.`;

      const existenciasProducto = await existencias.find({
        where: {
          productoId: producto.id,
        },
      });

      for (const existencia of existenciasProducto) {
        if (existencia.cantidad <= 0) {
          continue;
        }

        await movimientos.save(
          movimientos.create({
            tipo: TipoMovimiento.BAJA,
            productoId: producto.id,
            bodegaOrigenId: existencia.bodegaId,
            bodegaDestinoId: null,
            usuarioId: actor.id,
            solicitudId: null,
            solicitudDetalleId: null,
            movimientoOriginalId: null,
            cantidad: existencia.cantidad,
            cantidadAnterior: existencia.cantidad,
            cantidadNueva: 0,
            observacion: motivo,
            modulo: "productos",
            accion: "baja",
            registroId: producto.id,
          }),
        );

        existencia.cantidad = 0;
        await existencias.save(existencia);
      }

      producto.estado = EstadoProducto.INACTIVO;
      producto.estadoBien = EstadoBienProducto.BAJA;
      producto.observacion = motivo;
      await productos.save(producto);
    });

    return {
      message:
        "Producto dado de baja correctamente. El historial se conserva.",
    };
  }

  private async registrarModificacionProducto(dto: {
    usuarioId: string;
    modulo: string;
    accion: string;
    registroId: string;
    descripcion: string;
  }): Promise<void> {
    const movimiento = this.movimientosRepository.create({
      tipo: TipoMovimiento.MODIFICACION,
      productoId: dto.registroId,
      bodegaOrigenId: null,
      bodegaDestinoId: null,
      usuarioId: dto.usuarioId,
      solicitudId: null,
      solicitudDetalleId: null,
      movimientoOriginalId: null,
      cantidad: 0,
      cantidadAnterior: null,
      cantidadNueva: null,
      observacion: dto.descripcion,
      modulo: dto.modulo,
      accion: dto.accion,
      registroId: dto.registroId,
    });

    await this.movimientosRepository.save(movimiento);
  }

  private crearConsultaBase(): SelectQueryBuilder<Producto> {
    return this.productosRepository
      .createQueryBuilder("producto")
      .leftJoinAndSelect("producto.categoria", "categoria");
  }

  private async obtenerPorId(id: string): Promise<Producto> {
    const producto = await this.crearConsultaBase()
      .where("producto.id = :id", { id })
      .getOne();

    if (!producto) {
      throw new NotFoundException(
        "El producto solicitado no existe.",
      );
    }

    return producto;
  }

  private validarProductoEditable(producto: Producto): void {
    if (
      producto.estado !== EstadoProducto.ACTIVO ||
      producto.estadoBien === EstadoBienProducto.BAJA
    ) {
      throw new ConflictException(
        "No se puede editar un producto inactivo o dado de baja. Para recuperar un producto dado de baja, revierta el movimiento de baja dentro del tiempo permitido.",
      );
    }
  }

  private async validarCodigoDisponible(
    codigo: string,
    idExcluido?: string,
  ): Promise<void> {
    const consulta = this.productosRepository
      .createQueryBuilder("producto")
      .where("LOWER(TRIM(producto.codigo)) = :codigo", {
        codigo: this.normalizarCodigo(codigo).toLowerCase(),
      });

    if (idExcluido) {
      consulta.andWhere("producto.id <> :idExcluido", {
        idExcluido,
      });
    }

    if ((await consulta.getCount()) > 0) {
      throw new ConflictException(
        "Ya existe un producto con ese código.",
      );
    }
  }

  private async validarCategoriaActiva(
    categoriaId: string,
  ): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({
      where: {
        id: categoriaId,
      },
    });

    if (!categoria) {
      throw new NotFoundException(
        "La categoría seleccionada no existe.",
      );
    }

    if (categoria.estado !== EstadoCategoria.ACTIVA) {
      throw new ConflictException(
        "No se puede utilizar una categoría inactiva.",
      );
    }

    return categoria;
  }

  private validarYNormalizarAtributo(
    tipoProducto: TipoProducto,
    atributo: AtributoProducto | null | undefined,
  ): AtributoProducto | null {
    if (tipoProducto === TipoProducto.CONSUMIBLE) {
      if (atributo !== null && atributo !== undefined) {
        throw new ConflictException(
          "Los productos consumibles no pueden tener atributo BLD o BCA.",
        );
      }

      return null;
    }

    if (
      atributo !== null &&
      atributo !== undefined &&
      !Object.values(AtributoProducto).includes(atributo)
    ) {
      throw new ConflictException(
        "El atributo del producto no es válido.",
      );
    }

    return atributo ?? null;
  }

  private async obtenerCantidadTotal(
    productoId: string,
  ): Promise<number> {
    const resultado = await this.existenciasRepository
      .createQueryBuilder("existencia")
      .select("COALESCE(SUM(existencia.cantidad), 0)", "total")
      .where("existencia.productoId = :productoId", {
        productoId,
      })
      .getRawOne<{ total: string }>();

    return Number(resultado?.total ?? 0);
  }

  private obtenerNombrePrincipal(
    nombre?: string,
    descripcion?: string,
    actual?: string,
  ): string {
    const valor = nombre?.trim() || descripcion?.trim() || actual;

    if (!valor || valor.length < 2) {
      throw new ConflictException(
        "La descripción del producto es obligatoria.",
      );
    }

    return valor;
  }

  private normalizarCodigo(codigo: string): string {
    return codigo.trim().toUpperCase();
  }

  private normalizarTexto(
    valor: string | undefined,
    porDefecto: string,
  ): string {
    const texto = valor?.trim();
    return texto ? texto : porDefecto;
  }

  private normalizarTextoOpcional(
    valor?: string,
  ): string | null {
    const texto = valor?.trim();
    return texto ? texto : null;
  }

  private actualizarCampoTexto(
    producto: Producto,
    campo:
      | "serie"
      | "modelo"
      | "marca"
      | "material"
      | "color"
      | "dimensiones"
      | "unidad",
    valor?: string,
  ): void {
    if (valor !== undefined) {
      producto[campo] = this.normalizarTexto(
        valor,
        producto[campo],
      );
    }
  }

  private actualizarCampoOpcional(
    producto: Producto,
    campo:
      | "ubicacion"
      | "custodioActual"
      | "procedencia"
      | "codigoUleam"
      | "observacion",
    valor?: string,
  ): void {
    if (valor !== undefined) {
      producto[campo] = this.normalizarTextoOpcional(valor);
    }
  }

  private obtenerFechaActualISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async convertirAPublico(
    producto: Producto,
  ): Promise<ProductoPublico> {
    const cantidad = await this.obtenerCantidadTotal(producto.id);

    return {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      descripcionBien: producto.nombre,
      categoriaId: producto.categoriaId,
      categoria: {
        id: producto.categoria.id,
        nombre: producto.categoria.nombre,
        estado: producto.categoria.estado,
      },
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
      ubicacion: producto.ubicacion,
      custodioActual: producto.custodioActual,
      procedencia: producto.procedencia,
      codigoUleam: producto.codigoUleam,
      unidad: producto.unidad,
      observacion: producto.observacion,
      fechaRegistro: producto.fechaRegistro,
      cantidad,
      estado: producto.estado,
      createdAt: producto.createdAt,
      updatedAt: producto.updatedAt,
    };
  }
}
