"use client";

import { useState } from "react";
import { TALLAS, TALLAS_CON_GRADO } from "@/lib/constants";

/** Talla + Nivel de competición del perro, juntos porque uno condiciona al
 * otro: Nivel II/III solo existen para Maxi y Large — hay que decidirlo,
 * porque un perro de esa talla puede competir en cualquiera de los dos.
 * El resto de tallas (Mini 1, Mini 2, Media) no se dividen en grado — es
 * una única categoría, así que no hace falta asignarles nada — salvo que
 * el perro compita en Performance, que es igual de válido en cualquier
 * talla. Por eso, para esas tallas, el único valor que de verdad se puede
 * elegir aquí es Performance; dejarlo en blanco es lo normal. */
export function CamposTallaNivel({
  defaultTalla,
  defaultNivel,
}: {
  defaultTalla?: string;
  defaultNivel?: string | null;
}) {
  const [talla, setTalla] = useState(defaultTalla ?? "");
  const tieneGrado = TALLAS_CON_GRADO.includes(talla);

  const opcionesNivel = tieneGrado
    ? [
        { value: "NIVEL_II", label: "Nivel II" },
        { value: "NIVEL_III", label: "Nivel III" },
        { value: "PERFORMANCE", label: "Performance" },
      ]
    : [{ value: "PERFORMANCE", label: "Performance" }];

  // Al cambiar de talla se reinicia el nivel elegido (con key={talla} en el
  // <select>): si es la talla con la que se cargó el formulario se respeta
  // el nivel ya guardado, si se acaba de cambiar se parte de blanco.
  const esTallaInicial = talla === (defaultTalla ?? "");
  const nivelPorDefecto = esTallaInicial ? defaultNivel ?? "" : "";

  return (
    <>
      <label className="block">
        <span className="block text-sm font-medium mb-1">
          Talla <span className="text-brand-red">*</span>
        </span>
        <select
          name="talla"
          required
          className="input"
          value={talla}
          onChange={(e) => setTalla(e.target.value)}
        >
          <option value="">— Selecciona —</option>
          {TALLAS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-medium mb-1">Nivel de competición (opcional)</span>
        <select key={talla} name="nivel" defaultValue={nivelPorDefecto} className="input">
          <option value="">{tieneGrado ? "— Sin asignar —" : "— No aplica —"}</option>
          {opcionesNivel.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
        {talla && !tieneGrado ? (
          <span className="block text-xs text-black/50 mt-1">
            En esta talla no hay grados II/III: compiten todos juntos, no hace falta asignar nada aquí
            (salvo que sea un perro de Performance).
          </span>
        ) : null}
      </label>
    </>
  );
}
