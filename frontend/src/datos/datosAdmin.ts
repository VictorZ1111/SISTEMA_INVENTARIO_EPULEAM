import type { Usuario } from "../tipos/usuario";
import type { Bodega } from "../tipos/bodega";
import type { Producto } from "../tipos/producto";
import type { Movimiento } from "../tipos/movimiento";
import type { Solicitud } from "../tipos/solicitud";

export const usuariosAdmin: Usuario[] = [
  {
    id: 1,
    nombre: "Administrador General",
    correo: "admin@epuleam.com",
    rol: "admin",
    estado: "activo",
    codigoAcceso: "AD12345!",
  },
  {
    id: 2,
    nombre: "Carlos Mendoza",
    correo: "responsable@epuleam.com",
    rol: "responsable",
    estado: "activo",
    bodegasAsignadas: ["Tasty 1"],
    bodegaAsignada: "Tasty 1",
    codigoAcceso: "RE12345!",
  },
  {
    id: 3,
    nombre: "María García",
    correo: "supervisor@epuleam.com",
    rol: "supervisor",
    estado: "activo",
    bodegasAsignadas: ["Bodega Limpieza", "Bodega Oficina", "Gastronomía Tasty"],
    bodegaAsignada: "Bodega Limpieza",
    codigoAcceso: "SU12345!",
  },
];

export const bodegasPrincipalesAdmin: Bodega[] = [
  {
    id: 1,
    nombre: "Bodega Limpieza",
    descripcion: "Almacén de productos de limpieza e higiene institucional.",
    ubicacion: "Edificio principal",
    responsable: "María García",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 2,
    nombre: "Bodega Oficina",
    descripcion: "Almacén de insumos y suministros de oficina.",
    ubicacion: "Área administrativa",
    responsable: "María García",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 3,
    nombre: "Gastronomía Tasty",
    descripcion: "Centro de distribución para las sucursales Tasty.",
    ubicacion: "Centro de distribución",
    responsable: "María García",
    estado: "activa",
    stockTotal: 0,
  },
];

export const inventarioGeneralAdmin: Bodega = {
  id: 100,
  nombre: "Inventario General",
  descripcion:
    "Inventario principal donde se registran todos los productos y bienes institucionales.",
  ubicacion: "Almacén central",
  responsable: "Administrador General",
  estado: "activa",
  stockTotal: 0,
};

export const sucursalesTastyAdmin: Bodega[] = [
  {
    id: 4,
    nombre: "Tasty 1",
    descripcion: "Sucursal gastronómica.",
    ubicacion: "Centro",
    responsable: "Carlos Mendoza",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 5,
    nombre: "Tasty 2",
    descripcion: "Sucursal gastronómica.",
    ubicacion: "Zona norte",
    responsable: "Sin asignar",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 6,
    nombre: "Tasty 3",
    descripcion: "Sucursal gastronómica.",
    ubicacion: "Zona sur",
    responsable: "Sin asignar",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 7,
    nombre: "Tasty 4",
    descripcion: "Sucursal gastronómica.",
    ubicacion: "Plaza principal",
    responsable: "Sin asignar",
    estado: "activa",
    stockTotal: 0,
  },
  {
    id: 8,
    nombre: "Tasty 5",
    descripcion: "Sucursal gastronómica.",
    ubicacion: "Punto express",
    responsable: "Sin asignar",
    estado: "activa",
    stockTotal: 0,
  },
];

export const bodegasAdmin: Bodega[] = [
  inventarioGeneralAdmin,
  ...bodegasPrincipalesAdmin,
  ...sucursalesTastyAdmin,
];

export const productosAdmin: Producto[] = [
  {
    id: 1,
    codigo: "000-004-0202",
    descripcion: "Muebles de oficina: escritorio pequeño",
    cantidad: 1,
    tipoProducto: "no_consumible",
    empresa: "BLD",
    serie: "S/N",
    modelo: "Escritorio estándar",
    marca: "S/M",
    material: "Metal y madera",
    color: "Negro / crema",
    dimensiones: "No especifica",
    estadoBien: "bueno",
    ubicacion: "Inventario General",
    custodioActual: "Administrador General",
    procedencia: "EPULEAM",
    codigoUleam: "000-004-0202",
    categoria: "Mobiliario",
    unidad: "Unidad",
    observacion: "Bien institucional no consumible.",
    estado: "activo",
    fechaRegistro: "2026-07-01",
  },
  {
    id: 2,
    codigo: "LIMP-001",
    descripcion: "Alcohol antiséptico",
    cantidad: 20,
    tipoProducto: "consumible",
    serie: "S/N",
    modelo: "No aplica",
    marca: "Genérico",
    material: "Líquido",
    color: "Transparente",
    dimensiones: "Litro",
    estadoBien: "bueno",
    ubicacion: "Inventario General",
    custodioActual: "Administrador General",
    procedencia: "Compra institucional",
    codigoUleam: "LIMP-001",
    categoria: "Limpieza",
    unidad: "Litro",
    observacion: "Producto consumible para distribución.",
    estado: "activo",
    fechaRegistro: "2026-07-01",
  },
];

export const movimientosAdmin: Movimiento[] = [
  {
    id: 1,
    tipo: "entrada",
    producto: "Muebles de oficina: escritorio pequeño",
    origen: "EPULEAM",
    destino: "Inventario General",
    cantidad: 1,
    documento: "ENT-001",
    fecha: "2026-07-01",
    usuario: "Administrador General",
    observacion: "Ingreso inicial de bien institucional.",
  },
];

export const solicitudesAdmin: Solicitud[] = [
  {
    id: 1,
    tipo: "producto",
    solicitante: "María García",
    bodega: "Bodega Oficina",
    productoSolicitado: "Resma de papel A4",
    cantidad: 5,
    unidad: "Unidad",
    descripcion: "Solicitud de reposición para actividades administrativas.",
    estado: "pendiente",
    fecha: "2026-06-30",
  },
];