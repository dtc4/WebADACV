import type { Calificacion } from "@prisma/client";
import type { BandaCalificacion } from "./types";

/**
 * Asigna la mención (calificación) por manga según la penalización total,
 * usando la parte entera (el reglamento dice "sin decimales") y las
 * bandas configuradas para la temporada/modalidad. Las bandas deben venir
 * ordenadas de menor a mayor `max`, con la última en `max: null`
 * (catch-all).
 */
export function calcularCalificacion(
  penalizacionTotal: number,
  bandas: BandaCalificacion[]
): Calificacion {
  const total = Math.floor(penalizacionTotal);
  for (const banda of bandas) {
    if (banda.max === null || total <= banda.max) {
      return banda.nombre;
    }
  }
  // Nunca debería llegar aquí si la última banda tiene max: null, pero por
  // seguridad devolvemos la banda más desfavorable de la lista.
  return bandas[bandas.length - 1]?.nombre ?? "NO_CALIFICADO";
}

export const ETIQUETA_CALIFICACION: Record<Calificacion, string> = {
  EXCELENTE: "Excelente",
  MUY_BUENO: "Muy Bueno",
  BUENO: "Bueno",
  SUFICIENTE: "Suficiente",
  NO_CALIFICADO: "No Calificado",
  ELIMINADO: "Eliminado",
};

/** Clases utilitarias de Tailwind para pintar cada calificación de forma
 * consistente en toda la app (público y backoffice). */
export const ESTILO_CALIFICACION: Record<Calificacion, string> = {
  EXCELENTE: "bg-success/10 text-success",
  MUY_BUENO: "bg-brand-blue/10 text-brand-blue",
  BUENO: "bg-brand-blue/10 text-brand-blue",
  SUFICIENTE: "bg-brand-yellow/20 text-brand-ink",
  NO_CALIFICADO: "bg-black/5 text-black/60",
  ELIMINADO: "bg-danger/10 text-danger",
};
