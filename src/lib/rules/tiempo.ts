import type { ParametrosTiempoCompeticion, ReglaModalidadConfig } from "./types";

/**
 * TRS (Tiempo Recorrido Standard) = longitud del recorrido / velocidad
 * elegida por el juez, más el tiempo de parada en mesa si aplica.
 * Se calcula, no se almacena (igual que en AgilityScore, patrón a
 * conservar según el análisis previo del proyecto).
 */
export function calcularTRS(p: ParametrosTiempoCompeticion): number | null {
  if (!p.longitudM || !p.velocidadMs) return null;
  return p.longitudM / p.velocidadMs + (p.tiempoParadaMesaS ?? 0);
}

/**
 * TRM (Tiempo Recorrido Máximo) = TRS × factor, acotado entre
 * regla.trmFactorMin y regla.trmFactorMax (reglamento: nunca menos de
 * 1,5× ni más del doble del TRS).
 */
export function calcularTRM(
  trs: number | null,
  factorSolicitado: number,
  regla: Pick<ReglaModalidadConfig, "trmFactorMin" | "trmFactorMax">
): number | null {
  if (trs === null) return null;
  const factor = Math.min(Math.max(factorSolicitado, regla.trmFactorMin), regla.trmFactorMax);
  return trs * factor;
}
