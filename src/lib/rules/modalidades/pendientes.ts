import type { Modalidad } from "@prisma/client";

/**
 * Jumping Relevos, K.O. y Dédalo/Laberinto tienen mecánicas de puntuación
 * genuinamente distintas al modelo estándar (relevos por equipo con
 * penalización solo en segundos; eliminación directa por rondas en
 * bracket; puntuación por zonas aditiva/multiplicativa en el Dédalo — ver
 * el análisis previo, sección 2.6).
 *
 * En vez de adivinar una fórmula y arriesgarnos a publicar resultados
 * oficiales incorrectos, dejamos el punto de extensión listo (el
 * dispatcher en engine.ts ya discrimina por modalidad) pero NO
 * implementamos el cálculo todavía. Hace falta una sesión con secretaría/
 * el comité de reglamento de ADACV para fijar la fórmula exacta de cada
 * una antes de programarlas.
 */
export const MODALIDADES_PENDIENTES: Modalidad[] = ["JUMPING_RELEVOS", "KO", "DEDALO"];

export function esModalidadPendiente(modalidad: Modalidad): boolean {
  return MODALIDADES_PENDIENTES.includes(modalidad);
}

export const ETIQUETA_MODALIDAD_PENDIENTE: Record<string, string> = {
  JUMPING_RELEVOS:
    "Jumping Relevos: penalización en segundos por equipo, sin eliminación por rehúses/errores — motor pendiente de definir con ADACV.",
  KO: "K.O.: eliminación directa por rondas (bracket) — motor pendiente de definir con ADACV.",
  DEDALO:
    "Dédalo/Laberinto: puntuación por 3 zonas con reglas propias — motor pendiente de definir con ADACV.",
};
