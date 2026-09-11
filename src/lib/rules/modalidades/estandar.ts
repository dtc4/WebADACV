import type {
  DatosCrudosResultado,
  ParametrosTiempoCompeticion,
  ReglaModalidadConfig,
  ResultadoCalculado,
} from "../types";
import { calcularTRM, calcularTRS } from "../tiempo";
import { calcularCalificacion } from "../calificacion";

/**
 * Motor de puntuación "estándar" del reglamento ADACV: válido para
 * Agility Standard, Jumping y Performance (mismas reglas de
 * penalización/eliminación, solo cambian obstáculos/alturas, que no
 * afectan al cálculo de puntos).
 *
 * Reglas (reglamento agosto 2025):
 *  - 5 puntos por falta, 5 puntos por rehúse (configurable).
 *  - 1 punto por segundo de exceso sobre el TRS (configurable).
 *  - Eliminación (50 puntos) si: se supera el TRM, se alcanza el nº de
 *    rehúses configurado (por defecto 3º rehúse), o eliminación manual
 *    por cualquiera de las otras causas del reglamento (orden de
 *    obstáculos, comportamiento, etc.).
 */
export function calcularResultadoEstandar(
  datos: DatosCrudosResultado,
  parametrosTiempo: ParametrosTiempoCompeticion,
  regla: ReglaModalidadConfig
): ResultadoCalculado {
  // No presentado tiene prioridad sobre cualquier otro dato crudo: un
  // binomio que no se presenta a su manga recibe la penalización fija
  // configurada (75 puntos por defecto), no la de eliminación normal, y
  // no tiene TRS/TRM/tiempo que calcular.
  if (datos.noPresentado) {
    return {
      trs: null,
      trm: null,
      penalizacionTiempo: null,
      penalizacionTotal: regla.penalizacionNoPresentado,
      calificacion: "ELIMINADO",
      eliminado: true,
      motivoEliminacion: "No presentado",
      noPresentado: true,
    };
  }

  const trs = calcularTRS(parametrosTiempo);
  const trm = calcularTRM(trs, parametrosTiempo.trmFactor, regla);

  const excedeTRM = trm !== null && datos.tiempoS !== null && datos.tiempoS > trm;
  const eliminadoPorRehuses = datos.rehuses >= regla.rehusesParaEliminar;
  const eliminado = datos.eliminadoManual || excedeTRM || eliminadoPorRehuses;

  let motivoEliminacion: string | null = null;
  if (datos.eliminadoManual) {
    motivoEliminacion = datos.motivoEliminacionManual ?? "Eliminación por infracción del reglamento";
  } else if (eliminadoPorRehuses) {
    motivoEliminacion = `${regla.rehusesParaEliminar}er rehúse`;
  } else if (excedeTRM) {
    motivoEliminacion = "Tiempo Recorrido Máximo (TRM) superado";
  }

  if (eliminado) {
    return {
      trs,
      trm,
      penalizacionTiempo: null,
      penalizacionTotal: regla.penalizacionEliminacion,
      calificacion: "ELIMINADO",
      eliminado: true,
      motivoEliminacion,
      noPresentado: false,
    };
  }

  const penalizacionTiempo =
    trs !== null && datos.tiempoS !== null && datos.tiempoS > trs
      ? (datos.tiempoS - trs) * regla.penalizacionPorSegundo
      : 0;

  const penalizacionTotal =
    datos.faltas * regla.penalizacionFalta +
    datos.rehuses * regla.penalizacionRehuse +
    penalizacionTiempo;

  return {
    trs,
    trm,
    penalizacionTiempo,
    penalizacionTotal,
    calificacion: calcularCalificacion(penalizacionTotal, regla.bandasCalificacion),
    eliminado: false,
    motivoEliminacion: null,
    noPresentado: false,
  };
}

/**
 * Steeplechase: mismo motor de puntos que el estándar, pero un único
 * contacto (empalizada) y los rehúses NO eliminan — solo penalizan en
 * puntos y tiempo. Se reutiliza el motor estándar forzando
 * `rehusesParaEliminar` a un valor inalcanzable para esta manga.
 */
export function calcularResultadoSteeplechase(
  datos: DatosCrudosResultado,
  parametrosTiempo: ParametrosTiempoCompeticion,
  regla: ReglaModalidadConfig
): ResultadoCalculado {
  return calcularResultadoEstandar(datos, parametrosTiempo, {
    ...regla,
    rehusesParaEliminar: Number.MAX_SAFE_INTEGER,
  });
}
