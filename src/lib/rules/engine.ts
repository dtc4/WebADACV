import type { Modalidad } from "@prisma/client";
import type {
  DatosCrudosResultado,
  ParametrosTiempoCompeticion,
  ReglaModalidadConfig,
  ResultadoCalculado,
} from "./types";
import { calcularResultadoEstandar, calcularResultadoSteeplechase } from "./modalidades/estandar";
import { esModalidadPendiente, ETIQUETA_MODALIDAD_PENDIENTE } from "./modalidades/pendientes";

/**
 * Punto de entrada único del motor de reglas. Todo el resto de la app
 * (server actions del backoffice, páginas públicas) debe calcular
 * penalización/calificación llamando SIEMPRE a esta función — nunca
 * reimplementar la fórmula en un componente o action.
 *
 * Lanza un error legible si la modalidad todavía no tiene motor definido
 * (ver modalidades/pendientes.ts), en vez de devolver un resultado
 * inventado.
 */
export function calcularResultado(
  modalidad: Modalidad,
  datos: DatosCrudosResultado,
  parametrosTiempo: ParametrosTiempoCompeticion,
  regla: ReglaModalidadConfig
): ResultadoCalculado {
  if (esModalidadPendiente(modalidad)) {
    throw new Error(
      ETIQUETA_MODALIDAD_PENDIENTE[modalidad] ??
        `El motor de reglas para la modalidad "${modalidad}" todavía no está implementado.`
    );
  }

  switch (modalidad) {
    case "AGILITY_STANDARD":
    case "JUMPING":
      return calcularResultadoEstandar(datos, parametrosTiempo, regla);
    case "STEEPLECHASE":
      return calcularResultadoSteeplechase(datos, parametrosTiempo, regla);
    default:
      throw new Error(`Modalidad no reconocida: ${modalidad}`);
  }
}

export * from "./types";
export * from "./calificacion";
export * from "./categorias";
export * from "./tiempo";
