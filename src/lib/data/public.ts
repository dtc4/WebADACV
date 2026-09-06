import { prisma } from "@/lib/prisma";
import type { CategoriaTalla, NivelCompeticion } from "@prisma/client";

/** Todas las lecturas usadas por la web pública viven aquí, para que
 * ninguna página se salte el filtro `estado: "PUBLICADA"` /
 * `publicado: true` por accidente. */

export function getTemporadaActiva() {
  return prisma.temporada.findFirst({ where: { activa: true }, orderBy: { fechaInicio: "desc" } });
}

export function getJornadasPublicadas(temporadaId: string) {
  return prisma.jornada.findMany({
    where: { temporadaId, estado: "PUBLICADA" },
    include: { club: true, juez: true },
    orderBy: { fecha: "asc" },
  });
}

export function getProximaJornada(temporadaId: string) {
  return prisma.jornada.findFirst({
    where: { temporadaId, estado: "PUBLICADA", fecha: { gte: new Date() } },
    include: { club: true, juez: true },
    orderBy: { fecha: "asc" },
  });
}

export async function getJornadaPublicaConResultados(jornadaId: string) {
  const jornada = await prisma.jornada.findFirst({
    where: { id: jornadaId, estado: "PUBLICADA" },
    include: {
      club: true,
      juez: true,
      competiciones: {
        include: {
          juez: true,
          resultados: {
            where: { publicado: true },
            include: { binomio: { include: { guia: true, perro: true, club: true } } },
            orderBy: [{ penalizacionTotal: "asc" }],
          },
        },
        orderBy: [{ nivel: "asc" }, { modalidad: "asc" }, { talla: "asc" }, { manga: "asc" }],
      },
      galerias: { include: { fotos: { orderBy: { orden: "asc" } } } },
    },
  });
  return jornada;
}

export function getClasificacionPublicada(
  temporadaId: string,
  nivel: NivelCompeticion,
  categoria: CategoriaTalla
) {
  return prisma.clasificacionTemporada.findFirst({
    where: { temporadaId, nivel, categoria, estado: "PUBLICADA" },
    include: {
      entradas: {
        include: { binomio: { include: { guia: true, perro: true, club: true } } },
        orderBy: { posicion: "asc" },
      },
    },
  });
}

export function getNoticias(limit = 6) {
  return prisma.noticia.findMany({ orderBy: { publicadoEn: "desc" }, take: limit });
}

export function getNoticiaPorSlug(slug: string) {
  return prisma.noticia.findUnique({ where: { slug } });
}

export function getSponsorsActivos() {
  return prisma.sponsor.findMany({ where: { activo: true }, orderBy: { orden: "asc" } });
}

export function getDocumentos() {
  return prisma.documento.findMany({ orderBy: { fechaPublicacion: "desc" } });
}

export function getGalerias(limit = 12) {
  return prisma.galeria.findMany({
    include: { fotos: { orderBy: { orden: "asc" }, take: 1 }, _count: { select: { fotos: true } } },
    orderBy: { fecha: "desc" },
    take: limit,
  });
}

export function getGaleriaConFotos(id: string) {
  return prisma.galeria.findUnique({
    where: { id },
    include: { fotos: { orderBy: { orden: "asc" } }, jornada: true },
  });
}

export function getClubesActivos() {
  return prisma.club.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
}

export function getJueces() {
  return prisma.juez.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
}
