import {
  ConflictException,
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
import { Bodega } from "../bodegas/entities/bodega.entity";
import { Existencia } from "../inventario/entities/existencia.entity";
import { Movimiento } from "../movimientos/entities/movimiento.entity";
import { TipoMovimiento } from "../movimientos/enums/tipo-movimiento.enum";
import { EstadoBienProducto } from "../productos/enums/estado-bien-producto.enum";
import { EstadoProducto } from "../productos/enums/estado-producto.enum";
import { TipoProducto } from "../productos/enums/tipo-producto.enum";
import {
  FiltrarReporteDto,
  TipoPeriodoReporte,
} from "./dto/filtrar-reporte.dto";

interface RangoFechasReporte {
  inicio: Date;
  fin: Date;
  inicioISO: string;
  finISO: string;
  texto: string;
}

interface FiltrosAplicadosReporte {
  periodo: TipoPeriodoReporte;
  fechaInicio: string;
  fechaFin: string;
  tipoProducto: TipoProducto | "todos";
  tipoMovimiento: TipoMovimiento | "todos";
  bodegaId: string | null;
  custodioId: string | null;
  incluirSucursales: boolean;
  buscar: string | null;
}

export interface ReporteInventarioItem {
  id: string;
  productoId: string;
  codigo: string;
  producto: string;
  descripcion: string;
  descripcionBien: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  tipoProducto: TipoProducto;
  empresa: string | null;
  atributo: string | null;
  estadoBien: EstadoBienProducto;
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  procedencia: string | null;
  codigoUleam: string | null;
  ubicacion: string;
  custodioActual: string;
  bodega: string;
  bodegaId: string;
  fechaRegistro: string;
  fechaAsignacion: string;
  observacion: string | null;
}

export interface ReporteMovimientoItem {
  id: string;
  tipo: TipoMovimiento;
  productoId: string | null;
  codigo: string | null;
  producto: string;
  origen: string;
  destino: string;
  cantidad: number;
  cantidadAnterior: number | null;
  cantidadNueva: number | null;
  empresa: string | null;
  usuario: string;
  usuarioId: string;
  fecha: string;
  createdAt: Date;
  observacion: string;
  modulo: string | null;
  accion: string | null;
}

export interface ReporteInventarioPublico {
  generadoEn: Date;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  resumen: {
    totalRegistros: number;
    totalCantidad: number;
    totalConsumibles: number;
    totalNoConsumibles: number;
  };
  items: ReporteInventarioItem[];
}

export interface ReporteMovimientosPublico {
  generadoEn: Date;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  resumen: {
    totalMovimientos: number;
    totalEntradas: number;
    totalTransferencias: number;
    totalBajas: number;
    totalModificaciones: number;
  };
  items: ReporteMovimientoItem[];
}

export interface ReporteGeneralPublico {
  generadoEn: Date;
  periodo: string;
  filtros: FiltrosAplicadosReporte;
  inventario: ReporteInventarioPublico;
  movimientos: ReporteMovimientosPublico;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Existencia)
    private readonly existenciasRepository: Repository<Existencia>,
    @InjectRepository(Movimiento)
    private readonly movimientosRepository: Repository<Movimiento>,
    @InjectRepository(Bodega)
    private readonly bodegasRepository: Repository<Bodega>,
    @InjectRepository(UsuarioBodega)
    private readonly asignacionesRepository: Repository<UsuarioBodega>,
  ) {}

  async generarInventario(
    filtros: FiltrarReporteDto,
  ): Promise<ReporteInventarioPublico> {
    const rango = this.resolverRangoFechas(filtros);
    const filtrosAplicados = await this.resolverFiltrosAplicados(
      filtros,
      rango,
    );

    const consulta = await this.prepararConsultaInventario(
      filtros,
      rango,
    );

    const existencias = await consulta
      .orderBy("bodega.nombre", "ASC")
      .addOrderBy("producto.nombre", "ASC")
      .getMany();

    const items = existencias.map((existencia) =>
      this.convertirInventarioItem(existencia),
    );

    return {
      generadoEn: new Date(),
      periodo: rango.texto,
      filtros: filtrosAplicados,
      resumen: {
        totalRegistros: items.length,
        totalCantidad: items.reduce(
          (total, item) => total + item.cantidad,
          0,
        ),
        totalConsumibles: items.filter(
          (item) => item.tipoProducto === TipoProducto.CONSUMIBLE,
        ).length,
        totalNoConsumibles: items.filter(
          (item) => item.tipoProducto === TipoProducto.NO_CONSUMIBLE,
        ).length,
      },
      items,
    };
  }

  async generarMovimientos(
    filtros: FiltrarReporteDto,
  ): Promise<ReporteMovimientosPublico> {
    const rango = this.resolverRangoFechas(filtros);
    const filtrosAplicados = await this.resolverFiltrosAplicados(
      filtros,
      rango,
    );

    const consulta = await this.prepararConsultaMovimientos(
      filtros,
      rango,
    );

    const movimientos = await consulta
      .orderBy("movimiento.createdAt", "DESC")
      .getMany();

    const items = movimientos.map((movimiento) =>
      this.convertirMovimientoItem(movimiento),
    );

    return {
      generadoEn: new Date(),
      periodo: rango.texto,
      filtros: filtrosAplicados,
      resumen: {
        totalMovimientos: items.length,
        totalEntradas: items.filter(
          (item) => item.tipo === TipoMovimiento.ENTRADA,
        ).length,
        totalTransferencias: items.filter(
          (item) => item.tipo === TipoMovimiento.TRANSFERENCIA,
        ).length,
        totalBajas: items.filter(
          (item) => item.tipo === TipoMovimiento.BAJA,
        ).length,
        totalModificaciones: items.filter(
          (item) => item.tipo === TipoMovimiento.MODIFICACION,
        ).length,
      },
      items,
    };
  }

  async generarGeneral(
    filtros: FiltrarReporteDto,
  ): Promise<ReporteGeneralPublico> {
    const [inventario, movimientos] = await Promise.all([
      this.generarInventario(filtros),
      this.generarMovimientos(filtros),
    ]);

    return {
      generadoEn: new Date(),
      periodo: inventario.periodo,
      filtros: inventario.filtros,
      inventario,
      movimientos,
    };
  }

  private crearConsultaInventario(): SelectQueryBuilder<Existencia> {
    return this.existenciasRepository
      .createQueryBuilder("existencia")
      .leftJoinAndSelect("existencia.producto", "producto")
      .leftJoinAndSelect("producto.categoria", "categoria")
      .leftJoinAndSelect("existencia.bodega", "bodega")
      .leftJoinAndSelect("bodega.asignaciones", "asignacionBodega")
      .leftJoinAndSelect("asignacionBodega.usuario", "usuarioAsignado")
      .where("existencia.cantidad > 0")
      .andWhere("producto.estado = :estadoProducto", {
        estadoProducto: EstadoProducto.ACTIVO,
      })
      .andWhere("producto.estadoBien <> :estadoBienBaja", {
        estadoBienBaja: EstadoBienProducto.BAJA,
      })
      .distinct(true);
  }

  private crearConsultaMovimientos(): SelectQueryBuilder<Movimiento> {
    return this.movimientosRepository
      .createQueryBuilder("movimiento")
      .leftJoinAndSelect("movimiento.producto", "producto")
      .leftJoinAndSelect("producto.categoria", "categoria")
      .leftJoinAndSelect("movimiento.bodegaOrigen", "bodegaOrigen")
      .leftJoinAndSelect("movimiento.bodegaDestino", "bodegaDestino")
      .leftJoinAndSelect("movimiento.usuario", "usuario");
  }

  private async prepararConsultaInventario(
    filtros: FiltrarReporteDto,
    rango: RangoFechasReporte,
  ): Promise<SelectQueryBuilder<Existencia>> {
    const consulta = this.crearConsultaInventario();

    consulta.andWhere("existencia.createdAt >= :fechaInicio", {
      fechaInicio: rango.inicio,
    });
    consulta.andWhere("existencia.createdAt <= :fechaFin", {
      fechaFin: rango.fin,
    });

    if (filtros.tipoProducto) {
      consulta.andWhere("producto.tipoProducto = :tipoProducto", {
        tipoProducto: filtros.tipoProducto,
      });
    }

    if (filtros.bodegaId) {
      const bodegaIds = await this.obtenerBodegasReporte(filtros);
      consulta.andWhere("existencia.bodegaId IN (:...bodegaIds)", {
        bodegaIds,
      });
    }

    if (filtros.custodioId) {
      const bodegaIdsCustodio = await this.obtenerBodegasCustodio(
        filtros.custodioId,
      );

      if (bodegaIdsCustodio.length === 0) {
        consulta.andWhere("1 = 0");
      } else {
        consulta.andWhere(
          "existencia.bodegaId IN (:...bodegaIdsCustodio)",
          { bodegaIdsCustodio },
        );
      }
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

  private async prepararConsultaMovimientos(
    filtros: FiltrarReporteDto,
    rango: RangoFechasReporte,
  ): Promise<SelectQueryBuilder<Movimiento>> {
    const consulta = this.crearConsultaMovimientos();

    consulta.where("movimiento.createdAt >= :fechaInicio", {
      fechaInicio: rango.inicio,
    });
    consulta.andWhere("movimiento.createdAt <= :fechaFin", {
      fechaFin: rango.fin,
    });

    if (filtros.tipoMovimiento) {
      consulta.andWhere("movimiento.tipo = :tipoMovimiento", {
        tipoMovimiento: filtros.tipoMovimiento,
      });
    }

    if (filtros.tipoProducto) {
      consulta.andWhere("producto.tipoProducto = :tipoProducto", {
        tipoProducto: filtros.tipoProducto,
      });
    }

    if (filtros.bodegaId) {
      const bodegaIds = await this.obtenerBodegasReporte(filtros);
      consulta.andWhere(
        `(movimiento.bodegaOrigenId IN (:...bodegaIds)
          OR movimiento.bodegaDestinoId IN (:...bodegaIds))`,
        { bodegaIds },
      );
    }

    if (filtros.custodioId) {
      const bodegaIdsCustodio = await this.obtenerBodegasCustodio(
        filtros.custodioId,
      );

      if (bodegaIdsCustodio.length === 0) {
        consulta.andWhere("1 = 0");
      } else {
        consulta.andWhere(
          `(movimiento.bodegaOrigenId IN (:...bodegaIdsCustodio)
            OR movimiento.bodegaDestinoId IN (:...bodegaIdsCustodio))`,
          { bodegaIdsCustodio },
        );
      }
    }

    if (filtros.buscar?.trim()) {
      const buscar = `%${filtros.buscar.trim().toLowerCase()}%`;
      consulta.andWhere(
        `(LOWER(COALESCE(producto.codigo, '')) LIKE :buscar
          OR LOWER(COALESCE(producto.nombre, '')) LIKE :buscar
          OR LOWER(usuario.nombre) LIKE :buscar
          OR LOWER(COALESCE(movimiento.observacion, '')) LIKE :buscar
          OR LOWER(COALESCE(bodegaOrigen.nombre, '')) LIKE :buscar
          OR LOWER(COALESCE(bodegaDestino.nombre, '')) LIKE :buscar)`,
        { buscar },
      );
    }

    return consulta;
  }

  private async obtenerBodegasReporte(
    filtros: FiltrarReporteDto,
  ): Promise<string[]> {
    if (!filtros.bodegaId) {
      return [];
    }

    const bodega = await this.bodegasRepository.findOne({
      where: { id: filtros.bodegaId },
    });

    if (!bodega) {
      throw new NotFoundException(
        "La bodega seleccionada no existe.",
      );
    }

    if (filtros.incluirSucursales !== "true") {
      return [bodega.id];
    }

    const sucursales = await this.bodegasRepository.find({
      where: {
        bodegaPadreId: bodega.id,
      },
      select: {
        id: true,
      },
    });

    return [
      bodega.id,
      ...sucursales.map((sucursal) => sucursal.id),
    ];
  }

  private async obtenerBodegasCustodio(
    custodioId: string,
  ): Promise<string[]> {
    const asignaciones = await this.asignacionesRepository.find({
      where: {
        usuarioId: custodioId,
      },
      select: {
        bodegaId: true,
      },
    });

    if (asignaciones.length === 0) {
      return [];
    }

    const asignadas = asignaciones.map(
      (asignacion) => asignacion.bodegaId,
    );

    const hijas = await this.bodegasRepository.find({
      where: {
        bodegaPadreId: In(asignadas),
      },
      select: {
        id: true,
      },
    });

    return [
      ...asignadas,
      ...hijas.map((bodega) => bodega.id),
    ];
  }

  private async resolverFiltrosAplicados(
    filtros: FiltrarReporteDto,
    rango: RangoFechasReporte,
  ): Promise<FiltrosAplicadosReporte> {
    if (filtros.bodegaId) {
      const existeBodega = await this.bodegasRepository.exists({
        where: { id: filtros.bodegaId },
      });

      if (!existeBodega) {
        throw new NotFoundException(
          "La bodega seleccionada no existe.",
        );
      }
    }

    if (filtros.custodioId) {
      const asignaciones = await this.asignacionesRepository.count({
        where: { usuarioId: filtros.custodioId },
      });

      if (asignaciones === 0) {
        throw new NotFoundException(
          "El custodio seleccionado no existe o no tiene bodegas asignadas.",
        );
      }
    }

    return {
      periodo: filtros.periodo ?? TipoPeriodoReporte.DIA,
      fechaInicio: rango.inicioISO,
      fechaFin: rango.finISO,
      tipoProducto: filtros.tipoProducto ?? "todos",
      tipoMovimiento: filtros.tipoMovimiento ?? "todos",
      bodegaId: filtros.bodegaId ?? null,
      custodioId: filtros.custodioId ?? null,
      incluirSucursales: filtros.incluirSucursales === "true",
      buscar: filtros.buscar?.trim() || null,
    };
  }

  private resolverRangoFechas(
    filtros: FiltrarReporteDto,
  ): RangoFechasReporte {
    const periodo = filtros.periodo ?? TipoPeriodoReporte.DIA;

    if (periodo === TipoPeriodoReporte.DIA) {
      const fecha = filtros.fecha ?? this.obtenerFechaActualISO();
      return this.crearRangoDia(fecha);
    }

    if (periodo === TipoPeriodoReporte.MES) {
      const mes = filtros.mes ?? this.obtenerMesActualISO();
      return this.crearRangoMes(mes);
    }

    if (periodo === TipoPeriodoReporte.ANIO) {
      const anio = filtros.anio ?? new Date().getFullYear();
      return this.crearRangoAnio(anio);
    }

    const inicio = filtros.fechaInicio ?? this.obtenerFechaActualISO();
    const fin = filtros.fechaFin ?? inicio;
    return this.crearRangoPersonalizado(inicio, fin);
  }

  private crearRangoDia(fecha: string): RangoFechasReporte {
    const inicio = this.crearFechaInicio(fecha);
    const fin = this.crearFechaFin(fecha);

    return {
      inicio,
      fin,
      inicioISO: fecha,
      finISO: fecha,
      texto: fecha,
    };
  }

  private crearRangoMes(mes: string): RangoFechasReporte {
    const [anioTexto, mesTexto] = mes.split("-");
    const anio = Number(anioTexto);
    const mesNumero = Number(mesTexto);

    if (!anio || !mesNumero) {
      throw new ConflictException(
        "El mes del reporte no es válido.",
      );
    }

    const inicioISO = `${anioTexto}-${mesTexto}-01`;
    const ultimoDia = new Date(anio, mesNumero, 0).getDate();
    const finISO = `${anioTexto}-${mesTexto}-${String(ultimoDia).padStart(
      2,
      "0",
    )}`;

    return {
      inicio: this.crearFechaInicio(inicioISO),
      fin: this.crearFechaFin(finISO),
      inicioISO,
      finISO,
      texto: mes,
    };
  }

  private crearRangoAnio(anio: number): RangoFechasReporte {
    const inicioISO = `${anio}-01-01`;
    const finISO = `${anio}-12-31`;

    return {
      inicio: this.crearFechaInicio(inicioISO),
      fin: this.crearFechaFin(finISO),
      inicioISO,
      finISO,
      texto: String(anio),
    };
  }

  private crearRangoPersonalizado(
    fechaInicio: string,
    fechaFin: string,
  ): RangoFechasReporte {
    const inicioISO =
      fechaInicio <= fechaFin ? fechaInicio : fechaFin;
    const finISO = fechaInicio <= fechaFin ? fechaFin : fechaInicio;

    return {
      inicio: this.crearFechaInicio(inicioISO),
      fin: this.crearFechaFin(finISO),
      inicioISO,
      finISO,
      texto: `${inicioISO} - ${finISO}`,
    };
  }

  private crearFechaInicio(fecha: string): Date {
    return new Date(`${fecha}T00:00:00.000Z`);
  }

  private crearFechaFin(fecha: string): Date {
    return new Date(`${fecha}T23:59:59.999Z`);
  }

  private obtenerFechaActualISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private obtenerMesActualISO(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private obtenerCustodioActual(existencia: Existencia): string {
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

  private convertirInventarioItem(
    existencia: Existencia,
  ): ReporteInventarioItem {
    const producto = existencia.producto;

    return {
      id: existencia.id,
      productoId: producto.id,
      codigo: producto.codigo,
      producto: producto.nombre,
      descripcion: producto.nombre,
      descripcionBien: producto.nombre,
      categoria: producto.categoria.nombre,
      unidad: producto.unidad,
      cantidad: existencia.cantidad,
      tipoProducto: producto.tipoProducto,
      empresa: producto.atributo,
      atributo: producto.atributo,
      estadoBien: producto.estadoBien,
      serie: producto.serie,
      modelo: producto.modelo,
      marca: producto.marca,
      material: producto.material,
      color: producto.color,
      dimensiones: producto.dimensiones,
      procedencia: producto.procedencia,
      codigoUleam: producto.codigoUleam,
      ubicacion: existencia.bodega.nombre,
      custodioActual: this.obtenerCustodioActual(existencia),
      bodega: existencia.bodega.nombre,
      bodegaId: existencia.bodegaId,
      fechaRegistro: producto.fechaRegistro,
      fechaAsignacion: existencia.createdAt.toISOString().slice(0, 10),
      observacion: producto.observacion,
    };
  }

  private convertirMovimientoItem(
    movimiento: Movimiento,
  ): ReporteMovimientoItem {
    const producto = movimiento.producto;

    return {
      id: movimiento.id,
      tipo: movimiento.tipo,
      productoId: producto?.id ?? null,
      codigo: producto?.codigo ?? null,
      producto: producto?.nombre ?? "Sin producto",
      origen: movimiento.bodegaOrigen?.nombre ?? "Entrada externa",
      destino: movimiento.bodegaDestino?.nombre ?? "Sin destino",
      cantidad: movimiento.cantidad,
      cantidadAnterior: movimiento.cantidadAnterior,
      cantidadNueva: movimiento.cantidadNueva,
      empresa: producto?.atributo ?? null,
      usuario: movimiento.usuario.nombre,
      usuarioId: movimiento.usuarioId,
      fecha: movimiento.createdAt.toISOString().slice(0, 10),
      createdAt: movimiento.createdAt,
      observacion: movimiento.observacion ?? "Sin observación",
      modulo: movimiento.modulo,
      accion: movimiento.accion,
    };
  }
}
