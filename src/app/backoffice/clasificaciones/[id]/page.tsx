import Link from "next/link";
import { notFound } from "next/navigation";
import { getClasificacionConEntradas } from "@/lib/data/backoffice";
import { ETIQUETA_NIVEL, CATEGORIAS_TALLA } from "@/lib/constants";

const ETIQUETA_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_TALLA.map((c) => [c.value, c.label])
);

export default async function ClasificacionDetallePage({ params }: { params: { id: string } }) {
  const clasificacion = await getClasificacionConEntradas(params.id);
  if (!clasificacion) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/backoffice/clasificaciones" className="text-sm text-black/50 hover:underline">
          ← Clasificaciones
        </Link>
        <h1 className="text-2xl font-semibold">
          {ETIQUETA_NIVEL[clasificacion.nivel]} · {ETIQUETA_CATEGORIA[clasificacion.categoria]}
        </h1>
        <p className="text-sm text-black/50">{clasificacion.temporada.nombre}</p>
      </div>

      <div className="card p-5">
        {clasificacion.entradas.length === 0 ? (
          <p className="text-sm text-black/50">
            Todavía no hay entradas. Pulsa &quot;Recalcular&quot; desde el listado de clasificaciones tras
            publicar resultados.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Pos.</th>
                <th className="py-2 pr-4">Binomio</th>
                <th className="py-2 pr-4">Club</th>
                <th className="py-2 pr-4">Pruebas</th>
                <th className="py-2 pr-4">Puntos</th>
                <th className="py-2 pr-4">Tend.</th>
              </tr>
            </thead>
            <tbody>
              {clasificacion.entradas.map((e) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4 font-semibold">{e.posicion}</td>
                  <td className="py-2 pr-4">
                    {e.binomio.guia.nombre} {e.binomio.guia.apellidos} · {e.binomio.perro.nombre}
                  </td>
                  <td className="py-2 pr-4">{e.binomio.club?.nombre ?? "—"}</td>
                  <td className="py-2 pr-4">{e.pruebasDisputadas}</td>
                  <td className="py-2 pr-4">{e.puntos.toFixed(2)}</td>
                  <td className="py-2 pr-4">
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
        )}
      </div>
    </div>
  );
}
