import type { Calificacion, Modalidad, Talla } from "@prisma/client";

/** Una banda de calificación por manga: si la penalización total (parte
 * entera) es <= max, se asigna `nombre`. La última banda de la lista debe
 * tener max = null (catch-all -> normalmente "NO_CALIFICADO"). */
export type BandaCalificacion = {
  nombre: Calificacion;
  max: number | null;
};

/** Forma en memoria de una ReglaModalidad (igual que el modelo de Prisma,
 * pero con `bandasCalificacion` ya tipado en vez de `Json`). */
export type ReglaModalidadConfig = {
  modalidad: Modalidad;
  penalizacionFalta: number;
  penalizacionRehuse: number;
  penalizacionPorSegundo: number;
  penalizacionEliminacion: number;
  rehusesParaEliminar: number;
  trmFactorMin: number;
  trmFactorMax: number;
  bandasCalificacion: BandaCalificacion[];
};

/** Bandas de calificación oficiales (reglamento ADACV, agosto 2025).
 * Se usan como valor por defecto al crear una temporada nueva; cada
 * temporada puede ajustarlas sin tocar código (quedan guardadas en BD). */
export const BANDAS_CALIFICACION_OFICIALES: BandaCalificacion[] = [
  { nombre: "EXCELENTE", max: 5 },
  { nombre: "MUY_BUENO", max: 10 },
  { nombre: "BUENO", max: 15 },
  { nombre: "SUFICIENTE", max: 25 },
  { nombre: "NO_CALIFICADO", max: null },
];

/** Datos crudos introducidos por secretaría para una manga de un binomio. */
export type DatosCrudosResultado = {
  faltas: number;
  rehuses: number;
  tiempoS: number | null;
  /** Eliminación marcada a mano por causas ajenas a rehúses/TRM (orden de
   * obstáculos, comportamiento, etc. — ver reglamento, 24 supuestos). */
  eliminadoManual: boolean;
  motivoEliminacionManual?: string | null;
};

/** Parámetros de la manga necesarios para calcular TRS/TRM. */
export type ParametrosTiempoCompeticion = {
  longitudM: number | null;
  velocidadMs: number | null;
  tiempoParadaMesaS: number;
  trmFactor: number;
};

export type ResultadoCalculado = {
  trs: number | null;
  trm: number | null;
  penalizacionTiempo: number | null;
  penalizacionTotal: number;
  calificacion: Calificacion;
  eliminado: boolean;
  motivoEliminacion: string | null;
};

export type MotorNoImplementadoError = {
  modalidad: Modalidad;
  mensaje: string;
};
