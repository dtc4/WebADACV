"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TALLAS_CON_GRADO } from "@/lib/constants";

function requireSession() {
  return getSession();
}

/** Fisher-Yates: baraja un array sin mutar el original. */
function barajar<T>(items: T[]): T[] {
  const resultado = [...items];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
}

/**
 * Sortea el orden de salida de una manga (Competicion): coge los binomios
 * inscritos en la jornada (ver src/app/actions/inscripciones.ts) cuyo perro
 * tenga la talla de la manga y "encajen" en su nivel, los baraja al azar y
 * crea un Resultado con `dorsal` 1..N para cada uno (el resto de campos del
 * resultado los rellenará después quien juzgue).
 *
 * Qué cuenta como "encajar" depende de la manga:
 *   - Manga de Nivel II/III (solo existen para Maxi/Large): hace falta que
 *     el perro tenga EXACTAMENTE ese nivel guardado en su ficha. Si no
 *     tiene nivel asignado todavía, se excluye (de verdad hace falta
 *     decidirlo, porque hay más de una manga posible para su talla).
 *   - Manga "Sin grado" (el resto de tallas, que no se dividen en grado):
 *     entran todos los inscritos de esa talla que no compitan en
 *     Performance, tengan o no nivel guardado en su ficha — lo normal es
 *     que no lo tengan, porque para esas tallas no hace falta asignarlo.
 *   - Manga de Performance: entran solo los inscritos marcados como
 *     Performance en la ficha de su perro (de cualquier talla-grado).
 *
 * `excluidosSinNivel` en el resultado solo cuenta el primer caso (Maxi/
 * Large sin decidir); nunca a los binomios de tallas sin grado, para no
 * pedirles un dato que no necesitan.
 *
 * No se permite repetir el sorteo si ya se ha empezado a introducir algún
 * resultado real en esta manga (tiempo o eliminación), para no pisar datos
 * ya capturados por el juez/mesa.
 */
export async function realizarSorteoAction(competicionId: string) {
  await requireSession();
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    include: { resultados: true },
  });

  const yaHayResultadosReales = competicion.resultados.some(
    (r: { tiempoS: number | null; eliminado: boolean }) => r.tiempoS !== null || r.eliminado
  );
  if (yaHayResultadosReales) {
    throw new Error(
      "Ya se han empezado a introducir resultados en esta manga; no se puede repetir el sorteo."
    );
  }

  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      jornadaId: competicion.jornadaId,
      binomio: { perro: { talla: competicion.talla } },
    },
    select: { binomioId: true, binomio: { select: { perro: { select: { nivel: true } } } } },
  });

  const tallaConGrado = (TALLAS_CON_GRADO as string[]).includes(competicion.talla);

  let excluidosSinNivel = 0;
  const binomioIdsSorteables: string[] = [];
  for (const inscripcion of inscripciones as {
    binomioId: string;
    binomio: { perro: { nivel: string | null } };
  }[]) {
    const nivel = inscripcion.binomio.perro.nivel;

    if (competicion.nivel === "PERFORMANCE") {
      if (nivel === "PERFORMANCE") binomioIdsSorteables.push(inscripcion.binomioId);
      continue;
    }

    if (!tallaConGrado) {
      // Talla sin grado (no es Maxi/Large): entra cualquier inscrito de esa
      // talla que no compita en Performance, tenga o no nivel guardado en
      // su ficha — para estas tallas no hace falta asignarlo.
      if (nivel !== "PERFORMANCE") binomioIdsSorteables.push(inscripcion.binomioId);
      continue;
    }

    // Manga de Nivel II/III: aquí sí hace falta que el perro tenga ese
    // nivel exacto guardado en su ficha.
    if (nivel === null) {
      excluidosSinNivel++;
      continue;
    }
    if (nivel === competicion.nivel) {
      binomioIdsSorteables.push(inscripcion.binomioId);
    }
  }

  const orden = barajar(binomioIdsSorteables);

  await prisma.$transaction([
    // Seguro de borrar: el guard de arriba ya garantiza que ningún
    // Resultado de esta competición tiene datos reales (como mucho son los
    // dorsales de un sorteo anterior sobre esta misma manga).
    prisma.resultado.deleteMany({ where: { competicionId } }),
    prisma.resultado.createMany({
      data: orden.map((binomioId, index) => ({
        competicionId,
        binomioId,
        dorsal: index + 1,
      })),
    }),
  ]);

  revalidatePath(`/backoffice/jornadas/${competicion.jornadaId}`);

  return { creados: orden.length, excluidosSinNivel };
}

/** Actualiza el dorsal (orden de salida) de cada Resultado de una
 * competición a partir de un formulario con un campo `orden-<resultadoId>`
 * por fila (ver el bloque "Orden de salida" del paso Resultados). */
export async function actualizarOrdenSalidaAction(competicionId: string, formData: FormData) {
  await requireSession();
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  const actualizaciones: { resultadoId: string; dorsal: number }[] = [];
  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("orden-")) continue;
    const resultadoId = clave.slice("orden-".length);
    const dorsal = Number(valor);
    if (!resultadoId || !Number.isFinite(dorsal)) continue;
    actualizaciones.push({ resultadoId, dorsal });
  }

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    select: { jornadaId: true },
  });

  await prisma.$transaction(
    actualizaciones.map(({ resultadoId, dorsal }) =>
      prisma.resultado.update({ where: { id: resultadoId }, data: { dorsal } })
    )
  );

  revalidatePath(`/backoffice/jornadas/${competicion.jornadaId}`);
}
