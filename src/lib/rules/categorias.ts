import type { CategoriaTalla, Talla } from "@prisma/client";

/**
 * El reglamento define 5 alturas de salto (Mini 1, Mini 2, Media, Maxi,
 * Large) pero agrupa Mini 1 + Mini 2 en una única categoría "Mini" a
 * efectos de clasificación. Guardamos las 5 alturas en BD (Talla) porque
 * afectan a la altura de obstáculos, y derivamos la categoría de
 * clasificación (CategoriaTalla, 4 valores) aquí en vez de duplicar el
 * dato en cada Resultado.
 */
export function categoriaDeTalla(talla: Talla): CategoriaTalla {
  switch (talla) {
    case "MINI1":
    case "MINI2":
      return "MINI";
    case "MEDIA":
      return "MEDIA";
    case "MAXI":
      return "MAXI";
    case "LARGE":
      return "LARGE";
  }
}

export const ETIQUETA_TALLA: Record<Talla, string> = {
  MINI1: "Mini 1 (<30cm)",
  MINI2: "Mini 2 (30–36cm)",
  MEDIA: "Media (36–43cm)",
  MAXI: "Maxi (43–51cm)",
  LARGE: "Large (>51cm)",
};

export const ETIQUETA_CATEGORIA: Record<CategoriaTalla, string> = {
  MINI: "Mini",
  MEDIA: "Media",
  MAXI: "Maxi",
  LARGE: "Large",
};
