"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { categoriaDeTalla } from "@/lib/rules/categorias";
import type { NivelCompeticion, CategoriaTalla } from "@prisma/client";

async function requireSession() {
  return getSession();
}

/** Crea (si no existen) las filas ClasificacionTemporada para las 3
 * combinaciones de nivel × 4 categorías de talla de una temporada, para
 * que aparezcan en el listado del backoffice desde el primer día aunque
 * todavía no tengan resultados. Idempotente. */
export async function asegurarClasificacionesTemporadaAction(temporadaId: string) {
  await requireSession();
  const niveles: NivelCompeticion[] = ["NIVEL_II", "NIVEL_III", "PERFORMANCE"];
  const categorias: CategoriaTalla[] = ["MINI", "MEDIA", "MAXI", "LARGE"];

  for (const nivel of niveles) {
    for (const categoria of categorias) {
      await prisma.clasificacionTemporada.upsert({
        where: { temporadaId_nivel_categoria: { temporadaId, nivel, categoria } },
        create: { temporadaId, nivel, categoria },
        update: {},
      });
    }
  }

  revalidatePath("/backoffice/clasificaciones");
}

/**
 * Recalcula la clasificación de temporada como la suma de
 * `penalizacionTotal` de todos los resultados PUBLICADOS de los binomios
 * de ese nivel/categoría en la temporada (menor penalización acumulada =
 * mejor puesto), tal y como sugiere el reglamento al fijar el tope de
 * "penalización final ≤ 500 puntos" para poder ascender.
 *
 * ADVERTENCIA: el reglamento no detalla una fórmula de puntos de
 * temporada distinta de la penalización acumulada — esta es la
 * interpretación más directa y debe confirmarse con secretaría/comité de
 * reglamento de ADACV antes de usarse como criterio oficial de ascenso o
 * descenso.
 */
export async function recalcularClasificacionAction(formData: FormData) {
  await requireSession();
  const clasificacionId = String(formData.get("clasificacionId") ?? "");
  if (!clasificacionId) throw new Error("Falta el identificador de la clasificación.");

  const clasificacion = await prisma.clasificacionTemporada.findUniqueOrThrow({
    where: { id: clasificacionId },
  });

  if (clasificacion.estado === "BLOQUEADA") {
    throw new Error("Esta clasificación está bloqueada. Desbloquéala antes de recalcular.");
  }

  // Tallas que pertenecen a esta categoría agrupada.
  const tallasDeCategoria = (["MINI1", "MINI2", "MEDIA", "MAXI", "LARGE"] as const).filter(
    (t) => categoriaDeTalla(t) === clasificacion.categoria
  );

  const resultados = await prisma.resultado.findMany({
    where: {
      publicado: true,
      competicion: {
        nivel: clasificacion.nivel,
        talla: { in: tallasDeCategoria },
        jornada: { temporadaId: clasificacion.temporadaId },
      },
    },
    select: { binomioId: true, penalizacionTotal: true },
  });

  const acumulado = new Map<string, { puntos: number; pruebas: number }>();
  for (const r of resultados) {
    const actual = acumulado.get(r.binomioId) ?? { puntos: 0, pruebas: 0 };
    actual.puntos += r.penalizacionTotal ?? 0;
    actual.pruebas += 1;
    acumulado.set(r.binomioId, actual);
  }

  const entradasPrevias = await prisma.clasificacionEntrada.findMany({
    where: { clasificacionTemporadaId: clasificacionId },
  });
  const posicionPrevia = new Map<string, number>(
    entradasPrevias.map((e: { binomioId: string; posicion: number }) => [e.binomioId, e.posicion])
  );

  const ranking = Array.from(acumulado.entries())
    .map(([binomioId, datos]) => ({ binomioId, ...datos }))
    .sort((a, b) => a.puntos - b.puntos);

  await prisma.$transaction([
    prisma.clasificacionEntrada.deleteMany({ where: { clasificacionTemporadaId: clasificacionId } }),
    ...ranking.map((entrada, index) => {
      const posicion = index + 1;
      const previa = posicionPrevia.get(entrada.binomioId);
      const tendencia = previa === undefined ? 0 : previa > posicion ? 1 : previa < posicion ? -1 : 0;
      return prisma.clasificacionEntrada.create({
        data: {
          clasificacionTemporadaId: clasificacionId,
          binomioId: entrada.binomioId,
          posicion,
          puntos: entrada.puntos,
          pruebasDisputadas: entrada.pruebas,
          tendencia,
        },
      });
    }),
    prisma.clasificacionTemporada.update({
      where: { id: clasificacionId },
      data: { estado: "PENDIENTE", actualizadaEn: new Date() },
    }),
  ]);

  revalidatePath("/backoffice/clasificaciones");
}

export async function marcarRevisadaAction(formData: FormData) {
  await requireSession();
  const clasificacionId = String(formData.get("clasificacionId") ?? "");
  await prisma.clasificacionTemporada.update({
    where: { id: clasificacionId },
    data: { estado: "REVISADA" },
  });
  revalidatePath("/backoffice/clasificaciones");
}

export async function publicarClasificacionAction(formData: FormData) {
  await requireSession();
  const clasificacionId = String(formData.get("clasificacionId") ?? "");
  const clasificacion = await prisma.clasificacionTemporada.findUniqueOrThrow({
    where: { id: clasificacionId },
  });

  if (clasificacion.estado !== "REVISADA") {
    throw new Error("Solo se puede publicar una clasificación que ya haya sido revisada.");
  }

  await prisma.clasificacionTemporada.update({
    where: { id: clasificacionId },
    data: { estado: "PUBLICADA", publicadaEn: new Date() },
  });
  revalidatePath("/backoffice/clasificaciones");
  revalidatePath("/clasificaciones");
}

export async function bloquearClasificacionAction(formData: FormData) {
  await requireSession();
  const clasificacionId = String(formData.get("clasificacionId") ?? "");
  await prisma.clasificacionTemporada.update({
    where: { id: clasificacionId },
    data: { estado: "BLOQUEADA" },
  });
  revalidatePath("/backoffice/clasificaciones");
}

export async function desbloquearClasificacionAction(formData: FormData) {
  await requireSession();
  const clasificacionId = String(formData.get("clasificacionId") ?? "");
  await prisma.clasificacionTemporada.update({
    where: { id: clasificacionId },
    data: { estado: "PENDIENTE" },
  });
  revalidatePath("/backoffice/clasificaciones");
}
