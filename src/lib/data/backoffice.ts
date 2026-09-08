import { prisma } from "@/lib/prisma";

/** Lecturas usadas por el backoffice (sin filtrar por publicado/estado —
 * secretaría necesita ver borradores). */

export function getTemporadas() {
  return prisma.temporada.findMany({ orderBy: { fechaInicio: "desc" } });
}

export async function getTemporadaActivaOFallback() {
  const activa = await prisma.temporada.findFirst({ where: { activa: true } });
  if (activa) return activa;
  return prisma.temporada.findFirst({ orderBy: { fechaInicio: "desc" } });
}

export function getJornadasTemporada(temporadaId: string) {
  return prisma.jornada.findMany({
    where: { temporadaId },
    include: { club: true, juez: true, _count: { select: { competiciones: true } } },
    // Las jornadas generadas al crear la temporada comparten una fecha
    // provisional hasta que se configuran, así que ordenar por número de
    // jornada (y luego por fecha para las que no tienen número) es lo que
    // realmente refleja el calendario planificado.
    orderBy: [{ numero: "asc" }, { fecha: "desc" }],
  });
}

export function getTemporadaPorId(temporadaId: string) {
  return prisma.temporada.findUnique({ where: { id: temporadaId } });
}

/** Huecos de jornada de una temporada que todavía no se han configurado
 * (usado por "Nueva jornada" para ofrecer solo los que quedan por rellenar). */
export function getJornadasPendientesTemporada(temporadaId: string) {
  return prisma.jornada.findMany({
    where: { temporadaId, configurada: false },
    orderBy: [{ numero: "asc" }, { fecha: "asc" }],
  });
}

export function getJornadaConTodo(jornadaId: string) {
  return prisma.jornada.findUnique({
    where: { id: jornadaId },
    include: {
      temporada: true,
      club: true,
      juez: true,
      competiciones: {
        include: {
          juez: true,
          resultados: {
            include: { binomio: { include: { guia: true, perro: true, club: true } } },
            orderBy: { dorsal: "asc" },
          },
        },
        orderBy: [{ nivel: "asc" }, { modalidad: "asc" }, { talla: "asc" }, { manga: "asc" }],
      },
    },
  });
}

export function getBinomiosActivos() {
  return prisma.binomio.findMany({
    where: { activo: true },
    include: { guia: true, perro: true, club: true },
    orderBy: [{ guia: { apellidos: "asc" } }],
  });
}

export function getClasificacionesTemporada(temporadaId: string) {
  return prisma.clasificacionTemporada.findMany({
    where: { temporadaId },
    orderBy: [{ nivel: "asc" }, { talla: "asc" }],
  });
}

export function getClasificacionConEntradas(id: string) {
  return prisma.clasificacionTemporada.findUnique({
    where: { id },
    include: {
      temporada: true,
      entradas: {
        include: { binomio: { include: { guia: true, perro: true, club: true } } },
        orderBy: { posicion: "asc" },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Clubes, jueces, guías, perros, binomios (fichas del backoffice)
// ---------------------------------------------------------------------------

export function contarEntidades() {
  return Promise.all([
    prisma.club.count(),
    prisma.juez.count(),
    prisma.guia.count(),
    prisma.perro.count(),
    prisma.binomio.count(),
  ]).then(([clubes, jueces, guias, perros, binomios]) => ({ clubes, jueces, guias, perros, binomios }));
}

export function getClubesTodos() {
  return prisma.club.findMany({
    include: { _count: { select: { guias: true, binomios: true } } },
    orderBy: { nombre: "asc" },
  });
}

export function getClubPorId(id: string) {
  return prisma.club.findUnique({ where: { id } });
}

export function getJuecesTodos() {
  return prisma.juez.findMany({
    include: { _count: { select: { jornadas: true, competiciones: true } } },
    orderBy: { nombre: "asc" },
  });
}

export function getJuezPorId(id: string) {
  return prisma.juez.findUnique({ where: { id } });
}

export function getGuiasTodas() {
  return prisma.guia.findMany({
    include: { club: true, _count: { select: { binomios: true } } },
    orderBy: [{ apellidos: "asc" }, { nombre: "asc" }],
  });
}

export function getGuiaPorId(id: string) {
  return prisma.guia.findUnique({ where: { id } });
}

export function getPerrosTodos() {
  return prisma.perro.findMany({
    include: { _count: { select: { binomios: true } } },
    orderBy: { nombre: "asc" },
  });
}

export function getPerroPorId(id: string) {
  return prisma.perro.findUnique({ where: { id } });
}

export function getBinomiosTodos() {
  return prisma.binomio.findMany({
    include: {
      guia: true,
      perro: true,
      club: true,
      _count: { select: { resultados: true, clasificaciones: true } },
    },
    orderBy: [{ guia: { apellidos: "asc" } }],
  });
}

export function getBinomioPorId(id: string) {
  return prisma.binomio.findUnique({
    where: { id },
    include: { guia: true, perro: true, club: true },
  });
}

export function contarResumenDashboard(temporadaId: string) {
  return Promise.all([
    prisma.jornada.count({ where: { temporadaId } }),
    prisma.jornada.count({ where: { temporadaId, estado: "BORRADOR" } }),
    prisma.binomio.count({ where: { activo: true } }),
    prisma.clasificacionTemporada.count({
      where: { temporadaId, estado: { not: "PUBLICADA" } },
    }),
  ]).then(([jornadas, borradores, binomios, clasificacionesPendientes]) => ({
    jornadas,
    borradores,
    binomios,
    clasificacionesPendientes,
  }));
}
