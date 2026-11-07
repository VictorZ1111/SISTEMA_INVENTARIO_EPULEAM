import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import type { Producto } from "../tipos/producto";
import type { Movimiento } from "../tipos/movimiento";
import type {
  Solicitud,
  EstadoSolicitud,
  ItemSolicitud,
  EntregaSolicitud,
  ResultadoAtencionSolicitud,
} from "../tipos/solicitud";

import { normalizarNombreBodega } from "../utilidades/asignacionesUsuarios";
import {
  ajustarCantidadProductoApi,
  cambiarEstadoProductoApi,
  crearProductoApi,
  editarProductoApi,
  eliminarProductoApi,
  obtenerBodegasInventarioApi,
  obtenerInventarioFrontendApi,
  transferirProductoApi,
  type InventarioFrontendBackend,
} from "../api/inventarioApi";
import {
  obtenerMovimientosApi,
  reversarMovimientoApi,
  type MovimientoBackend,
} from "../api/movimientosApi";
import {
  atenderSolicitudApi,
  crearSolicitudApi,
  obtenerSolicitudesApi,
  rechazarSolicitudApi,
  revertirSolicitudApi,
  type SolicitudBackend,
} from "../api/solicitudesApi";
import { useAuth } from "./AuthContext";
import { useConfiguracion } from "./ConfiguracionContext";

export interface InventarioBodega {
  id: string | number;
  productoId: string | number;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  cantidad: number;
  bodega: string;
  fechaAsignacion: string;
  producto?: Producto;
}

interface DatosDistribucion {
  productoId: string | number;
  cantidad: number;
  destino: string;
  usuario: string;
  observacion: string;
}

interface DatosDistribucionAutomatica {
  productoId: string | number;
  cantidadTotal: number;
  destinos: string[];
  usuario: string;
  observacion: string;
}

type NuevaSolicitud = Omit<Solicitud, "id" | "fecha">;

interface ResultadoOperacionInventario {
  ok: boolean;
  mensaje?: string;
}

interface InventarioContexto {
  productos: Producto[];
  movimientos: Movimiento[];
  inventarioBodegas: InventarioBodega[];
  solicitudes: Solicitud[];
  recargarDatosInventario: () => Promise<void>;

  agregarProducto: (
    producto: Omit<Producto, "id" | "fechaRegistro">,
  ) => Promise<ResultadoOperacionInventario>;
  editarProducto: (
    id: string | number,
    productoActualizado: Omit<Producto, "id" | "fechaRegistro">,
  ) => Promise<ResultadoOperacionInventario>;
  desactivarProducto: (id: string | number) => Promise<boolean>;
  eliminarProducto: (datos: { id: string | number; usuario: string; observacion?: string }) => Promise<boolean>;

  distribuirProducto: (datos: DatosDistribucion) => Promise<boolean>;
  distribuirAutomaticamenteConsumible: (
    datos: DatosDistribucionAutomatica
  ) => Promise<boolean>;

  agregarSolicitud: (solicitud: NuevaSolicitud) => Promise<ResultadoAtencionSolicitud>;
  cambiarEstadoSolicitud: (
    id: string | number,
    estado: EstadoSolicitud,
    observacionAdmin?: string,
  ) => Promise<ResultadoAtencionSolicitud>;
  marcarSolicitudAtendida: (id: string | number) => Promise<void>;
  atenderSolicitud: (
    id: string | number,
    entregas: EntregaSolicitud[],
    observacionAdmin?: string,
  ) => Promise<ResultadoAtencionSolicitud>;
  reversarAtencionSolicitud: (
    id: string | number,
    observacion: string,
  ) => Promise<ResultadoAtencionSolicitud>;
  reversarMovimientoSolicitud: (
    movimientoId: string | number,
    observacion: string,
  ) => Promise<ResultadoAtencionSolicitud>;
  reversarRechazoSolicitud: (
    id: string | number,
    observacion: string,
  ) => Promise<ResultadoAtencionSolicitud>;

  obtenerProductoPorId: (id: string | number) => Producto | undefined;
  obtenerInventarioPorBodega: (nombreBodega: string) => InventarioBodega[];
  obtenerStockBodega: (nombreBodega: string) => number;
}

const InventarioContext = createContext<InventarioContexto | undefined>(
  undefined
);

interface Props {
  children: ReactNode;
}

function convertirMovimientoBackend(movimiento: MovimientoBackend): Movimiento {
  const tipo =
    movimiento.tipo === "salida"
      ? "transferencia"
      : movimiento.tipo === "ajuste"
        ? "modificacion"
        : movimiento.tipo;

  const origen = movimiento.bodegaOrigen?.nombre
    ? normalizarNombreBodega(movimiento.bodegaOrigen.nombre)
    : movimiento.tipo === "entrada"
      ? "Entrada externa"
      : "No especificado";

  const destino = movimiento.bodegaDestino?.nombre
    ? normalizarNombreBodega(movimiento.bodegaDestino.nombre)
    : movimiento.tipo === "baja"
      ? "Producto dado de baja"
      : "No especificado";

  return {
    id: movimiento.id,
    tipo,
    producto: movimiento.producto?.nombre || "Registro del sistema",
    productoId: movimiento.producto?.id,
    codigoProducto: movimiento.producto?.codigo,
    origen,
    destino,
    cantidad: movimiento.cantidad,
    cantidadAnterior: movimiento.cantidadAnterior,
    cantidadNueva: movimiento.cantidadNueva,
    documento: movimiento.solicitudId
      ? `SOL-${movimiento.solicitudId}`
      : `MOV-${movimiento.id.slice(0, 8).toUpperCase()}`,
    fecha: movimiento.createdAt.slice(0, 10),
    createdAt: movimiento.createdAt,
    usuario: movimiento.usuario.nombre,
    observacion: movimiento.observacion || "",
    solicitudId: movimiento.solicitudId,
    solicitudDetalleId: movimiento.solicitudDetalleId,
    movimientoOriginalId: movimiento.movimientoOriginalId,
    modulo: movimiento.modulo,
    accion: movimiento.accion,
    registroId: movimiento.registroId,
  };
}

function convertirSolicitudBackend(solicitud: SolicitudBackend): Solicitud {
  const items: ItemSolicitud[] = solicitud.detalles.map((detalle) => ({
    id: detalle.id,
    productoId: detalle.producto.id,
    productoSolicitado: detalle.producto.nombre,
    cantidad: detalle.cantidadSolicitada,
    cantidadEntregada: detalle.cantidadEntregada,
    cantidadRechazada: detalle.cantidadRechazada,
    cantidadPendiente: detalle.cantidadPendiente,
  }));

  const cantidad = items.reduce((total, item) => total + item.cantidad, 0);
  const cantidadEntregada = items.reduce(
    (total, item) => total + (item.cantidadEntregada || 0),
    0,
  );
  const cantidadRechazada = items.reduce(
    (total, item) => total + (item.cantidadRechazada || 0),
    0,
  );
  const cantidadPendiente = items.reduce(
    (total, item) => total + (item.cantidadPendiente || 0),
    0,
  );

  return {
    id: solicitud.id,
    codigo: solicitud.codigo,
    tipo: "producto",
    solicitante: solicitud.usuarioSolicitante.nombre,
    bodega: normalizarNombreBodega(solicitud.bodegaSolicitante.nombre),
    productoId: items[0]?.productoId,
    productoSolicitado:
      items.length > 1
        ? `${items.length} bienes solicitados`
        : items[0]?.productoSolicitado || "No especificado",
    cantidad,
    cantidadEntregada,
    cantidadRechazada,
    unidad: "Unidad",
    descripcion:
      solicitud.observacionSolicitante ||
      `Solicitud ${solicitud.codigo}`,
    estado: solicitud.estado,
    fecha: solicitud.createdAt.slice(0, 10),
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    atendidaAt: solicitud.atendidaAt,
    reversada: Boolean(solicitud.reversa),
    items,
    pendientesRechazados:
      cantidadPendiente === 0 && cantidadRechazada > 0,
    observacionAdmin: solicitud.observacionAtencion || "",
  };
}

function convertirProductoBackend(
  producto: InventarioFrontendBackend["producto"],
  cantidad: number,
  ubicacion: string,
): Producto {
  return {
    id: producto.id,
    codigo: producto.codigo,
    descripcion: producto.nombre || producto.descripcionBien,
    cantidad,
    tipoProducto: producto.tipoProducto,
    empresa: producto.empresa || undefined,
    serie: producto.serie,
    modelo: producto.modelo,
    marca: producto.marca,
    material: producto.material,
    color: producto.color,
    dimensiones: producto.dimensiones,
    estadoBien:
      producto.estadoBien === "baja" ? "malo" : producto.estadoBien,
    ubicacion: normalizarNombreBodega(ubicacion),
    custodioActual: producto.custodioActual || "Sin asignar",
    procedencia: producto.procedencia || "No especificada",
    codigoUleam: producto.codigoUleam || producto.codigo,
    categoria: producto.categoria.nombre,
    categoriaId: producto.categoria.id,
    unidad: producto.unidad || "Unidad",
    observacion: producto.observacion || "",
    estado: producto.estado,
    fechaRegistro: producto.fechaRegistro,
  };
}

function obtenerMensajeErrorInventario(error: unknown) {
  if (axios.isAxiosError(error)) {
    const mensaje = error.response?.data?.message;
    if (Array.isArray(mensaje)) return mensaje.join(" ");
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje;
    if (!error.response) {
      return "No se pudo conectar con el servidor. Verifica que el backend esté encendido.";
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return "No se pudo completar la operación de inventario.";
}

export function InventarioProvider({ children }: Props) {
  const { usuarioActual, cargandoSesion } = useAuth();
  const { categoriasActivas } = useConfiguracion();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [inventarioBodegas, setInventarioBodegas] = useState<InventarioBodega[]>([]);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);

  const recargarSolicitudesMovimientos = useCallback(async () => {
    if (!usuarioActual) {
      setSolicitudes([]);
      setMovimientos([]);
      return;
    }

    try {
      const [solicitudesBackend, movimientosBackend] = await Promise.all([
        obtenerSolicitudesApi(usuarioActual.rol === "admin"),
        obtenerMovimientosApi(usuarioActual.rol === "admin"),
      ]);

      setSolicitudes(solicitudesBackend.map(convertirSolicitudBackend));
      setMovimientos(movimientosBackend.map(convertirMovimientoBackend));
    } catch (error) {
      setSolicitudes([]);
      setMovimientos([]);
      throw new Error(obtenerMensajeErrorInventario(error));
    }
  }, [usuarioActual]);

  const recargarProductosInventario = useCallback(async () => {
    if (!usuarioActual) {
      setProductos([]);
      setInventarioBodegas([]);
      return;
    }

    try {
      const data = await obtenerInventarioFrontendApi();

      const itemsNormalizados = data
        .map((item) => ({
          ...item,
          bodega: normalizarNombreBodega(item.bodega),
        }))
        .filter((item) => item.cantidad > 0);

      // Vista lógica del Inventario General:
      // consumibles solo si aún tienen stock en General; no consumibles
      // permanecen en el registro maestro mostrando su ubicación actual.
      const productosInventarioGeneral = Array.from(
        new Map(
          itemsNormalizados
            .filter(
              (item) =>
                item.producto.tipoProducto === "no_consumible" ||
                item.bodega === "Inventario General",
            )
            .map((item) => [
              item.productoId,
              convertirProductoBackend(
                item.producto,
                item.cantidad,
                item.bodega,
              ),
            ] as const),
        ).values(),
      );

      const otrosInventarios: InventarioBodega[] = itemsNormalizados
        .filter((item) => item.bodega !== "Inventario General")
        .map((item) => {
          const producto = convertirProductoBackend(
            item.producto,
            item.cantidad,
            item.bodega,
          );

          return {
            id: item.id,
            productoId: item.productoId,
            codigo: item.codigo,
            descripcion: item.descripcion,
            categoria: item.categoria,
            unidad: item.unidad,
            cantidad: item.cantidad,
            bodega: item.bodega,
            fechaAsignacion: item.fechaAsignacion,
            producto,
          };
        });

      setProductos(productosInventarioGeneral);
      setInventarioBodegas(otrosInventarios);
    } catch (error) {
      setProductos([]);
      setInventarioBodegas([]);
      throw new Error(obtenerMensajeErrorInventario(error));
    }
  }, [usuarioActual]);

  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuarioActual) {
      setProductos([]);
      setInventarioBodegas([]);
      return;
    }

    void recargarProductosInventario().catch(() => {
      setProductos([]);
      setInventarioBodegas([]);
    });
  }, [cargandoSesion, usuarioActual, recargarProductosInventario]);

  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuarioActual) {
      setSolicitudes([]);
      setMovimientos([]);
      return;
    }

    void recargarSolicitudesMovimientos().catch(() => {
      setSolicitudes([]);
      setMovimientos([]);
    });
  }, [cargandoSesion, usuarioActual, recargarSolicitudesMovimientos]);

  const buscarCategoriaId = useCallback(
    (nombre: string) =>
      categoriasActivas.find(
        (categoria) =>
          categoria.nombre.localeCompare(nombre, "es", { sensitivity: "base" }) === 0,
      )?.id,
    [categoriasActivas],
  );

  const obtenerBodegasBackend = useCallback(
    async () => obtenerBodegasInventarioApi(),
    [],
  );

  const buscarBodegaPorNombre = useCallback(
    async (nombre: string) => {
      const bodegas = await obtenerBodegasBackend();
      const nombreNormalizado = normalizarNombreBodega(nombre);
      return bodegas.find(
        (bodega) =>
          normalizarNombreBodega(bodega.nombre).localeCompare(
            nombreNormalizado,
            "es",
            { sensitivity: "base" },
          ) === 0,
      );
    },
    [obtenerBodegasBackend],
  );

  const agregarProducto = async (
    nuevoProducto: Omit<Producto, "id" | "fechaRegistro">
  ): Promise<ResultadoOperacionInventario> => {
    const categoriaId =
      nuevoProducto.categoriaId || buscarCategoriaId(nuevoProducto.categoria);

    if (!categoriaId) {
      return {
        ok: false,
        mensaje: "La categoría seleccionada ya no está disponible. Vuelve a seleccionarla.",
      };
    }

    try {
      await crearProductoApi({
        codigo: nuevoProducto.codigo,
        nombre: nuevoProducto.descripcion,
        descripcion: nuevoProducto.descripcion,
        categoriaId,
        tipoProducto: nuevoProducto.tipoProducto,
        empresa: nuevoProducto.empresa ?? null,
        serie: nuevoProducto.serie,
        modelo: nuevoProducto.modelo,
        marca: nuevoProducto.marca,
        material: nuevoProducto.material,
        color: nuevoProducto.color,
        dimensiones: nuevoProducto.dimensiones,
        estadoBien: nuevoProducto.estadoBien,
        ubicacion: "Inventario General",
        custodioActual: nuevoProducto.custodioActual,
        procedencia: nuevoProducto.procedencia,
        codigoUleam: nuevoProducto.codigoUleam,
        unidad: nuevoProducto.unidad,
        observacion: nuevoProducto.observacion,
        cantidad: nuevoProducto.cantidad,
        estado: nuevoProducto.estado,
      });

      try {
        await recargarProductosInventario();
      } catch {
        // La próxima recarga volverá a consultar el inventario real.
      }
      await recargarSolicitudesMovimientos().catch(() => undefined);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const editarProducto = async (
    id: string | number,
    productoActualizado: Omit<Producto, "id" | "fechaRegistro">
  ): Promise<ResultadoOperacionInventario> => {
    const productoOriginal =
      productos.find((producto) => producto.id === id) ||
      inventarioBodegas.find((item) => item.productoId === id)?.producto;

    if (!productoOriginal) {
      return { ok: false, mensaje: "No se encontró el producto que intentas editar." };
    }

    const categoriaId =
      productoActualizado.categoriaId ||
      buscarCategoriaId(productoActualizado.categoria);
    if (!categoriaId) {
      return {
        ok: false,
        mensaje: "La categoría seleccionada ya no está disponible. Vuelve a seleccionarla.",
      };
    }

    try {
      await editarProductoApi(String(id), {
        codigo: productoActualizado.codigo,
        nombre: productoActualizado.descripcion,
        descripcion: productoActualizado.descripcion,
        categoriaId,
        tipoProducto: productoActualizado.tipoProducto,
        empresa: productoActualizado.empresa ?? null,
        serie: productoActualizado.serie,
        modelo: productoActualizado.modelo,
        marca: productoActualizado.marca,
        material: productoActualizado.material,
        color: productoActualizado.color,
        dimensiones: productoActualizado.dimensiones,
        estadoBien: productoActualizado.estadoBien,
        ubicacion: productoOriginal.ubicacion,
        custodioActual: productoActualizado.custodioActual,
        procedencia: productoActualizado.procedencia,
        codigoUleam: productoActualizado.codigoUleam,
        unidad: productoActualizado.unidad,
        observacion: productoActualizado.observacion,
        estado: productoActualizado.estado,
      });

      if (productoActualizado.cantidad !== productoOriginal.cantidad) {
        const bodega = await buscarBodegaPorNombre(productoOriginal.ubicacion);

        if (!bodega) {
          return {
            ok: false,
            mensaje: "No se encontró la bodega actual del producto para ajustar la cantidad.",
          };
        }

        await ajustarCantidadProductoApi({
          productoId: String(id),
          bodegaId: bodega.id,
          cantidadNueva: productoActualizado.cantidad,
          observacion:
            productoActualizado.observacion?.trim() ||
            `Ajuste de cantidad desde edición del producto ${productoActualizado.codigo}.`,
        });
      }

      try {
        await recargarProductosInventario();
      } catch {
        // La próxima recarga volverá a consultar el inventario real.
      }
      await recargarSolicitudesMovimientos().catch(() => undefined);

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const desactivarProducto = async (id: string | number): Promise<boolean> => {
    try {
      await cambiarEstadoProductoApi(String(id), "inactivo");
      await recargarProductosInventario();
      await recargarSolicitudesMovimientos().catch(() => undefined);
      return true;
    } catch (error) {
      console.error(obtenerMensajeErrorInventario(error));
      return false;
    }
  };

  const eliminarProducto = async (datos: {
    id: string | number;
    usuario: string;
    observacion?: string;
  }): Promise<boolean> => {
    try {
      await eliminarProductoApi(
        String(datos.id),
        datos.observacion?.trim() ||
          "Bien dado de baja desde Inventario General.",
      );

      await recargarProductosInventario();
      await recargarSolicitudesMovimientos().catch(() => undefined);
      return true;
    } catch (error) {
      console.error(obtenerMensajeErrorInventario(error));
      return false;
    }
  };

  const distribuirProducto = async (
    datos: DatosDistribucion
  ): Promise<boolean> => {
    const productoEncontrado =
      productos.find((producto) => producto.id === datos.productoId) ||
      inventarioBodegas.find((item) => item.productoId === datos.productoId)?.producto;

    if (!productoEncontrado) return false;
    if (datos.cantidad <= 0) return false;
    if (productoEncontrado.estado === "inactivo") return false;
    if (!datos.destino.trim()) return false;
    if (datos.cantidad > productoEncontrado.cantidad) return false;

    try {
      const [bodegaOrigen, bodegaDestino] = await Promise.all([
        buscarBodegaPorNombre(productoEncontrado.ubicacion),
        buscarBodegaPorNombre(datos.destino),
      ]);

      if (!bodegaOrigen || !bodegaDestino) return false;
      if (bodegaOrigen.id === bodegaDestino.id) return false;

      await transferirProductoApi({
        productoId: String(datos.productoId),
        bodegaOrigenId: bodegaOrigen.id,
        bodegaDestinoId: bodegaDestino.id,
        cantidad: datos.cantidad,
        observacion:
          datos.observacion.trim() ||
          `Transferencia de ${productoEncontrado.descripcion} hacia ${datos.destino}.`,
      });

      await recargarProductosInventario();
      await recargarSolicitudesMovimientos().catch(() => undefined);
      return true;
    } catch (error) {
      console.error(obtenerMensajeErrorInventario(error));
      return false;
    }
  };

  const distribuirAutomaticamenteConsumible = async (
    datos: DatosDistribucionAutomatica
  ): Promise<boolean> => {
    const productoEncontrado = productos.find(
      (producto) => producto.id === datos.productoId
    );

    if (!productoEncontrado) return false;
    if (productoEncontrado.tipoProducto !== "consumible") return false;
    if (productoEncontrado.estado === "inactivo") return false;
    if (datos.cantidadTotal <= 0) return false;
    if (datos.destinos.length === 0) return false;
    if (datos.cantidadTotal > productoEncontrado.cantidad) return false;

    const cantidadPorDestino = datos.cantidadTotal / datos.destinos.length;
    if (!Number.isInteger(cantidadPorDestino)) return false;

    try {
      const bodegaOrigen = await buscarBodegaPorNombre("Inventario General");
      if (!bodegaOrigen) return false;

      const bodegas = await obtenerBodegasBackend();
      const destinos = datos.destinos.map((nombre) => {
        const normalizado = normalizarNombreBodega(nombre);

        return bodegas.find(
          (bodega) =>
            normalizarNombreBodega(bodega.nombre).localeCompare(
              normalizado,
              "es",
              { sensitivity: "base" },
            ) === 0,
        );
      });

      if (destinos.some((destino) => !destino)) return false;

      for (const destino of destinos) {
        if (!destino || destino.id === bodegaOrigen.id) return false;

        await transferirProductoApi({
          productoId: String(datos.productoId),
          bodegaOrigenId: bodegaOrigen.id,
          bodegaDestinoId: destino.id,
          cantidad: cantidadPorDestino,
          observacion:
            datos.observacion.trim() ||
            `Asignación de ${productoEncontrado.descripcion}: ${cantidadPorDestino} hacia ${destino.nombre}.`,
        });
      }

      await recargarProductosInventario();
      await recargarSolicitudesMovimientos().catch(() => undefined);
      return true;
    } catch (error) {
      console.error(obtenerMensajeErrorInventario(error));
      return false;
    }
  };

  const agregarSolicitud = async (
    solicitud: NuevaSolicitud,
  ): Promise<ResultadoAtencionSolicitud> => {
    try {
      const bodega = await buscarBodegaPorNombre(solicitud.bodega);

      if (!bodega) {
        return {
          exito: false,
          mensaje: "No se encontró la bodega seleccionada en el servidor.",
        };
      }

      const items = solicitud.items?.length
        ? solicitud.items
        : [
            {
              productoId: solicitud.productoId,
              productoSolicitado: solicitud.productoSolicitado,
              cantidad: solicitud.cantidad,
            },
          ];

      const detalles = items
        .filter((item) => item.productoId && item.cantidad > 0)
        .map((item) => ({
          productoId: String(item.productoId),
          cantidadSolicitada: item.cantidad,
        }));

      if (detalles.length === 0) {
        return {
          exito: false,
          mensaje: "Agrega al menos un bien válido a la solicitud.",
        };
      }

      await crearSolicitudApi({
        bodegaSolicitanteId: bodega.id,
        observacionSolicitante: solicitud.descripcion?.trim() || undefined,
        detalles,
      });

      await recargarSolicitudesMovimientos();

      return {
        exito: true,
        estado: "pendiente",
        mensaje: "Solicitud enviada correctamente.",
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const cambiarEstadoSolicitud = async (
    id: string | number,
    estado: EstadoSolicitud,
    observacionAdmin = "",
  ): Promise<ResultadoAtencionSolicitud> => {
    if (estado !== "rechazada") {
      return {
        exito: false,
        mensaje: "El cambio solicitado debe realizarse mediante la atención de la solicitud.",
      };
    }

    try {
      const data = await rechazarSolicitudApi(
        String(id),
        observacionAdmin.trim(),
      );

      await Promise.all([
        recargarSolicitudesMovimientos(),
        recargarProductosInventario(),
      ]);

      return {
        exito: true,
        estado: data.estado,
        mensaje: "Solicitud rechazada.",
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const marcarSolicitudAtendida = async (
    _id: string | number,
  ): Promise<void> => {
    await recargarSolicitudesMovimientos();
  };

  const atenderSolicitud = async (
    id: string | number,
    entregas: EntregaSolicitud[],
    observacionAdmin = "",
  ): Promise<ResultadoAtencionSolicitud> => {
    const detalles = entregas
      .filter((entrega) => entrega.cantidad > 0 && entrega.itemId)
      .map((entrega) => ({
        detalleId: String(entrega.itemId),
        cantidadEntregada: entrega.cantidad,
        cantidadRechazada: 0,
      }));

    if (detalles.length === 0) {
      return {
        exito: false,
        mensaje: "No hay cantidades disponibles para atender esta solicitud.",
      };
    }

    try {
      const data = await atenderSolicitudApi(String(id), {
        detalles,
        observacionAtencion: observacionAdmin.trim() || undefined,
      });

      await Promise.all([
        recargarSolicitudesMovimientos(),
        recargarProductosInventario(),
      ]);

      return {
        exito: true,
        estado: data.estado,
        entregasRealizadas: detalles.length,
        mensaje:
          data.estado === "parcial"
            ? "Solicitud atendida parcialmente. Quedaron cantidades pendientes."
            : "Solicitud atendida correctamente.",
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const reversarSolicitudReal = async (
    id: string | number,
    observacion: string,
  ): Promise<ResultadoAtencionSolicitud> => {
    const motivo = observacion.trim();

    if (!motivo) {
      return {
        exito: false,
        mensaje: "Debes escribir el motivo de la reversión.",
      };
    }

    try {
      const data = await revertirSolicitudApi(String(id), motivo);

      await Promise.all([
        recargarSolicitudesMovimientos(),
        recargarProductosInventario(),
      ]);

      return {
        exito: true,
        estado: data.estado,
        mensaje: "La solicitud fue reversada y volvió a pendiente.",
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const reversarAtencionSolicitud = (
    id: string | number,
    observacion: string,
  ) => reversarSolicitudReal(id, observacion);

  const reversarRechazoSolicitud = (
    id: string | number,
    observacion: string,
  ) => reversarSolicitudReal(id, observacion);

  const reversarMovimientoSolicitud = async (
    movimientoId: string | number,
    observacion: string,
  ): Promise<ResultadoAtencionSolicitud> => {
    const motivo = observacion.trim();

    if (!motivo) {
      return {
        exito: false,
        mensaje: "Debes escribir el motivo de la reversión.",
      };
    }

    try {
      await reversarMovimientoApi(String(movimientoId), motivo);

      await Promise.all([
        recargarSolicitudesMovimientos(),
        recargarProductosInventario(),
      ]);

      return {
        exito: true,
        mensaje: "Movimiento reversado correctamente.",
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: obtenerMensajeErrorInventario(error),
      };
    }
  };

  const recargarDatosInventario = useCallback(async () => {
    await Promise.all([
      recargarSolicitudesMovimientos(),
      recargarProductosInventario(),
    ]);
  }, [recargarProductosInventario, recargarSolicitudesMovimientos]);

  const obtenerProductoPorId = (id: string | number) => {
    return (
      productos.find((producto) => producto.id === id) ||
      inventarioBodegas.find((item) => item.productoId === id)?.producto
    );
  };

  const obtenerInventarioPorBodega = (nombreBodega: string) => {
    return inventarioBodegas.filter((item) => item.bodega === nombreBodega);
  };

  const obtenerStockBodega = (nombreBodega: string) => {
    return inventarioBodegas
      .filter((item) => item.bodega === nombreBodega)
      .reduce((total, item) => total + item.cantidad, 0);
  };

  const valor = useMemo(
    () => ({
      productos,
      movimientos,
      inventarioBodegas,
      solicitudes,
      recargarDatosInventario,
      agregarProducto,
      editarProducto,
      desactivarProducto,
      eliminarProducto,
      distribuirProducto,
      distribuirAutomaticamenteConsumible,
      agregarSolicitud,
      cambiarEstadoSolicitud,
      marcarSolicitudAtendida,
      atenderSolicitud,
      reversarAtencionSolicitud,
      reversarMovimientoSolicitud,
      reversarRechazoSolicitud,
      obtenerProductoPorId,
      obtenerInventarioPorBodega,
      obtenerStockBodega,
    }),
    [
      productos,
      movimientos,
      inventarioBodegas,
      solicitudes,
      recargarDatosInventario,
    ]
  );

  return (
    <InventarioContext.Provider value={valor}>
      {children}
    </InventarioContext.Provider>
  );
}

export function useInventario() {
  const contexto = useContext(InventarioContext);

  if (!contexto) {
    throw new Error("useInventario debe usarse dentro de InventarioProvider");
  }

  return contexto;
}