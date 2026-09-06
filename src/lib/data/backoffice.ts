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
    orderBy: { fecha: "desc" },
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
