import { prisma } from "@/lib/prisma";
import type { Modalidad } from "@prisma/client";
import type { BandaCalificacion, ReglaModalidadConfig } from "@/lib/rules/types";

/** Lee la ReglaModalidad de una temporada y la adapta al tipo que espera
 * el motor de reglas (bandasCalificacion tipado en vez de Json). Lanza si
 * no existe: cada temporada nueva debe crear sus reglas explícitamente
 * (ver acción `crearTemporadaConReglasPorDefecto`) — preferimos fallar
 * alto y claro a inventar valores por defecto en silencio para algo que
 * decide resultados oficiales.
 */
export async function getReglaModalidad(
  temporadaId: string,
  modalidad: Modalidad
): Promise<ReglaModalidadConfig> {
  const regla = await prisma.reglaModalidad.findUnique({
    where: { temporadaId_modalidad: { temporadaId, modalidad } },
  });

  if (!regla) {
    throw new Error(
      `No hay reglas configuradas para la modalidad ${modalidad} en esta temporada. Configúralas antes de introducir resultados.`
    );
  }

  return {
    modalidad: regla.modalidad,
    penalizacionFalta: regla.penalizacionFalta,
    penalizacionRehuse: regla.penalizacionRehuse,
    penalizacionPorSegundo: regla.penalizacionPorSegundo,
    penalizacionEliminacion: regla.penalizacionEliminacion,
    penalizacionNoPresentado: regla.penalizacionNoPresentado,
    rehusesParaEliminar: regla.rehusesParaEliminar,
    trmFactorMin: regla.trmFactorMin,
    trmFactorMax: regla.trmFactorMax,
    bandasCalificacion: regla.bandasCalificacion as unknown as BandaCalificacion[],
  };
}
