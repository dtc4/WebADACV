import Link from "next/link";
import { getTemporadaActiva, getClasificacionPublicada } from "@/lib/data/public";
import { NIVELES, CATEGORIAS_TALLA, ETIQUETA_NIVEL } from "@/lib/constants";
import type { CategoriaTalla, NivelCompeticion } from "@prisma/client";

export default async function ClasificacionesPublicasPage({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string; categoria?: string }>;
}) {
  const params = await searchParams;
  const temporada = await getTemporadaActiva();
  const nivel = (params?.nivel ?? "NIVEL_III") as NivelCompeticion;
  const categoria = (params?.categoria ?? "MEDIA") as CategoriaTalla;

  const clasificacion = temporada
    ? await getClasificacionPublicada(temporada.id, nivel, categoria)
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-2">Clasificaciones</h1>
      <p className="text-black/60 mb-8">{temporada ? `Temporada ${temporada.nombre}` : "Sin temporada activa"}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {NIVELES.map((n) => (
          <Link
            key={n.value}
            href={`/clasificaciones?nivel=${n.value}&categoria=${categoria}`}
            className={`chip border ${
              n.value === nivel
                ? "bg-brand-ink text-white border-brand-ink"
                : "bg-white text-brand-ink border-black/15 hover:bg-black/5"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIAS_TALLA.map((c) => (
          <Link
            key={c.value}
            href={`/clasificaciones?nivel=${nivel}&categoria=${c.value}`}
            className={`chip border ${
              c.value === categoria
                ? "bg-brand-blue text-white border-brand-blue"
                : "bg-white text-brand-ink border-black/15 hover:bg-black/5"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {!clasificacion || clasificacion.entradas.length === 0 ? (
        <p className="text-black/50">
          Todavía no hay clasificación publicada para {ETIQUETA_NIVEL[nivel]?.toLowerCase()} · {categoria.toLowerCase()}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm card">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-3 px-4">Pos.</th>
                <th className="py-3 px-4">Binomio</th>
                <th className="py-3 px-4">Club</th>
                <th className="py-3 px-4">Pruebas</th>
                <th className="py-3 px-4">Puntos</th>
                <th className="py-3 px-4">Tend.</th>
              </tr>
            </thead>
            <tbody>
              {clasificacion.entradas.map((e) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0">
                  <td className="py-3 px-4 font-semibold">{e.posicion}</td>
                  <td className="py-3 px-4">
                    {e.binomio.guia.nombre} {e.binomio.guia.apellidos} · {e.binomio.perro.nombre}
                  </td>
                  <td className="py-3 px-4 text-black/60">{e.binomio.club?.nombre ?? "—"}</td>
                  <td className="py-3 px-4">{e.pruebasDisputadas}</td>
                  <td className="py-3 px-4">{e.puntos.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    {e.tendencia > 0 ? (
                      <span className="text-success">↑</span>
                    ) : e.tendencia < 0 ? (
                      <span className="text-danger">↓</span>
                    ) : (
                      <span className="text-black/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
