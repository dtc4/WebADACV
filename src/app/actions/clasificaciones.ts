"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { categoriaDeTalla } from "@/lib/rules/categorias";
import { nivelValidoParaTalla, TALLAS_CON_GRADO, BONOS_PODIO_JORNADA } from "@/lib/constants";
import type { NivelCompeticion, CategoriaTalla, Talla, Modalidad } from "@prisma/client";

async function requireSession() {
  return getSession();
}

const TODAS_LAS_TALLAS: Talla[] = ["MINI1", "MINI2", "MEDIA", "MAXI", "LARGE"];
const TODOS_LOS_NIVELES: NivelCompeticion[] = ["NIVEL_II", "NIVEL_III", "SIN_GRADO", "PERFORMANCE"];

/** Crea (si no existen) las filas ClasificacionTemporada de una temporada,
 * una por cada combinación de nivel × categoría de talla que de verdad
 * existe en el reglamento (ver `nivelValidoParaTalla`): Nivel II/III solo
 * para Maxi/Large, "Sin grado" solo para Mini/Media, y Performance para
 * las 4 categorías. Antes se generaban las 3×4 combinaciones a ciegas
 * (incluyendo, p. ej., Nivel II × Mini, que no existe) y encima faltaba
 * "Sin grado" — con lo que Mini y Media, que compiten sin grado, nunca
 * llegaban a tener clasificación. Idempotente. */
export async function asegurarClasificacionesTemporadaAction(temporadaId: string) {
  await requireSession();

  const combos = new Set<string>();
  for (const talla of TODAS_LAS_TALLAS) {
    for (const nivel of TODOS_LOS_NIVELES) {
      if (nivelValidoParaTalla(talla, nivel)) {
        combos.add(`${nivel}:${categoriaDeTalla(talla)}`);
      }
    }
  }

  for (const combo of combos) {
    const [nivel, categoria] = combo.split(":") as [NivelCompeticion, CategoriaTalla];
    await prisma.clasificacionTemporada.upsert({
      where: { temporadaId_nivel_categoria: { temporadaId, nivel, categoria } },
      create: { temporadaId, nivel, categoria },
      update: {},
    });
  }

  revalidatePath("/backoffice/clasificaciones");
}

type ClasificacionRef = { id: string; temporadaId: string; nivel: NivelCompeticion; categoria: CategoriaTalla };

type ParametrosPenalizacion = {
  temporadaId: string;
  nivel: NivelCompeticion;
  categoria: CategoriaTalla;
  /** Si se indica, solo cuenta esa modalidad (para el ranking por
   * modalidad de una jornada). Si se omite, cuenta todas — esa suma ES la
   * "general" (de temporada, o de una jornada si se combina con
   * `soloJornadaId`). */
  modalidad?: Modalidad;
  /** Si se indica, solo cuenta lo disputado en esa jornada concreta (para
   * el ranking de esa jornada). Si se omite, cuenta toda la temporada. */
  soloJornadaId?: string;
};

/**
 * Calcula (sin escribir nada) la penalización acumulada por binomio: la
 * suma de `penalizacionTotal` de los resultados PUBLICADOS que cumplen los
 * filtros indicados (menor penalización acumulada = mejor puesto), tal y
 * como sugiere el reglamento al fijar el tope de "penalización final ≤ 500
 * puntos" para poder ascender. Sin `modalidad`, un binomio que compite en
 * Agility Standard Y Jumping en el mismo nivel/categoría suma
 * automáticamente las dos — esa suma ES la "general". Con `soloJornadaId`
 * se limita a una jornada (ranking de jornada); sin él, a toda la
 * temporada (ranking de temporada).
 *
 * Además de los resultados reales, se cuentan "no presentados"
 * automáticos: según indicó David, la inmensa mayoría de no presentados
 * no son binomios que se inscriben y luego no vienen, sino binomios del
 * campeonato que directamente no se inscriben en la jornada porque no
 * van a esa prueba — y no tiene sentido pedirle a secretaría que los
 * marque uno a uno. Así que, para cada manga (Competicion) que entra en
 * los filtros y que se disputó en una jornada ya publicada, cualquier
 * binomio activo de esa misma altura+grado que NO estuviera inscrito en
 * esa jornada (y que no tenga ya un resultado real en esa manga) se
 * cuenta automáticamente como no presentado, con la penalización fija de
 * esa modalidad (ReglaModalidad.penalizacionNoPresentado). Si SÍ estaba
 * inscrito pero no se presentó, eso se marca a mano con la casilla "No
 * presentado" del formulario de resultados (ver jornada-wizard.tsx) — el
 * cálculo automático solo cubre el caso de no haberse apuntado siquiera.
 *
 * ADVERTENCIA: el reglamento no detalla una fórmula de puntos de
 * temporada distinta de la penalización acumulada — esta es la
 * interpretación más directa y debe confirmarse con secretaría/comité de
 * reglamento de ADACV antes de usarse como criterio oficial de ascenso o
 * descenso.
 */
async function calcularPenalizacionesPorBinomio(
  params: ParametrosPenalizacion
): Promise<Map<string, { puntos: number; pruebas: number }>> {
  // Tallas que pertenecen a esta categoría agrupada.
  const tallasDeCategoria = (["MINI1", "MINI2", "MEDIA", "MAXI", "LARGE"] as const).filter(
    (t) => categoriaDeTalla(t) === params.categoria
  );

  const resultados = await prisma.resultado.findMany({
    where: {
      publicado: true,
      competicion: {
        nivel: params.nivel,
        talla: { in: tallasDeCategoria },
        ...(params.modalidad ? { modalidad: params.modalidad } : {}),
        jornada: {
          temporadaId: params.temporadaId,
          ...(params.soloJornadaId ? { id: params.soloJornadaId } : {}),
        },
      },
    },
    select: { binomioId: true, penalizacionTotal: true, competicionId: true },
  });

  const acumulado = new Map<string, { puntos: number; pruebas: number }>();
  const tieneResultadoReal = new Set<string>(); // clave `${competicionId}:${binomioId}`
  for (const r of resultados) {
    const actual = acumulado.get(r.binomioId) ?? { puntos: 0, pruebas: 0 };
    actual.puntos += r.penalizacionTotal ?? 0;
    actual.pruebas += 1;
    acumulado.set(r.binomioId, actual);
    tieneResultadoReal.add(`${r.competicionId}:${r.binomioId}`);
  }

  // --- No presentados automáticos (binomios que ni se inscriben) --------
  const competicionesDeCategoria = (await prisma.competicion.findMany({
    where: {
      nivel: params.nivel,
      talla: { in: tallasDeCategoria },
      ...(params.modalidad ? { modalidad: params.modalidad } : {}),
      jornada: {
        temporadaId: params.temporadaId,
        estado: "PUBLICADA",
        ...(params.soloJornadaId ? { id: params.soloJornadaId } : {}),
      },
    },
    select: { id: true, jornadaId: true, modalidad: true, talla: true, nivel: true },
  })) as { id: string; jornadaId: string; modalidad: string; talla: string; nivel: string }[];

  if (competicionesDeCategoria.length > 0) {
    const jornadaIds = Array.from(new Set(competicionesDeCategoria.map((c) => c.jornadaId)));

    const [inscripciones, binomiosDeLaCategoria, reglas] = await Promise.all([
      prisma.inscripcion.findMany({
        where: { jornadaId: { in: jornadaIds } },
        select: { jornadaId: true, binomioId: true },
      }),
      prisma.binomio.findMany({
        where: { activo: true, perro: { talla: { in: tallasDeCategoria } } },
        select: { id: true, perro: { select: { nivel: true, talla: true } } },
      }),
      prisma.reglaModalidad.findMany({
        where: { temporadaId: params.temporadaId },
        select: { modalidad: true, penalizacionNoPresentado: true },
      }),
    ]);

    const inscritosPorJornada = new Map<string, Set<string>>();
    for (const i of inscripciones as { jornadaId: string; binomioId: string }[]) {
      if (!inscritosPorJornada.has(i.jornadaId)) inscritosPorJornada.set(i.jornadaId, new Set());
      inscritosPorJornada.get(i.jornadaId)!.add(i.binomioId);
    }

    const penalizacionPorModalidad = new Map(
      (reglas as { modalidad: string; penalizacionNoPresentado: number }[]).map((r) => [
        r.modalidad,
        r.penalizacionNoPresentado,
      ])
    );

    for (const competicion of competicionesDeCategoria) {
      const tallaConGrado = (TALLAS_CON_GRADO as string[]).includes(competicion.talla);
      const inscritos = inscritosPorJornada.get(competicion.jornadaId) ?? new Set<string>();
      const penalizacion = penalizacionPorModalidad.get(competicion.modalidad) ?? 75;

      for (const binomio of binomiosDeLaCategoria as {
        id: string;
        perro: { nivel: string | null; talla: string };
      }[]) {
        if (binomio.perro.talla !== competicion.talla) continue;

        const nivelPerro = binomio.perro.nivel;
        let pertenece: boolean;
        if (competicion.nivel === "PERFORMANCE") {
          pertenece = nivelPerro === "PERFORMANCE";
        } else if (!tallaConGrado) {
          // Talla sin grado (Mini/Media): pertenece cualquiera que no sea
          // de Performance, tenga o no nivel asignado en su ficha.
          pertenece = nivelPerro !== "PERFORMANCE";
        } else {
          // Talla con grado (Maxi/Large): hace falta el nivel exacto; sin
          // nivel asignado no se puede saber a qué manga pertenecía, así
          // que no se penaliza (igual que en el sorteo).
          pertenece = nivelPerro === competicion.nivel;
        }
        if (!pertenece) continue;

        // Ya tiene un resultado real (o un "no presentado" marcado a
        // mano) en esta manga: no se duplica.
        if (tieneResultadoReal.has(`${competicion.id}:${binomio.id}`)) continue;

        // Estaba inscrito en la jornada: si de verdad no vino, se marca a
        // mano en el formulario de resultados — el automático solo cubre
        // no haberse apuntado.
        if (inscritos.has(binomio.id)) continue;

        const actual = acumulado.get(binomio.id) ?? { puntos: 0, pruebas: 0 };
        actual.puntos += penalizacion;
        actual.pruebas += 1;
        acumulado.set(binomio.id, actual);
      }
    }
  }

  return acumulado;
}

/** Calcula el ranking (sin escribir nada) de la clasificación de TEMPORADA
 * de un nivel/categoría: la penalización acumulada de toda la temporada
 * (ver `calcularPenalizacionesPorBinomio`) menos el bono de podio de la
 * general de cada jornada ya publicada de ese mismo nivel/categoría (ver
 * `BONOS_PODIO_JORNADA` y `ClasificacionJornadaEntrada.bonus`): el que
 * queda 1º/2º/3º de la general de una jornada se lleva -8/-6/-2 puntos
 * también en la clasificación de temporada. */
async function calcularRankingClasificacion(clasificacion: ClasificacionRef) {
  const acumulado = await calcularPenalizacionesPorBinomio({
    temporadaId: clasificacion.temporadaId,
    nivel: clasificacion.nivel,
    categoria: clasificacion.categoria,
  });

  const bonos = (await prisma.clasificacionJornadaEntrada.findMany({
    where: {
      clasificacionJornada: {
        agrupacion: "GENERAL",
        nivel: clasificacion.nivel,
        categoria: clasificacion.categoria,
        jornada: { temporadaId: clasificacion.temporadaId, estado: "PUBLICADA" },
      },
    },
    select: { binomioId: true, bonus: true },
  })) as { binomioId: string; bonus: number }[];

  for (const b of bonos) {
    if (!b.bonus) continue;
    const actual = acumulado.get(b.binomioId);
    // El bono solo tiene sentido si el binomio ya suma puntos de esa
    // jornada (siempre debería ser así: para tener bono tuvo que competir).
    if (actual) actual.puntos += b.bonus; // bonus ya viene en negativo
  }

  return Array.from(acumulado.entries())
    .map(([binomioId, datos]) => ({ binomioId, ...datos }))
    .sort((a, b) => a.puntos - b.puntos);
}

/** Escribe el ranking calculado como las ClasificacionEntrada de una
 * clasificación (reemplazando las anteriores) y deja la clasificación en
 * el estado indicado. Común a "Recalcular" a mano (PENDIENTE, para que
 * secretaría la revise) y al recálculo automático al publicar resultados
 * (PUBLICADA directamente). */
async function guardarRankingClasificacion(
  clasificacionId: string,
  ranking: { binomioId: string; puntos: number; pruebas: number }[],
  estado: { estado: "PENDIENTE" | "PUBLICADA"; publicadaEn?: Date }
) {
  const entradasPrevias = await prisma.clasificacionEntrada.findMany({
    where: { clasificacionTemporadaId: clasificacionId },
  });
  const posicionPrevia = new Map<string, number>(
    entradasPrevias.map((e: { binomioId: string; posicion: number }) => [e.binomioId, e.posicion])
  );

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
      data: { ...estado, actualizadaEn: new Date() },
    }),
  ]);
}

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

  const ranking = await calcularRankingClasificacion(clasificacion);
  await guardarRankingClasificacion(clasificacionId, ranking, { estado: "PENDIENTE" });

  revalidatePath("/backoffice/clasificaciones");
}

/** Recalcula Y PUBLICA de golpe la clasificación de un nivel/categoría de
 * una temporada — pensado para llamarse automáticamente al publicar
 * resultados (una manga o una jornada entera), no a mano: secretaría ya
 * decidió que esos resultados son definitivos al publicarlos, así que no
 * hace falta pasar otra vez por "revisar" antes de que se vea en la web
 * y se pueda imprimir. Si la clasificación está BLOQUEADA no se toca (se
 * respeta el bloqueo manual). Crea la fila de clasificación si todavía
 * no existía. */
async function recalcularYPublicarClasificacion(
  temporadaId: string,
  nivel: NivelCompeticion,
  categoria: CategoriaTalla
) {
  await prisma.clasificacionTemporada.upsert({
    where: { temporadaId_nivel_categoria: { temporadaId, nivel, categoria } },
    create: { temporadaId, nivel, categoria },
    update: {},
  });
  const clasificacion = await prisma.clasificacionTemporada.findUniqueOrThrow({
    where: { temporadaId_nivel_categoria: { temporadaId, nivel, categoria } },
  });

  if (clasificacion.estado === "BLOQUEADA") return;

  const ranking = await calcularRankingClasificacion(clasificacion);
  await guardarRankingClasificacion(clasificacion.id, ranking, {
    estado: "PUBLICADA",
    publicadaEn: new Date(),
  });
}

type EntradaClasificacionJornada = { binomioId: string; puntos: number; pruebas: number; bonus: number };

/** Escribe (o, si el ranking está vacío, borra) la fila ClasificacionJornada
 * de una agrupación concreta (una modalidad, o "GENERAL") de una jornada,
 * junto con sus entradas — mismo patrón de "borrar y recrear" que
 * `guardarRankingClasificacion`, pero para la clasificación de jornada. Se
 * borra en vez de dejarla vacía cuando ya no hay resultados publicados que
 * la respalden (p. ej. al despublicar una manga), para no dejar clasificaciones
 * fantasma con cero entradas dando vueltas por la web. */
async function guardarClasificacionJornada(
  jornadaId: string,
  nivel: NivelCompeticion,
  categoria: CategoriaTalla,
  agrupacion: string,
  ranking: EntradaClasificacionJornada[]
) {
  if (ranking.length === 0) {
    await prisma.clasificacionJornada.deleteMany({
      where: { jornadaId, nivel, categoria, agrupacion },
    });
    return;
  }

  const clasificacion = await prisma.clasificacionJornada.upsert({
    where: { jornadaId_nivel_categoria_agrupacion: { jornadaId, nivel, categoria, agrupacion } },
    create: { jornadaId, nivel, categoria, agrupacion, estado: "PUBLICADA", publicadaEn: new Date() },
    update: { estado: "PUBLICADA", publicadaEn: new Date(), actualizadaEn: new Date() },
  });

  await prisma.$transaction([
    prisma.clasificacionJornadaEntrada.deleteMany({ where: { clasificacionJornadaId: clasificacion.id } }),
    ...ranking.map((entrada, index) =>
      prisma.clasificacionJornadaEntrada.create({
        data: {
          clasificacionJornadaId: clasificacion.id,
          binomioId: entrada.binomioId,
          posicion: index + 1,
          puntos: entrada.puntos,
          bonus: entrada.bonus,
        },
      })
    ),
  ]);
}

/** Recalcula la clasificación de ESTA jornada para un nivel/categoría
 * concretos: una fila por cada modalidad disputada ese día en ese
 * nivel/categoría (solo sirve para saber quién sube al podio de esa
 * modalidad — trofeo, sin bono de puntos) y una fila "GENERAL" combinando
 * todas esas modalidades (con el bono de podio -8/-6/-2 para el 1º/2º/3º,
 * que SÍ se resta también de la clasificación de temporada — ver
 * `BONOS_PODIO_JORNADA`). Al final recalcula la clasificación de temporada
 * de ese nivel/categoría para que recoja el bono recién calculado.
 *
 * Se llama automáticamente al publicar o despublicar una manga o una
 * jornada entera: no hace falta esperar a que acabe toda la jornada para
 * tener la clasificación de esa manga (David: "conforme acabo esa ronda
 * de esa altura, publico esa clasificación... y automáticamente
 * calcularemos la clasificación general"). */
async function recalcularClasificacionJornada(
  jornadaId: string,
  temporadaId: string,
  nivel: NivelCompeticion,
  categoria: CategoriaTalla
) {
  const tallasDeCategoria = (["MINI1", "MINI2", "MEDIA", "MAXI", "LARGE"] as const).filter(
    (t) => categoriaDeTalla(t) === categoria
  );

  const competiciones = (await prisma.competicion.findMany({
    where: { jornadaId, nivel, talla: { in: tallasDeCategoria } },
    select: { modalidad: true },
  })) as { modalidad: Modalidad }[];
  const modalidades = Array.from(new Set(competiciones.map((c) => c.modalidad)));

  for (const modalidad of modalidades) {
    const acumulado = await calcularPenalizacionesPorBinomio({
      temporadaId,
      nivel,
      categoria,
      modalidad,
      soloJornadaId: jornadaId,
    });
    const ranking: EntradaClasificacionJornada[] = Array.from(acumulado.entries())
      .map(([binomioId, datos]) => ({ binomioId, puntos: datos.puntos, pruebas: datos.pruebas, bonus: 0 }))
      .sort((a, b) => a.puntos - b.puntos);
    await guardarClasificacionJornada(jornadaId, nivel, categoria, modalidad, ranking);
  }

  const acumuladoGeneral = await calcularPenalizacionesPorBinomio({
    temporadaId,
    nivel,
    categoria,
    soloJornadaId: jornadaId,
  });
  const rankingGeneral: EntradaClasificacionJornada[] = Array.from(acumuladoGeneral.entries())
    .map(([binomioId, datos]) => ({ binomioId, puntos: datos.puntos, pruebas: datos.pruebas, bonus: 0 }))
    .sort((a, b) => a.puntos - b.puntos)
    .map((entrada, index) => ({ ...entrada, bonus: BONOS_PODIO_JORNADA[index] ?? 0 }));
  await guardarClasificacionJornada(jornadaId, nivel, categoria, "GENERAL", rankingGeneral);

  // La clasificación de temporada tiene que recoger el bono que se acaba
  // de escribir arriba.
  await recalcularYPublicarClasificacion(temporadaId, nivel, categoria);
}

/** Recalcula y publica automáticamente la clasificación de jornada Y la de
 * temporada (nivel × categoría de talla) a la que pertenece una manga
 * (Competicion) concreta — se llama al publicar o despublicar los
 * resultados de esa manga. Como la clasificación general suma todas las
 * modalidades del mismo nivel/categoría, esto también actualiza la
 * general en cuanto se publican, por ejemplo, tanto Standard como Jumping
 * de un mismo nivel. */
export async function recalcularClasificacionDeCompeticionAction(competicionId: string) {
  await requireSession();
  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    include: { jornada: { select: { temporadaId: true } } },
  });
  await recalcularClasificacionJornada(
    competicion.jornadaId,
    competicion.jornada.temporadaId,
    competicion.nivel,
    categoriaDeTalla(competicion.talla)
  );
  revalidatePath("/backoffice/clasificaciones");
  revalidatePath("/clasificaciones");
}

/** Igual que la anterior pero para todas las combinaciones nivel/categoría
 * que tenga una jornada entera — se llama al publicar o despublicar la
 * jornada completa desde el asistente. */
export async function recalcularClasificacionesDeJornadaAction(jornadaId: string) {
  await requireSession();
  const [jornada, competiciones] = await Promise.all([
    prisma.jornada.findUniqueOrThrow({ where: { id: jornadaId }, select: { temporadaId: true } }),
    prisma.competicion.findMany({ where: { jornadaId }, select: { nivel: true, talla: true } }),
  ]);

  const combos = new Set<string>();
  for (const c of competiciones as { nivel: NivelCompeticion; talla: Talla }[]) {
    combos.add(`${c.nivel}:${categoriaDeTalla(c.talla)}`);
  }

  for (const combo of combos) {
    const [nivel, categoria] = combo.split(":") as [NivelCompeticion, CategoriaTalla];
    await recalcularClasificacionJornada(jornadaId, jornada.temporadaId, nivel, categoria);
  }

  revalidatePath("/backoffice/clasificaciones");
  revalidatePath("/clasificaciones");
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
