import {
  ArrowDownAZ,
  ArrowUpAZ,
  Edit,
  Plus,
  Paintbrush,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import TablaBase from "../../componentes/TablaBase";
import CampoDesplegable from "../../componentes/CampoDesplegable";

import { useConfiguracion } from "../../contexto/ConfiguracionContext";
import { clienteApi } from "../../api/clienteApi";
import { useUsuarios } from "../../contexto/UsuariosContext";
import { obtenerCustodioAsignado } from "../../utilidades/asignacionesUsuarios";
import { useInventario } from "../../contexto/InventarioContext";
import type { Bodega } from "../../tipos/bodega";
import type {
  EstadoBien,
  EmpresaBien,
  Producto,
  TipoProducto,
} from "../../tipos/producto";

interface BodegaBackendInventario {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: "inventario_general" | "principal" | "sucursal";
  estado: "activa" | "inactiva";
  esSistema: boolean;
  bodegaPadreId: string | null;
  bodegaPadre: { id: string; nombre: string } | null;
}

function convertirBodegaInventario(bodega: BodegaBackendInventario): Bodega {
  return {
    id: bodega.id,
    nombre: bodega.nombre,
    descripcion: bodega.descripcion || "",
    ubicacion: "",
    responsable: "",
    estado: bodega.estado,
    stockTotal: 0,
    tipo: bodega.tipo,
    esSistema: bodega.esSistema,
    bodegaPadreId: bodega.bodegaPadreId,
    bodegaPadre: bodega.bodegaPadre,
  };
}

interface FormularioDistribucion {
  cantidad: string;
  destino: string;
  destinosMultiples: string[];
  observacion: string;
}

interface FormularioProducto {
  codigo: string;
  descripcion: string;
  cantidad: string;
  tipoProducto: TipoProducto;
  empresa: EmpresaBien | "";
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  estadoBien: EstadoBien;
  custodioActual: string;
  procedencia: string;
  codigoUleam: string;
  categoria: string;
  categoriaId: string;
  observacion: string;
}

interface MensajeSistema {
  tipo: "exito" | "error";
  texto: string;
}

type OrdenInventario = "asc" | "desc";
type FiltroTipo = "todos" | TipoProducto;
type FiltroEstadoBien = "todos" | EstadoBien;

interface ItemInventarioGeneral {
  id: string;
  productoId: string | number;
  codigo: string;
  descripcion: string;
  categoria: string;
  cantidad: number;
  ubicacion: string;
  custodioActual: string;
  estadoBien: EstadoBien;
  tipoProducto: TipoProducto;
  empresa: EmpresaBien | "";
  serie: string;
  modelo: string;
  marca: string;
  material: string;
  color: string;
  dimensiones: string;
  procedencia: string;
  codigoUleam: string;
  observacion: string;
  fechaRegistro: string;
  editable: boolean;
  productoOriginal?: Producto;
}

const formularioDistribucionInicial: FormularioDistribucion = {
  cantidad: "1",
  destino: "",
  destinosMultiples: [],
  observacion: "",
};

const formularioProductoInicial: FormularioProducto = {
  codigo: "",
  descripcion: "",
  cantidad: "1",
  tipoProducto: "no_consumible",
  empresa: "BLD",
  serie: "S/N",
  modelo: "",
  marca: "",
  material: "",
  color: "",
  dimensiones: "",
  estadoBien: "bueno",
  custodioActual: "Administrador General",
  procedencia: "",
  codigoUleam: "",
  categoria: "",
  categoriaId: "",
  observacion: "",
};

function obtenerNombreTipo(tipoProducto: TipoProducto) {
  return tipoProducto === "consumible" ? "Consumible" : "No consumible";
}

function obtenerNombreEstado(estadoBien: EstadoBien) {
  if (estadoBien === "bueno") return "Bueno";
  if (estadoBien === "regular") return "Medio";
  return "Malo";
}

function obtenerItemDesdeProducto(producto: Producto): ItemInventarioGeneral {
  return {
    id: `producto-${producto.id}`,
    productoId: producto.id,
    codigo: producto.codigo,
    descripcion: producto.descripcion,
    categoria: producto.categoria,
    cantidad: producto.cantidad,
    ubicacion: producto.ubicacion,
    custodioActual: producto.custodioActual,
    estadoBien: producto.estadoBien,
    tipoProducto: producto.tipoProducto,
    empresa: producto.empresa || "",
    serie: producto.serie,
    modelo: producto.modelo,
    marca: producto.marca,
    material: producto.material,
    color: producto.color,
    dimensiones: producto.dimensiones,
    procedencia: producto.procedencia,
    codigoUleam: producto.codigoUleam,
    observacion: producto.observacion || "",
    fechaRegistro: producto.fechaRegistro,
    editable: true,
    productoOriginal: producto,
  };
}

function InventarioAdmin() {
  const {
    productos,
    agregarProducto,
    editarProducto,
    eliminarProducto,
    distribuirProducto,
    distribuirAutomaticamenteConsumible,
  } = useInventario();

  const { categoriasActivas } = useConfiguracion();
  const { usuarios } = useUsuarios();

  const [modalCrearProducto, setModalCrearProducto] = useState(false);
  const [productoDetalle, setProductoDetalle] =
    useState<ItemInventarioGeneral | null>(null);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoDistribuir, setProductoDistribuir] =
    useState<Producto | null>(null);
  const [productoBaja, setProductoBaja] = useState<Producto | null>(null);
  const [observacionBaja, setObservacionBaja] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("todos");
  const [estadoFiltro, setEstadoFiltro] =
    useState<FiltroEstadoBien>("todos");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [ordenInventario, setOrdenInventario] =
    useState<OrdenInventario>("asc");

  const [mensajeSistema, setMensajeSistema] =
    useState<MensajeSistema | null>(null);

  const [formularioDistribucion, setFormularioDistribucion] =
    useState<FormularioDistribucion>(formularioDistribucionInicial);

  const [formularioProducto, setFormularioProducto] =
    useState<FormularioProducto>(formularioProductoInicial);

  const [bodegasSistema, setBodegasSistema] = useState<Bodega[]>([]);

  useEffect(() => {
    const cargarBodegas = async () => {
      try {
        const { data } = await clienteApi.get<BodegaBackendInventario[]>("/bodegas");
        setBodegasSistema(
          data
            .map(convertirBodegaInventario)
            .filter((bodega) => bodega.estado === "activa"),
        );
      } catch {
        setBodegasSistema([]);
      }
    };

    void cargarBodegas();
  }, []);

  const bodegasDestino = useMemo(
    () =>
      bodegasSistema.filter(
        (bodega) => bodega.nombre !== "Inventario General" && bodega.tipo !== "sucursal",
      ),
    [bodegasSistema],
  );

  const sucursalesTasty = useMemo(
    () =>
      bodegasSistema
        .filter((bodega) => bodega.tipo === "sucursal")
        .map((bodega) => bodega.nombre),
    [bodegasSistema],
  );

  const nombresBodegasDestino = useMemo(
    () => [
      ...bodegasDestino.map((bodega) => bodega.nombre),
      ...sucursalesTasty,
    ],
    [bodegasDestino, sucursalesTasty],
  );

  function obtenerCustodioAutomatico(ubicacion: string) {
    return obtenerCustodioAsignado(usuarios, ubicacion);
  }

  const itemsInventarioGeneral = useMemo(() => {
    // El contexto ya entrega `productos` con la regla completa de Inventario
    // General: consumibles con stock físico en General + no consumibles
    // activos en su ubicación actual. No se agregan aquí existencias de otras
    // bodegas para evitar volver a mostrar consumibles ya transferidos.
    const itemsProductos = productos.map(obtenerItemDesdeProducto);

    return itemsProductos.map((item) => ({
      ...item,
      custodioActual:
        item.productoOriginal?.custodioActual ||
        obtenerCustodioAutomatico(item.ubicacion),
    }));
  }, [productos, usuarios]);

  const filtrosActivos =
    busqueda.trim() !== "" ||
    categoriaFiltro !== "todas" ||
    tipoFiltro !== "todos" ||
    estadoFiltro !== "todos" ||
    bodegaFiltro !== "todas" ||
    ordenInventario !== "asc";

  const mostrarMensaje = (tipo: MensajeSistema["tipo"], texto: string) => {
    setMensajeSistema({ tipo, texto });

    window.setTimeout(() => {
      setMensajeSistema(null);
    }, 3200);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaFiltro("todas");
    setTipoFiltro("todos");
    setEstadoFiltro("todos");
    setBodegaFiltro("todas");
    setOrdenInventario("asc");
  };

  const limpiarNombreBodega = (nombreBodega: string) => {
    if (!nombreBodega || nombreBodega === "Inventario General") {
      return "Ninguna";
    }

    return nombreBodega
      .replace("Bodega ", "")
      .replace("Gastronomía Tasty", "Gastronomía")
      .trim();
  };

  const obtenerBodegaAsignada = (item: ItemInventarioGeneral) => {
    if (nombresBodegasDestino.includes(item.ubicacion)) {
      return limpiarNombreBodega(item.ubicacion);
    }

    return "General";
  };

  const bodegasFiltroDisponibles = useMemo(() => {
    const nombres = itemsInventarioGeneral.map((item) =>
      obtenerBodegaAsignada(item)
    );

    return Array.from(new Set(nombres)).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [itemsInventarioGeneral]);

  const itemsFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const filtrados = itemsInventarioGeneral.filter((item) => {
      const coincideBusqueda =
        texto === "" || item.descripcion.toLowerCase().startsWith(texto);

      const coincideCategoria =
        categoriaFiltro === "todas" ? true : item.categoria === categoriaFiltro;

      const coincideTipo =
        tipoFiltro === "todos" ? true : item.tipoProducto === tipoFiltro;

      const coincideEstado =
        estadoFiltro === "todos" ? true : item.estadoBien === estadoFiltro;

      const coincideBodega =
        bodegaFiltro === "todas"
          ? true
          : obtenerBodegaAsignada(item) === bodegaFiltro;

      return (
        coincideBusqueda &&
        coincideCategoria &&
        coincideTipo &&
        coincideEstado &&
        coincideBodega
      );
    });

    return [...filtrados].sort((a, b) => {
      const comparacion = a.descripcion.localeCompare(b.descripcion, "es", {
        sensitivity: "base",
      });

      return ordenInventario === "asc" ? comparacion : comparacion * -1;
    });
  }, [
    itemsInventarioGeneral,
    busqueda,
    categoriaFiltro,
    tipoFiltro,
    estadoFiltro,
    bodegaFiltro,
    ordenInventario,
  ]);

  const abrirModalCrearProducto = () => {
    const categoriaInicial = categoriasActivas[0];

    setFormularioProducto({
      ...formularioProductoInicial,
      categoria: categoriaInicial?.nombre || "",
      categoriaId: categoriaInicial?.id || "",
    });

    setModalCrearProducto(true);
  };

  const cerrarModalCrearProducto = () => {
    setModalCrearProducto(false);
    setFormularioProducto(formularioProductoInicial);
  };

  const actualizarCampoProducto = <K extends keyof FormularioProducto>(
    campo: K,
    valor: FormularioProducto[K]
  ) => {
    setFormularioProducto((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }));
  };

  const guardarNuevoProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cantidad = Number(formularioProducto.cantidad);

    if (!formularioProducto.codigo.trim()) {
      mostrarMensaje("error", "El código del bien es obligatorio.");
      return;
    }

    if (formularioProducto.descripcion.trim().length < 3) {
      mostrarMensaje("error", "La descripción debe tener al menos 3 caracteres.");
      return;
    }

    if (!formularioProducto.categoriaId) {
      mostrarMensaje("error", "Selecciona una categoría.");
      return;
    }

    if (
      formularioProducto.tipoProducto === "no_consumible" &&
      !formularioProducto.empresa
    ) {
      mostrarMensaje("error", "Selecciona BLD o BCA para el bien no consumible.");
      return;
    }


    if (Number.isNaN(cantidad) || cantidad < 0) {
      mostrarMensaje("error", "La cantidad debe ser válida.");
      return;
    }

    const codigoExiste = productos.some(
      (producto) =>
        producto.codigo.trim().toLowerCase() ===
        formularioProducto.codigo.trim().toLowerCase()
    );

    if (codigoExiste) {
      mostrarMensaje("error", "Ya existe un bien con ese código.");
      return;
    }

    const resultadoAgregar = await agregarProducto({
      codigo: formularioProducto.codigo.trim(),
      descripcion: formularioProducto.descripcion.trim(),
      cantidad,
      tipoProducto: formularioProducto.tipoProducto,
      empresa:
        formularioProducto.tipoProducto === "no_consumible"
          ? (formularioProducto.empresa as EmpresaBien)
          : undefined,
      serie: formularioProducto.serie.trim() || "S/N",
      modelo: formularioProducto.modelo.trim() || "No especificado",
      marca: formularioProducto.marca.trim() || "No especificada",
      material: formularioProducto.material.trim() || "No especificado",
      color: formularioProducto.color.trim() || "No especificado",
      dimensiones: formularioProducto.dimensiones.trim() || "No especificadas",
      estadoBien: formularioProducto.estadoBien,
      ubicacion: "Inventario General",
      custodioActual: "Administrador General",
      procedencia: formularioProducto.procedencia.trim() || "Registro manual",
      codigoUleam:
        formularioProducto.codigoUleam.trim() ||
        formularioProducto.codigo.trim(),
      categoria: formularioProducto.categoria,
      categoriaId: formularioProducto.categoriaId,
      unidad: "Unidad",
      observacion: formularioProducto.observacion.trim(),
      estado: "activo",
    });

    if (!resultadoAgregar.ok) {
      mostrarMensaje(
        "error",
        resultadoAgregar.mensaje || "No se pudo agregar el bien.",
      );
      return;
    }

    cerrarModalCrearProducto();
    mostrarMensaje("exito", "Bien agregado correctamente.");
  };

  const abrirModalEditar = (producto: Producto) => {
    setProductoEditar(producto);

    setFormularioProducto({
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      cantidad: String(producto.cantidad),
      tipoProducto: producto.tipoProducto,
      empresa:
        producto.tipoProducto === "no_consumible"
          ? producto.empresa || "BLD"
          : "",
      serie: producto.serie,
      modelo: producto.modelo,
      marca: producto.marca,
      material: producto.material,
      color: producto.color,
      dimensiones: producto.dimensiones,
      estadoBien: producto.estadoBien,
      custodioActual: obtenerCustodioAutomatico(producto.ubicacion),
      procedencia: producto.procedencia,
      codigoUleam: producto.codigoUleam,
      categoria: producto.categoria,
      categoriaId:
        producto.categoriaId ||
        categoriasActivas.find((categoria) => categoria.nombre === producto.categoria)?.id ||
        "",
      observacion: producto.observacion || "",
    });
  };

  const cerrarModalEditar = () => {
    setProductoEditar(null);
    setFormularioProducto(formularioProductoInicial);
  };

  const guardarEdicionProducto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productoEditar) return;

    const cantidad = Number(formularioProducto.cantidad);

    if (!formularioProducto.codigo.trim()) {
      mostrarMensaje("error", "El código del bien es obligatorio.");
      return;
    }

    if (formularioProducto.descripcion.trim().length < 3) {
      mostrarMensaje("error", "La descripción debe tener al menos 3 caracteres.");
      return;
    }

    if (!formularioProducto.categoriaId) {
      mostrarMensaje("error", "Selecciona una categoría.");
      return;
    }

    if (
      formularioProducto.tipoProducto === "no_consumible" &&
      !formularioProducto.empresa
    ) {
      mostrarMensaje("error", "Selecciona BLD o BCA para el bien no consumible.");
      return;
    }


    if (Number.isNaN(cantidad) || cantidad < 0) {
      mostrarMensaje("error", "La cantidad debe ser válida.");
      return;
    }

    const resultadoEdicion = await editarProducto(productoEditar.id, {
      codigo: formularioProducto.codigo.trim(),
      descripcion: formularioProducto.descripcion.trim(),
      cantidad,
      tipoProducto: formularioProducto.tipoProducto,
      empresa:
        formularioProducto.tipoProducto === "no_consumible"
          ? (formularioProducto.empresa as EmpresaBien)
          : undefined,
      serie: formularioProducto.serie.trim() || "S/N",
      modelo: formularioProducto.modelo.trim() || "No especificado",
      marca: formularioProducto.marca.trim() || "No especificada",
      material: formularioProducto.material.trim() || "No especificado",
      color: formularioProducto.color.trim() || "No especificado",
      dimensiones:
        formularioProducto.dimensiones.trim() || "No especificadas",
      estadoBien: formularioProducto.estadoBien,
      ubicacion: productoEditar.ubicacion,
      custodioActual: obtenerCustodioAutomatico(productoEditar.ubicacion),
      procedencia: formularioProducto.procedencia.trim() || "No especificada",
      codigoUleam:
        formularioProducto.codigoUleam.trim() ||
        formularioProducto.codigo.trim(),
      categoria: formularioProducto.categoria,
      categoriaId: formularioProducto.categoriaId,
      unidad: "Unidad",
      observacion: formularioProducto.observacion.trim(),
      estado: productoEditar.estado,
    });

    if (!resultadoEdicion.ok) {
      mostrarMensaje(
        "error",
        resultadoEdicion.mensaje || "No se pudo actualizar el bien.",
      );
      return;
    }

    cerrarModalEditar();
    mostrarMensaje("exito", "Bien actualizado correctamente.");
  };

  const abrirModalDistribuir = (producto: Producto) => {
    const cantidadInicial = "1";

    setProductoDistribuir(producto);

    const destinoInicial = bodegasDestino[0]?.nombre || "";

    setFormularioDistribucion({
      cantidad: cantidadInicial,
      destino: destinoInicial,
      destinosMultiples: [],
      observacion: "",
    });
  };

  const cerrarModalDistribuir = () => {
    setProductoDistribuir(null);
    setFormularioDistribucion(formularioDistribucionInicial);
  };

  const esBodegaGastronomia = (nombreBodega: string) => {
    return nombreBodega === "Gastronomía Tasty" || nombreBodega === "Gastronomía";
  };

  const esSucursalTasty = (nombreBodega: string) => {
    return sucursalesTasty.includes(nombreBodega);
  };

  const obtenerDestinosSeleccionados = (formulario = formularioDistribucion) => {
    return Array.from(
      new Set(
        [formulario.destino, ...formulario.destinosMultiples].filter(Boolean)
      )
    );
  };

  const obtenerDestinosReales = (destinos: string[]) => {
    const destinosExpandidos = destinos.flatMap((destino) =>
      esBodegaGastronomia(destino) ? sucursalesTasty : [destino]
    );

    return Array.from(new Set(destinosExpandidos));
  };

  const obtenerBodegasDisponiblesParaAgregar = (
    formulario = formularioDistribucion,
    destinoActual = ""
  ) => {
    const destinosSeleccionados = obtenerDestinosSeleccionados(formulario);
    const tieneGastronomia = destinosSeleccionados.some(esBodegaGastronomia);
    const tieneSucursalTasty = destinosSeleccionados.some(esSucursalTasty);

    return bodegasDestino.filter((bodega) => {
      const esDestinoActual = bodega.nombre === destinoActual;

      if (!esDestinoActual && destinosSeleccionados.includes(bodega.nombre)) {
        return false;
      }

      if (!esDestinoActual && tieneGastronomia && esSucursalTasty(bodega.nombre)) {
        return false;
      }

      if (!esDestinoActual && tieneSucursalTasty && esBodegaGastronomia(bodega.nombre)) {
        return false;
      }

      return true;
    });
  };

  const actualizarCampoDistribucion = (
    campo: keyof Omit<FormularioDistribucion, "destinosMultiples">,
    valor: string
  ) => {
    setFormularioDistribucion((formularioActual) => {
      const formularioActualizado: FormularioDistribucion = {
        ...formularioActual,
        [campo]: valor,
      };

      if (campo === "cantidad") {
        const cantidad = Number(valor);

        if (Number.isNaN(cantidad) || cantidad <= 1) {
          formularioActualizado.destinosMultiples = [];
        }
      }

      if (campo === "destino") {
        let destinosFiltrados = formularioActual.destinosMultiples.filter(
          (destinoActual) => destinoActual !== valor
        );

        if (esBodegaGastronomia(valor)) {
          destinosFiltrados = destinosFiltrados.filter(
            (destinoActual) => !esSucursalTasty(destinoActual)
          );
        }

        if (esSucursalTasty(valor)) {
          destinosFiltrados = destinosFiltrados.filter(
            (destinoActual) => !esBodegaGastronomia(destinoActual)
          );
        }

        formularioActualizado.destinosMultiples = destinosFiltrados;
      }

      return formularioActualizado;
    });
  };

  const agregarDestinoMultiple = () => {
    if (!productoDistribuir) {
      return;
    }

    const cantidad = Number(formularioDistribucion.cantidad);

    if (Number.isNaN(cantidad) || cantidad <= 1) {
      mostrarMensaje(
        "error",
        "Para seleccionar más de una bodega, la cantidad debe ser mayor a 1."
      );
      return;
    }

    const siguienteDestinoDisponible = obtenerBodegasDisponiblesParaAgregar()[0];

    if (!siguienteDestinoDisponible) {
      mostrarMensaje("error", "No hay más bodegas disponibles para agregar.");
      return;
    }

    setFormularioDistribucion((formularioActual) => ({
      ...formularioActual,
      destinosMultiples: [
        ...formularioActual.destinosMultiples,
        siguienteDestinoDisponible.nombre,
      ],
    }));
  };

  const actualizarDestinoMultiple = (indice: number, destino: string) => {
    setFormularioDistribucion((formularioActual) => ({
      ...formularioActual,
      destinosMultiples: formularioActual.destinosMultiples.map(
        (destinoActual, indiceActual) =>
          indiceActual === indice ? destino : destinoActual
      ),
    }));
  };

  const quitarDestinoMultiple = (indice: number) => {
    setFormularioDistribucion((formularioActual) => ({
      ...formularioActual,
      destinosMultiples: formularioActual.destinosMultiples.filter(
        (_, indiceActual) => indiceActual !== indice
      ),
    }));
  };

  const guardarDistribucion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!productoDistribuir) return;

    const cantidad = Number(formularioDistribucion.cantidad);

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      mostrarMensaje("error", "Ingresa una cantidad válida.");
      return;
    }

    if (cantidad > productoDistribuir.cantidad) {
      mostrarMensaje(
        "error",
        `Solo hay ${productoDistribuir.cantidad} disponibles para asignar.`
      );
      return;
    }

    if (productoDistribuir.tipoProducto === "consumible") {
      const destinosSeleccionados = obtenerDestinosSeleccionados();
      const destinosAutomaticos = obtenerDestinosReales(destinosSeleccionados);

      if (!formularioDistribucion.destino) {
        mostrarMensaje("error", "Selecciona una bodega destino.");
        return;
      }

      if (destinosAutomaticos.length > 1) {
        if (cantidad < destinosAutomaticos.length) {
          mostrarMensaje(
            "error",
            `La cantidad debe alcanzar para los ${destinosAutomaticos.length} destinos seleccionados.`
          );
          return;
        }

        if (cantidad % destinosAutomaticos.length !== 0) {
          mostrarMensaje(
            "error",
            `La cantidad debe dividirse exactamente entre ${destinosAutomaticos.length} destinos.`
          );
          return;
        }

        const resultado = await distribuirAutomaticamenteConsumible({
          productoId: productoDistribuir.id,
          cantidadTotal: cantidad,
          destinos: destinosAutomaticos,
          usuario: "Administrador General",
          observacion: formularioDistribucion.observacion,
        });

        if (!resultado) {
          mostrarMensaje(
            "error",
            "No se pudo distribuir. Revisa que exista stock suficiente."
          );
          return;
        }

        cerrarModalDistribuir();
        mostrarMensaje(
          "exito",
          "Producto distribuido automáticamente entre los destinos seleccionados."
        );
        return;
      }
    }

    const resultado = await distribuirProducto({
      productoId: productoDistribuir.id,
      cantidad,
      destino: formularioDistribucion.destino,
      usuario: "Administrador General",
      observacion: formularioDistribucion.observacion,
    });

    if (!resultado) {
      mostrarMensaje(
        "error",
        "No se pudo asignar el producto. Revisa la cantidad disponible o el estado del producto."
      );
      return;
    }

    cerrarModalDistribuir();

    mostrarMensaje(
      "exito",
      productoDistribuir.tipoProducto === "consumible"
        ? "Producto consumible asignado correctamente."
        : "Bien asignado o reasignado correctamente."
    );
  };

  const puedeAsignarse = (producto: Producto) => {
    if (producto.estado === "inactivo") return false;

    if (producto.tipoProducto === "consumible") {
      return producto.cantidad > 0;
    }

    return true;
  };

  const confirmarBajaProducto = async () => {
    if (!productoBaja) return;

    const productoEliminado = await eliminarProducto({
      id: productoBaja.id,
      usuario: "Administrador General",
      observacion:
        observacionBaja.trim() ||
        "Producto dado de baja desde Inventario General.",
    });

    if (!productoEliminado) {
      mostrarMensaje("error", "No se pudo dar de baja el bien.");
      return;
    }

    setProductoBaja(null);
    setObservacionBaja("");
    mostrarMensaje("exito", "Bien dado de baja correctamente. El registro quedó en movimientos.");
  };

  return (
    <div className="pagina-admin pagina-inventario-fija">
      <style>
        {`
          html,
          body,
          #root {
            height: 100%;
            overflow: hidden;
          }

          body:has(.pagina-inventario-fija) {
            overflow: hidden !important;
          }

          .contenido-principal:has(.pagina-inventario-fija),
          .contenido-dashboard:has(.pagina-inventario-fija),
          .layout-contenido:has(.pagina-inventario-fija),
          .main-content:has(.pagina-inventario-fija) {
            overflow: hidden !important;
          }

          .pagina-inventario-fija {
            height: calc(100vh - 34px);
            max-height: calc(100vh - 34px);
            overflow: hidden !important;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            padding-bottom: 0 !important;
          }

          .encabezado-inventario-personalizado {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 22px;
            flex-shrink: 0;
          }

          .encabezado-inventario-personalizado h1 {
            margin: 0 0 6px;
            font-size: 40px;
            line-height: 1.08;
            color: #020617;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          .encabezado-inventario-personalizado p {
            margin: 0;
            color: #64748b;
            font-size: 20px;
            line-height: 1.35;
          }

          .inventario-boton-agregar {
            align-self: flex-start;
            position: relative;
            top: 86px;
            margin-top: 0;
            margin-bottom: 0;
            z-index: 2;
          }

          .seccion-inventario-fija {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden !important;
            padding-bottom: 0 !important;
          }

          .barra-filtros-inventario {
            flex-shrink: 0;
            margin-bottom: 10px;
          }

          .tabla-inventario-scroll {
            height: calc(100vh - 272px);
            max-height: calc(100vh - 272px);
            min-height: 280px;
            overflow-y: auto !important;
            overflow-x: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            background: #ffffff;
            position: relative;
          }

          .tabla-inventario-scroll .tabla-card {
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          .tabla-inventario-scroll .tabla-contenedor {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .tabla-inventario-scroll table {
            width: 100%;
            border-collapse: separate !important;
            border-spacing: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }

          .tabla-inventario-scroll table thead {
            position: sticky !important;
            top: 0 !important;
            z-index: 80 !important;
            background: #ffffff !important;
          }

          .tabla-inventario-scroll table thead tr {
            background: #ffffff !important;
          }

          .tabla-inventario-scroll table thead th {
            position: sticky !important;
            top: 0 !important;
            z-index: 90 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          .tabla-inventario-scroll tbody tr:last-child td {
            border-bottom: none;
          }

          .modal-producto-compacto {
            max-height: 92vh;
          }

          .modal-producto-compacto .formulario-modal {
            padding: 16px 24px 20px;
          }

          .modal-producto-compacto .grid-formulario {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px 14px;
          }

          .modal-producto-compacto .campo-formulario label {
            margin-bottom: 5px;
            font-size: 12.5px;
            line-height: 1.2;
          }

          .modal-producto-compacto .campo-formulario input,
          .modal-producto-compacto .campo-formulario select {
            min-height: 42px;
            font-size: 14px;
            padding: 9px 11px;
          }

          .modal-producto-compacto .campo-formulario textarea {
            min-height: 62px;
            font-size: 14px;
            padding: 9px 11px;
          }

          .modal-producto-compacto .modal-acciones {
            position: static;
            border-top: 1px solid #e5e7eb;
            margin-top: 18px;
            padding-top: 16px;
            background: #ffffff;
          }

          .modal-detalle-producto {
            max-width: 1080px;
            max-height: 92vh;
          }

          .modal-detalle-producto .modal-header {
            padding: 20px 26px 16px;
          }

          .detalle-producto-cabecera {
            padding: 16px 26px 8px;
          }

          .detalle-producto-resumen {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            background: #f9fafb;
          }

          .detalle-producto-resumen h3 {
            margin: 0 0 4px;
            font-size: 18px;
            color: #111827;
            font-weight: 900;
            line-height: 1.25;
          }

          .detalle-producto-resumen p {
            margin: 0;
            color: #64748b;
            font-size: 13px;
          }

          .detalle-producto-grid {
            padding: 10px 26px 22px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 9px;
          }

          .detalle-producto-item {
            padding: 9px 11px;
            border: 1px solid #e5e7eb;
            border-radius: 11px;
            background: #ffffff;
            min-width: 0;
          }

          .detalle-producto-item span {
            display: block;
            margin-bottom: 3px;
            color: #374151;
            font-size: 11px;
            font-weight: 900;
          }

          .detalle-producto-item p {
            margin: 0;
            color: #111827;
            font-size: 13px;
            font-weight: 400;
            line-height: 1.3;
            overflow-wrap: anywhere;
          }

          .detalle-producto-observacion {
            grid-column: 1 / -1;
          }

          .stock-disponible-asignacion {
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            width: 100%;
            min-width: 0;
            max-width: none;
            min-height: 42px;
            margin: 0;
            padding: 10px 12px;
            border: 1px solid #dbeafe;
            border-radius: 14px;
            background: #f8fafc;
            color: #334155;
            font-size: 13px;
            font-weight: 800;
          }

          .stock-disponible-asignacion strong {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 46px;
            padding: 4px 10px;
            border-radius: 999px;
            background: #111827;
            color: #ffffff;
            font-size: 14px;
            font-weight: 900;
          }

          .modal-distribucion-compacto {
            max-width: 900px;
            max-height: 92vh;
          }

          .modal-distribucion-compacto .modal-header {
            padding: 22px 28px 18px;
          }

          .modal-distribucion-compacto .formulario-modal {
            padding: 20px 28px 22px;
          }

          .modal-distribucion-compacto .grid-formulario {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 20px;
          }

          .modal-distribucion-compacto .grid-formulario-asignacion {
            grid-template-columns: minmax(0, 1fr) 260px;
            align-items: end;
          }

          .modal-distribucion-compacto .campo-formulario label {
            margin-bottom: 6px;
            font-size: 13px;
          }

          .modal-distribucion-compacto .campo-formulario input,
          .modal-distribucion-compacto .campo-formulario select {
            min-height: 42px;
          }

          .modal-distribucion-compacto .campo-formulario textarea {
            min-height: 78px;
          }

          .modal-distribucion-compacto > .formulario-modal > .campo-formulario.campo-completo {
            margin-top: 16px;
          }

          .modal-distribucion-compacto .modal-acciones {
            position: static;
            border-top: 1px solid #e5e7eb;
            margin-top: 14px;
            padding-top: 16px;
            background: #ffffff;
          }

          .selector-destino-multiple {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
          }

          .selectores-destino-adicionales {
            display: grid;
            gap: 10px;
            margin-top: 10px;
          }

          .fila-destino-adicional {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
          }

          .boton-quitar-destino {
            height: 42px;
            width: 42px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            color: #111827;
            border-radius: 10px;
            padding: 0;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .boton-agregar-destino {
            height: 42px;
            border: 1px solid #111827;
            background: #111827;
            color: #ffffff;
            border-radius: 10px;
            padding: 0 14px;
            font-weight: 800;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
          }

          .lista-destinos-seleccionados {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
          }

          .chip-destino {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            color: #111827;
            border-radius: 999px;
            padding: 8px 10px 8px 12px;
            font-size: 13px;
            font-weight: 800;
          }

          .chip-destino button {
            width: 20px;
            height: 20px;
            border: none;
            border-radius: 999px;
            background: #e5e7eb;
            color: #111827;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            padding: 0;
          }

          .resumen-distribucion {
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            border-radius: 14px;
            padding: 10px 12px;
            color: #475569;
            font-size: 13px;
            line-height: 1.4;
          }

          .boton-agregar-destino:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
        `}
      </style>

      <div className="encabezado-inventario-personalizado">
        <div>
          <h1>Inventario General</h1>
          <p>Registro general de todos los bienes institucionales.</p>
        </div>

        <button
          className="boton-principal inventario-boton-agregar"
          type="button"
          onClick={abrirModalCrearProducto}
        >
          <Plus size={18} />
          Agregar bien
        </button>
      </div>

      {mensajeSistema && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "28px",
            zIndex: 150,
            padding: "14px 18px",
            borderRadius: "12px",
            background:
              mensajeSistema.tipo === "exito" ? "#dcfce7" : "#fee2e2",
            color: mensajeSistema.tipo === "exito" ? "#15803d" : "#b91c1c",
            border:
              mensajeSistema.tipo === "exito"
                ? "1px solid #bbf7d0"
                : "1px solid #fecaca",
            fontWeight: 700,
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
          }}
        >
          {mensajeSistema.texto}
        </div>
      )}

      <section className="seccion-dashboard seccion-inventario-fija">
        <div
          className="buscador-tabla barra-filtros-inventario"
          style={{ alignItems: "center" }}
        >
          <div className="buscador-input-contenedor">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar bien..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <CampoDesplegable
            valor={categoriaFiltro}
            ariaLabel="Filtrar por categoría"
            className="filtro-categoria"
            onChange={setCategoriaFiltro}
            opciones={[
              { valor: "todas", texto: "Todas las categorías" },
              ...categoriasActivas.map((categoria) => ({
                valor: categoria.nombre,
                texto: categoria.nombre,
              })),
            ]}
          />

          <CampoDesplegable
            valor={estadoFiltro}
            ariaLabel="Filtrar por estado"
            className="filtro-estado"
            onChange={(valor) => setEstadoFiltro(valor as FiltroEstadoBien)}
            opciones={[
              { valor: "todos", texto: "Todo estado" },
              { valor: "bueno", texto: "Bueno" },
              { valor: "regular", texto: "Medio" },
              { valor: "malo", texto: "Malo" },
            ]}
          />

          <CampoDesplegable
            valor={tipoFiltro}
            ariaLabel="Filtrar por tipo"
            className="filtro-tipo"
            onChange={(valor) => setTipoFiltro(valor as FiltroTipo)}
            opciones={[
              { valor: "todos", texto: "Todo tipo" },
              { valor: "consumible", texto: "Consumible" },
              { valor: "no_consumible", texto: "No consumible" },
            ]}
          />

          <CampoDesplegable
            valor={bodegaFiltro}
            ariaLabel="Filtrar por bodega"
            className="filtro-bodega"
            onChange={setBodegaFiltro}
            opciones={[
              { valor: "todas", texto: "Todas las bodegas" },
              ...bodegasFiltroDisponibles.map((bodega) => ({
                valor: bodega,
                texto: bodega,
              })),
            ]}
          />

          <button
            type="button"
            onClick={() =>
              setOrdenInventario((ordenActual) =>
                ordenActual === "asc" ? "desc" : "asc"
              )
            }
            title={
              ordenInventario === "asc"
                ? "Orden ascendente"
                : "Orden descendente"
            }
            style={{
              width: "54px",
              height: "45px",
              minWidth: "54px",
              padding: 0,
              margin: 0,
              boxSizing: "border-box",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              lineHeight: 0,
            }}
          >
            {ordenInventario === "asc" ? (
              <ArrowDownAZ size={19} />
            ) : (
              <ArrowUpAZ size={19} />
            )}
          </button>

          <button
            type="button"
            onClick={limpiarFiltros}
            disabled={!filtrosActivos}
            title="Limpiar filtros"
            style={{
              width: "54px",
              height: "45px",
              minWidth: "54px",
              padding: 0,
              margin: 0,
              boxSizing: "border-box",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: filtrosActivos ? 1 : 0.55,
              cursor: filtrosActivos ? "pointer" : "not-allowed",
              lineHeight: 0,
            }}
          >
            <Paintbrush size={18} />
          </button>
        </div>

        <div className="tabla-inventario-scroll">
          <TablaBase
            columnas={[
              "Código",
              "Bien",
              "Atributo",
              "Cantidad",
              "Bodega",
              "Estado",
              "Acciones",
            ]}
            mensajeVacio="No existen bienes registrados en el inventario"
          >
            {itemsFiltrados.length > 0
              ? itemsFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.codigo}</strong>
                    </td>

                    <td>
                      <div className="celda-producto">
                        <strong>{item.descripcion}</strong>

                        <span>{item.categoria}</span>
                      </div>
                    </td>

                    <td>
                      {item.tipoProducto === "no_consumible"
                        ? item.empresa || "No registrado"
                        : "No aplica"}
                    </td>

                    <td>
                      <strong>{item.cantidad}</strong>
                    </td>

                    <td>{obtenerBodegaAsignada(item)}</td>

                    <td>
                      <span
                        className={`badge-bien badge-bien-${item.estadoBien}`}
                      >
                        {obtenerNombreEstado(item.estadoBien)}
                      </span>
                    </td>

                    <td>
                      <div className="acciones-tabla">
                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Ver información"
                          onClick={() => setProductoDetalle(item)}
                          style={{ fontWeight: 800 }}
                        >
                          !
                        </button>

                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Editar información"
                          disabled={!item.productoOriginal}
                          onClick={() =>
                            item.productoOriginal &&
                            abrirModalEditar(item.productoOriginal)
                          }
                        >
                          <Edit size={17} />
                        </button>

                        <button
                          className="boton-icono-tabla"
                          type="button"
                          title="Asignar producto"
                          disabled={
                            !item.productoOriginal ||
                            !puedeAsignarse(item.productoOriginal)
                          }
                          onClick={() =>
                            item.productoOriginal &&
                            abrirModalDistribuir(item.productoOriginal)
                          }
                        >
                          <Send size={17} />
                        </button>

                        <button
                          className="boton-icono-tabla boton-icono-peligro"
                          type="button"
                          title="Dar de baja"
                          disabled={!item.productoOriginal}
                          onClick={() =>
                            item.productoOriginal &&
                            setProductoBaja(item.productoOriginal)
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </TablaBase>
        </div>
      </section>

      {productoDetalle && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-detalle-producto">
            <div className="modal-header">
              <div>
                <h2>Información del bien</h2>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => setProductoDetalle(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="detalle-producto-cabecera">
              <div className="detalle-producto-resumen">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>
                    {productoDetalle.descripcion}
                  </h3>

                  <p>
                    Código: {productoDetalle.codigo}
                  </p>
                </div>

                <span
                  className={`badge-bien badge-bien-${productoDetalle.estadoBien}`}
                >
                  {obtenerNombreEstado(productoDetalle.estadoBien)}
                </span>
              </div>
            </div>

            <div className="detalle-producto-grid">
              {[
                {
                  campo: "Tipo",
                  valor: obtenerNombreTipo(productoDetalle.tipoProducto),
                },
                {
                  campo: "Atributo",
                  valor:
                    productoDetalle.tipoProducto === "no_consumible"
                      ? productoDetalle.empresa || "No registrado"
                      : "No aplica",
                },
                {
                  campo: "Código ULEAM",
                  valor: productoDetalle.codigoUleam,
                },
                {
                  campo: "Cantidad",
                  valor: String(productoDetalle.cantidad),
                },
                {
                  campo: "Categoría",
                  valor: productoDetalle.categoria,
                },
                {
                  campo: "Bodega asignada",
                  valor: obtenerBodegaAsignada(productoDetalle),
                },
                {
                  campo: "Custodio actual",
                  valor: productoDetalle.custodioActual,
                },
                {
                  campo: "Serie",
                  valor: productoDetalle.serie,
                },
                {
                  campo: "Modelo",
                  valor: productoDetalle.modelo,
                },
                {
                  campo: "Marca",
                  valor: productoDetalle.marca,
                },
                {
                  campo: "Material",
                  valor: productoDetalle.material,
                },
                {
                  campo: "Color",
                  valor: productoDetalle.color,
                },
                {
                  campo: "Dimensiones",
                  valor: productoDetalle.dimensiones,
                },
                {
                  campo: "Procedencia",
                  valor: productoDetalle.procedencia,
                },
                {
                  campo: "Fecha de registro",
                  valor: productoDetalle.fechaRegistro,
                },
              ].map((item) => (
                <div key={item.campo} className="detalle-producto-item">
                  <span>
                    {item.campo}
                  </span>

                  <p>
                    {item.valor || "No especificado"}
                  </p>
                </div>
              ))}

              <div className="detalle-producto-item detalle-producto-observacion">
                <span>
                  Observación
                </span>

                <p>
                  {productoDetalle.observacion || "Sin observación"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalCrearProducto && (
        <div className="modal-fondo">
          <div
            className="modal-contenedor modal-grande modal-producto-compacto"
            style={{ maxWidth: 1320 }}
          >
            <div className="modal-header">
              <div>
                <h2>Agregar bien</h2>
                <p>Registra el bien según los datos del acta institucional.</p>
              </div>


            </div>

            <form className="formulario-modal" onSubmit={guardarNuevoProducto}>
              <div className="formulario-producto-secciones formulario-producto-unificado">
                <section className="grupo-formulario-producto grupo-formulario-producto-completo">
                  <div className="grupo-formulario-titulo">
                    <h3>Datos del bien</h3>
                    <p>Información principal, características físicas y procedencia del registro.</p>
                  </div>

                  <div className="grid-formulario grid-formulario-producto-unificado">
                    <div className="campo-formulario">
                      <label>Código *</label>
                      <input
                        required
                        value={formularioProducto.codigo}
                        onChange={(e) =>
                          actualizarCampoProducto("codigo", e.target.value)
                        }
                        placeholder="Ej: LIM-001"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Código ULEAM</label>
                      <input
                        value={formularioProducto.codigoUleam}
                        onChange={(e) =>
                          actualizarCampoProducto("codigoUleam", e.target.value)
                        }
                        placeholder="Código institucional"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Cantidad *</label>
                      <input
                        required
                        min="0"
                        type="number"
                        value={formularioProducto.cantidad}
                        onChange={(e) =>
                          actualizarCampoProducto("cantidad", e.target.value)
                        }
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Tipo *</label>
                      <CampoDesplegable mostrarIconoFiltro={false}
                        valor={formularioProducto.tipoProducto}
                        ariaLabel="Seleccionar tipo de bien"
                        onChange={(valor) => {
                          const tipoProducto = valor as TipoProducto;
                          setFormularioProducto((formularioActual) => ({
                            ...formularioActual,
                            tipoProducto,
                            empresa:
                              tipoProducto === "consumible"
                                ? ""
                                : formularioActual.empresa || "BLD",
                          }));
                        }}
                        opciones={[
                          { valor: "consumible", texto: "Consumible" },
                          { valor: "no_consumible", texto: "No consumible" },
                        ]}
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Atributo *</label>
                      <CampoDesplegable
                        mostrarIconoFiltro={false}
                        valor={formularioProducto.empresa}
                        ariaLabel="Seleccionar atributo del bien"
                        deshabilitado={formularioProducto.tipoProducto === "consumible"}
                        onChange={(valor) =>
                          actualizarCampoProducto("empresa", valor as EmpresaBien | "")
                        }
                        opciones={
                          formularioProducto.tipoProducto === "consumible"
                            ? [{ valor: "", texto: "No aplica" }]
                            : [
                                { valor: "BLD", texto: "BLD" },
                                { valor: "BCA", texto: "BCA" },
                              ]
                        }
                      />
                    </div>

                    <div className="campo-formulario campo-producto-descripcion">
                      <label>Descripción / Bien *</label>
                      <input
                        required
                        value={formularioProducto.descripcion}
                        onChange={(e) =>
                          actualizarCampoProducto("descripcion", e.target.value)
                        }
                        placeholder="Ej: Silla ergonómica color negro"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Categoría *</label>
                      <CampoDesplegable mostrarIconoFiltro={false}
                        valor={formularioProducto.categoriaId}
                        ariaLabel="Seleccionar categoría"
                        onChange={(valor) => {
                          const categoria = categoriasActivas.find(
                            (item) => item.id === valor,
                          );

                          setFormularioProducto((formularioActual) => ({
                            ...formularioActual,
                            categoriaId: valor,
                            categoria: categoria?.nombre || "",
                          }));
                        }}
                        opciones={[
                          { valor: "", texto: "Selecciona una categoría" },
                          ...categoriasActivas.map((categoria) => ({
                            valor: categoria.id,
                            texto: categoria.nombre,
                          })),
                        ]}
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Estado *</label>
                      <CampoDesplegable mostrarIconoFiltro={false}
                        valor={formularioProducto.estadoBien}
                        ariaLabel="Seleccionar estado"
                        onChange={(valor) =>
                          actualizarCampoProducto("estadoBien", valor as EstadoBien)
                        }
                        opciones={[
                          { valor: "bueno", texto: "Bueno" },
                          { valor: "regular", texto: "Medio" },
                          { valor: "malo", texto: "Malo" },
                        ]}
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Ubicación</label>
                      <input value="General" disabled />
                    </div>

                    <div className="campo-formulario">
                      <label>Serie</label>
                      <input
                        value={formularioProducto.serie}
                        onChange={(e) =>
                          actualizarCampoProducto("serie", e.target.value)
                        }
                        placeholder="S/N"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Marca</label>
                      <input
                        value={formularioProducto.marca}
                        onChange={(e) =>
                          actualizarCampoProducto("marca", e.target.value)
                        }
                        placeholder="No especificada"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Modelo</label>
                      <input
                        value={formularioProducto.modelo}
                        onChange={(e) =>
                          actualizarCampoProducto("modelo", e.target.value)
                        }
                        placeholder="No especificado"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Color</label>
                      <input
                        value={formularioProducto.color}
                        onChange={(e) =>
                          actualizarCampoProducto("color", e.target.value)
                        }
                        placeholder="No especificado"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Material</label>
                      <input
                        value={formularioProducto.material}
                        onChange={(e) =>
                          actualizarCampoProducto("material", e.target.value)
                        }
                        placeholder="No especificado"
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>Dimensiones</label>
                      <input
                        value={formularioProducto.dimensiones}
                        onChange={(e) =>
                          actualizarCampoProducto("dimensiones", e.target.value)
                        }
                        placeholder="No especificadas"
                      />
                    </div>

                    <div className="campo-formulario campo-producto-procedencia">
                      <label>Procedencia</label>
                      <input
                        value={formularioProducto.procedencia}
                        onChange={(e) =>
                          actualizarCampoProducto("procedencia", e.target.value)
                        }
                        placeholder="Ej: Compra institucional"
                      />
                    </div>
                  </div>
                </section>

                <section className="grupo-formulario-producto grupo-formulario-producto-completo grupo-formulario-observacion">
                  <div className="campo-formulario campo-producto-observacion">
                    <label>Observación</label>
                    <textarea
                      value={formularioProducto.observacion}
                      onChange={(e) =>
                        actualizarCampoProducto("observacion", e.target.value)
                      }
                      placeholder="Detalle adicional"
                    />
                  </div>
                </section>
              </div>

              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModalCrearProducto}
                >
                  Cancelar
                </button>

                <button className="boton-principal" type="submit">
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productoEditar && (
        <div className="modal-fondo">
          <div
            className="modal-contenedor modal-grande modal-producto-compacto"
            style={{ maxWidth: 1320 }}
          >
            <div className="modal-header">
              <div>
                <h2>Editar información</h2>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={cerrarModalEditar}
              >
                <X size={20} />
              </button>
            </div>

            <form className="formulario-modal" onSubmit={guardarEdicionProducto}>
              <div className="grid-formulario grid-formulario-editar-producto">
                <div className="campo-formulario">
                  <label>Código *</label>
                  <input
                    required
                    value={formularioProducto.codigo}
                    onChange={(e) =>
                      actualizarCampoProducto("codigo", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Código ULEAM</label>
                  <input
                    value={formularioProducto.codigoUleam}
                    onChange={(e) =>
                      actualizarCampoProducto("codigoUleam", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Cantidad *</label>
                  <input
                    required
                    min="0"
                    type="number"
                    value={formularioProducto.cantidad}
                    onChange={(e) =>
                      actualizarCampoProducto("cantidad", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Tipo *</label>
                  <CampoDesplegable mostrarIconoFiltro={false}
                    valor={formularioProducto.tipoProducto}
                    ariaLabel="Seleccionar tipo de bien"
                    onChange={(valor) => {
                      const tipoProducto = valor as TipoProducto;
                      setFormularioProducto((formularioActual) => ({
                        ...formularioActual,
                        tipoProducto,
                        empresa:
                          tipoProducto === "consumible"
                            ? ""
                            : formularioActual.empresa || "BLD",
                      }));
                    }}
                    opciones={[
                      { valor: "consumible", texto: "Consumible" },
                      { valor: "no_consumible", texto: "No consumible" },
                    ]}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Atributo *</label>
                  <CampoDesplegable
                    mostrarIconoFiltro={false}
                    valor={formularioProducto.empresa}
                    ariaLabel="Seleccionar atributo del bien"
                    deshabilitado={formularioProducto.tipoProducto === "consumible"}
                    onChange={(valor) =>
                      actualizarCampoProducto("empresa", valor as EmpresaBien | "")
                    }
                    opciones={
                      formularioProducto.tipoProducto === "consumible"
                        ? [{ valor: "", texto: "No aplica" }]
                        : [
                            { valor: "BLD", texto: "BLD" },
                            { valor: "BCA", texto: "BCA" },
                          ]
                    }
                  />
                </div>

                <div className="campo-formulario campo-editar-descripcion">
                  <label>Descripción / Bien *</label>
                  <input
                    required
                    value={formularioProducto.descripcion}
                    onChange={(e) =>
                      actualizarCampoProducto("descripcion", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Categoría *</label>
                  <CampoDesplegable mostrarIconoFiltro={false}
                    valor={formularioProducto.categoriaId}
                    ariaLabel="Seleccionar categoría"
                    onChange={(valor) => {
                      const categoria = categoriasActivas.find(
                        (item) => item.id === valor,
                      );

                      setFormularioProducto((formularioActual) => ({
                        ...formularioActual,
                        categoriaId: valor,
                        categoria: categoria?.nombre || "",
                      }));
                    }}
                    opciones={[
                      { valor: "", texto: "Selecciona una categoría" },
                      ...categoriasActivas.map((categoria) => ({
                        valor: categoria.id,
                        texto: categoria.nombre,
                      })),
                    ]}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Estado de calidad *</label>
                  <CampoDesplegable mostrarIconoFiltro={false}
                    valor={formularioProducto.estadoBien}
                    ariaLabel="Seleccionar estado"
                    onChange={(valor) =>
                      actualizarCampoProducto("estadoBien", valor as EstadoBien)
                    }
                    opciones={[
                      { valor: "bueno", texto: "Bueno" },
                      { valor: "regular", texto: "Medio" },
                      { valor: "malo", texto: "Malo" },
                    ]}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Bodega asignada</label>
                  <input
                    value={
                      productoEditar
                        ? obtenerBodegaAsignada(
                            obtenerItemDesdeProducto(productoEditar)
                          )
                        : "Ninguna"
                    }
                    disabled
                  />
                </div>

                <div className="campo-formulario">
                  <label>Custodio actual</label>
                  <input value={formularioProducto.custodioActual} disabled />
                </div>

                <div className="campo-formulario">
                  <label>Serie</label>
                  <input
                    value={formularioProducto.serie}
                    onChange={(e) =>
                      actualizarCampoProducto("serie", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Modelo</label>
                  <input
                    value={formularioProducto.modelo}
                    onChange={(e) =>
                      actualizarCampoProducto("modelo", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Marca</label>
                  <input
                    value={formularioProducto.marca}
                    onChange={(e) =>
                      actualizarCampoProducto("marca", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Material</label>
                  <input
                    value={formularioProducto.material}
                    onChange={(e) =>
                      actualizarCampoProducto("material", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Color</label>
                  <input
                    value={formularioProducto.color}
                    onChange={(e) =>
                      actualizarCampoProducto("color", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Dimensiones</label>
                  <input
                    value={formularioProducto.dimensiones}
                    onChange={(e) =>
                      actualizarCampoProducto("dimensiones", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>Procedencia</label>
                  <input
                    value={formularioProducto.procedencia}
                    onChange={(e) =>
                      actualizarCampoProducto("procedencia", e.target.value)
                    }
                  />
                </div>

                <div className="campo-formulario campo-editar-observacion">
                  <label>Observación</label>
                  <textarea
                    value={formularioProducto.observacion}
                    onChange={(e) =>
                      actualizarCampoProducto("observacion", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModalEditar}
                >
                  Cancelar
                </button>

                <button className="boton-principal" type="submit">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productoDistribuir && (
        <div className="modal-fondo">
          <div className="modal-contenedor modal-distribucion-compacto">
            <div className="modal-header">
              <div>
                <h2>Asignar producto</h2>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={cerrarModalDistribuir}
              >
                <X size={20} />
              </button>
            </div>

            <form className="formulario-modal" onSubmit={guardarDistribucion}>
              <div className="grid-formulario grid-formulario-asignacion">
                <div className="campo-formulario">
                  <label>Cantidad *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max={productoDistribuir.cantidad}
                    value={formularioDistribucion.cantidad}
                    onChange={(e) =>
                      actualizarCampoDistribucion("cantidad", e.target.value)
                    }
                  />
                </div>

                <div className="stock-disponible-asignacion">
                  <span>Disponible</span>
                  <strong>{productoDistribuir.cantidad}</strong>
                </div>

                <div className="campo-formulario campo-completo">
                  <label>Bodega destino *</label>

                  <div className="selector-destino-multiple">
                    <CampoDesplegable mostrarIconoFiltro={false}
                      valor={formularioDistribucion.destino}
                      ariaLabel="Seleccionar bodega destino"
                      onChange={(valor) => actualizarCampoDistribucion("destino", valor)}
                      opciones={obtenerBodegasDisponiblesParaAgregar(
                        formularioDistribucion,
                        formularioDistribucion.destino
                      ).map((bodega) => ({
                        valor: bodega.nombre,
                        texto: limpiarNombreBodega(bodega.nombre),
                      }))}
                    />

                    <button
                      className="boton-agregar-destino"
                      type="button"
                      onClick={agregarDestinoMultiple}
                      disabled={
                        Number(formularioDistribucion.cantidad) <= 1 ||
                        obtenerBodegasDisponiblesParaAgregar().length === 0
                      }
                      title="Agregar otra bodega"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {formularioDistribucion.destinosMultiples.length > 0 && (
                    <div className="selectores-destino-adicionales">
                      {formularioDistribucion.destinosMultiples.map(
                        (destino, indice) => (
                          <div
                            className="fila-destino-adicional"
                            key={`${destino}-${indice}`}
                          >
                            <CampoDesplegable mostrarIconoFiltro={false}
                              valor={destino}
                              ariaLabel="Seleccionar bodega destino adicional"
                              onChange={(valor) => actualizarDestinoMultiple(indice, valor)}
                              opciones={obtenerBodegasDisponiblesParaAgregar(
                                formularioDistribucion,
                                destino
                              ).map((bodega) => ({
                                valor: bodega.nombre,
                                texto: limpiarNombreBodega(bodega.nombre),
                              }))}
                            />

                            <button
                              className="boton-quitar-destino"
                              type="button"
                              onClick={() => quitarDestinoMultiple(indice)}
                              title="Quitar bodega"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="campo-formulario campo-completo">
                <label>Observación</label>
                <textarea
                  rows={3}
                  placeholder="Detalle adicional de la asignación"
                  value={formularioDistribucion.observacion}
                  onChange={(e) =>
                    actualizarCampoDistribucion("observacion", e.target.value)
                  }
                />
              </div>

              <div className="modal-acciones">
                <button
                  className="boton-secundario"
                  type="button"
                  onClick={cerrarModalDistribuir}
                >
                  Cancelar
                </button>

                <button className="boton-principal" type="submit">
                  Confirmar asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productoBaja && (
        <div className="modal-fondo">
          <div className="modal-contenedor" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <h2>Dar de baja</h2>
                <p>El bien saldrá del Inventario General y el movimiento quedará registrado.</p>
              </div>

              <button
                className="modal-cerrar"
                type="button"
                onClick={() => {
                  setProductoBaja(null);
                  setObservacionBaja("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px 28px 8px" }}>
              <div
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  borderRadius: "14px",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#374151",
                    fontSize: "15px",
                    lineHeight: "1.45",
                  }}
                >
                  ¿Seguro que deseas dar de baja este bien?
                </p>

                <strong
                  style={{
                    display: "block",
                    color: "#991b1b",
                    fontSize: "17px",
                    lineHeight: "1.4",
                  }}
                >
                  {productoBaja.descripcion}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Código: {productoBaja.codigo}
                </span>
              </div>
            </div>

            <div style={{ padding: "8px 28px 0" }}>
              <div className="campo-formulario">
                <label>Observación de baja</label>
                <textarea
                  value={observacionBaja}
                  onChange={(event) => setObservacionBaja(event.target.value)}
                  placeholder="Agrega una observación sobre la baja del producto"
                />
              </div>
            </div>

            <div className="modal-acciones" style={{ padding: "18px 28px" }}>
              <button
                className="boton-secundario"
                type="button"
                onClick={() => {
                  setProductoBaja(null);
                  setObservacionBaja("");
                }}
              >
                Cancelar
              </button>

              <button
                className="boton-principal"
                type="button"
                onClick={confirmarBajaProducto}
              >
                Sí, dar de baja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventarioAdmin;