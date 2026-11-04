import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { UsuarioAutenticado } from "../auth/interfaces/usuario-autenticado.interface";
import { AuditoriaService } from "../auditoria/auditoria.service";
import { DataSource, Repository } from "typeorm";

import { Producto } from "../productos/entities/producto.entity";
import { ActualizarCategoriaDto } from "./dto/actualizar-categoria.dto";
import { CrearCategoriaDto } from "./dto/crear-categoria.dto";
import { Categoria } from "./entities/categoria.entity";
import { EstadoCategoria } from "./enums/estado-categoria.enum";

export interface CategoriaPublica {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: EstadoCategoria;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CategoriasService {
  private readonly nombreCategoriaBase = "Sin categoría";

  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepository: Repository<Categoria>,
    private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listar(): Promise<CategoriaPublica[]> {
    const categorias = await this.categoriasRepository.find({
      order: {
        nombre: "ASC",
      },
    });

    return categorias.map((categoria) =>
      this.convertirAPublica(categoria),
    );
  }

  async listarActivas(): Promise<CategoriaPublica[]> {
    const categorias = await this.categoriasRepository.find({
      where: {
        estado: EstadoCategoria.ACTIVA,
      },
      order: {
        nombre: "ASC",
      },
    });

    return categorias.map((categoria) =>
      this.convertirAPublica(categoria),
    );
  }

  async buscarPorId(id: string): Promise<CategoriaPublica> {
    const categoria = await this.obtenerPorId(id);
    return this.convertirAPublica(categoria);
  }

  async crear(
    dto: CrearCategoriaDto,
    actor: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    await this.validarNombreDisponible(dto.nombre);

    const categoria = this.categoriasRepository.create({
      nombre: dto.nombre.trim(),
      descripcion: this.normalizarDescripcion(dto.descripcion),
      estado: EstadoCategoria.ACTIVA,
    });

    const guardada = await this.categoriasRepository.save(categoria);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "categorias",
      accion: "crear",
      registroId: guardada.id,
      descripcion: `Creación de la categoría ${guardada.nombre}.`,
    });
    return this.convertirAPublica(guardada);
  }

  async actualizar(
    id: string,
    dto: ActualizarCategoriaDto,
    actor: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    const categoria = await this.obtenerPorId(id);

    if (dto.nombre !== undefined) {
      await this.validarNombreDisponible(dto.nombre, id);
      categoria.nombre = dto.nombre.trim();
    }

    if (dto.descripcion !== undefined) {
      categoria.descripcion = this.normalizarDescripcion(
        dto.descripcion,
      );
    }

    const guardada = await this.categoriasRepository.save(categoria);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "categorias",
      accion: "editar",
      registroId: guardada.id,
      descripcion: `Edición de la categoría ${guardada.nombre}.`,
    });
    return this.convertirAPublica(guardada);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoCategoria,
    actor: UsuarioAutenticado,
  ): Promise<CategoriaPublica> {
    const categoria = await this.obtenerPorId(id);
    categoria.estado = estado;

    const guardada = await this.categoriasRepository.save(categoria);
    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "categorias",
      accion:
        estado === EstadoCategoria.ACTIVA ? "activar" : "inactivar",
      registroId: guardada.id,
      descripcion: `${
        estado === EstadoCategoria.ACTIVA
          ? "Activación"
          : "Inactivación"
      } de la categoría ${guardada.nombre}.`,
    });
    return this.convertirAPublica(guardada);
  }

  async eliminar(
    id: string,
    actor: UsuarioAutenticado,
  ): Promise<{ message: string }> {
    const categoria = await this.obtenerPorId(id);

    if (this.esCategoriaBase(categoria.nombre)) {
      throw new ConflictException(
        "La categoría Sin categoría es necesaria para conservar productos reasignados.",
      );
    }

    const resultado = await this.dataSource.transaction(
      async (administrador) => {
        const categorias = administrador.getRepository(Categoria);
        const productos = administrador.getRepository(Producto);

        const categoriaBase =
          await this.obtenerOAsegurarCategoriaBase(categorias);

        const productosAfectados = await productos.count({
          where: {
            categoriaId: categoria.id,
          },
        });

        if (productosAfectados > 0) {
          await productos.update(
            { categoriaId: categoria.id },
            { categoriaId: categoriaBase.id },
          );
        }

        await categorias.delete(categoria.id);

        return {
          categoriaBase,
          productosAfectados,
        };
      },
    );

    await this.auditoriaService.registrar({
      usuarioId: actor.id,
      modulo: "categorias",
      accion: "eliminar",
      registroId: categoria.id,
      descripcion:
        resultado.productosAfectados > 0
          ? `Eliminación de la categoría ${categoria.nombre}. Productos reasignados a ${resultado.categoriaBase.nombre}: ${resultado.productosAfectados}.`
          : `Eliminación de la categoría ${categoria.nombre}.`,
    });

    return {
      message:
        resultado.productosAfectados > 0
          ? `Categoría eliminada correctamente. ${resultado.productosAfectados} producto(s) fueron reasignados a Sin categoría.`
          : "Categoría eliminada correctamente.",
    };
  }

  private async obtenerPorId(id: string): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException(
        "La categoría solicitada no existe.",
      );
    }

    return categoria;
  }

  private async obtenerOAsegurarCategoriaBase(
    categorias: Repository<Categoria>,
  ): Promise<Categoria> {
    let categoriaBase = await categorias
      .createQueryBuilder("categoria")
      .where("LOWER(TRIM(categoria.nombre)) = :nombre", {
        nombre: this.nombreCategoriaBase.toLowerCase(),
      })
      .getOne();

    if (!categoriaBase) {
      categoriaBase = categorias.create({
        nombre: this.nombreCategoriaBase,
        descripcion:
          "Categoría base para productos que quedan sin categoría asignada.",
        estado: EstadoCategoria.ACTIVA,
      });
    } else if (categoriaBase.estado !== EstadoCategoria.ACTIVA) {
      categoriaBase.estado = EstadoCategoria.ACTIVA;
    }

    return categorias.save(categoriaBase);
  }

  private async validarNombreDisponible(
    nombre: string,
    idExcluido?: string,
  ): Promise<void> {
    const consulta = this.categoriasRepository
      .createQueryBuilder("categoria")
      .where("LOWER(TRIM(categoria.nombre)) = :nombre", {
        nombre: nombre.trim().toLowerCase(),
      });

    if (idExcluido) {
      consulta.andWhere("categoria.id <> :idExcluido", {
        idExcluido,
      });
    }

    if ((await consulta.getCount()) > 0) {
      throw new ConflictException(
        "Ya existe una categoría con ese nombre.",
      );
    }
  }

  private normalizarDescripcion(
    descripcion?: string,
  ): string | null {
    const valor = descripcion?.trim();
    return valor ? valor : null;
  }

  private esCategoriaBase(nombre: string): boolean {
    return nombre.trim().toLowerCase() ===
      this.nombreCategoriaBase.toLowerCase();
  }

  private convertirAPublica(
    categoria: Categoria,
  ): CategoriaPublica {
    return {
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion,
      estado: categoria.estado,
      createdAt: categoria.createdAt,
      updatedAt: categoria.updatedAt,
    };
  }
}
