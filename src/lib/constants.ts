// Listas de valores de los enums de Prisma para usar en formularios
// (incluidos componentes "use client"). Deliberadamente NO se importan en
// tiempo de ejecución desde "@prisma/client" aquí: ese paquete arrastra el
// motor de consultas y código pensado para Node, que rompe el bundle del
// cliente si se importa como valor (solo `import type` es seguro, porque
// se borra en compilación). Estos arrays deben mantenerse en sync con
// prisma/schema.prisma a mano.

export const MODALIDADES: { value: string; label: string }[] = [
  { value: "AGILITY_STANDARD", label: "Agility Standard" },
  { value: "JUMPING", label: "Jumping" },
  { value: "JUMPING_RELEVOS", label: "Jumping Relevos (motor pendiente)" },
  { value: "KO", label: "K.O. (motor pendiente)" },
  { value: "STEEPLECHASE", label: "Steeplechase" },
  { value: "DEDALO", label: "Dédalo/Laberinto (motor pendiente)" },
];

export const NIVELES: { value: string; label: string }[] = [
  { value: "NIVEL_II", label: "Nivel II" },
  { value: "NIVEL_III", label: "Nivel III" },
  { value: "PERFORMANCE", label: "Performance" },
];

export const TALLAS: { value: string; label: string }[] = [
  { value: "MINI1", label: "Mini 1 (<30cm)" },
  { value: "MINI2", label: "Mini 2 (30–36cm)" },
  { value: "MEDIA", label: "Media (36–43cm)" },
  { value: "MAXI", label: "Maxi (43–51cm)" },
  { value: "LARGE", label: "Large (>51cm)" },
];

export const CATEGORIAS_TALLA: { value: string; label: string }[] = [
  { value: "MINI", label: "Mini" },
  { value: "MEDIA", label: "Media" },
  { value: "MAXI", label: "Maxi" },
  { value: "LARGE", label: "Large" },
];

export const ETIQUETA_MODALIDAD: Record<string, string> = Object.fromEntries(
  MODALIDADES.map((m) => [m.value, m.label])
);
export const ETIQUETA_NIVEL: Record<string, string> = Object.fromEntries(
  NIVELES.map((n) => [n.value, n.label])
);
export const ETIQUETA_TALLA_CORTA: Record<string, string> = {
  MINI1: "Mini 1",
  MINI2: "Mini 2",
  MEDIA: "Media",
  MAXI: "Maxi",
  LARGE: "Large",
};

export const ETIQUETA_CALIFICACION: Record<string, string> = {
  EXCELENTE: "Excelente",
  MUY_BUENO: "Muy Bueno",
  BUENO: "Bueno",
  SUFICIENTE: "Suficiente",
  NO_CALIFICADO: "No Calificado",
  ELIMINADO: "Eliminado",
};

export const ESTILO_CALIFICACION: Record<string, string> = {
  EXCELENTE: "bg-success/10 text-success",
  MUY_BUENO: "bg-brand-blue/10 text-brand-blue",
  BUENO: "bg-brand-blue/10 text-brand-blue",
  SUFICIENTE: "bg-brand-yellow/20 text-brand-ink",
  NO_CALIFICADO: "bg-black/5 text-black/60",
  ELIMINADO: "bg-danger/10 text-danger",
};
