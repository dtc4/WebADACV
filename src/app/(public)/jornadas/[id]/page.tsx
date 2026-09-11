import { notFound } from "next/navigation";
import Link from "next/link";
import { getJornadaPublicaConResultados } from "@/lib/data/public";
import { ETIQUETA_MODALIDAD, ETIQUETA_NIVEL, ETIQUETA_TALLA_CORTA, ETIQUETA_CALIFICACION, ESTILO_CALIFICACION } from "@/lib/constants";

export default async function JornadaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jornada = await getJornadaPublicaConResultados(id);
  if (!jornada) notFound();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <p className="text-xs uppercase tracking-wide text-black/40 mb-2">
        {new Date(jornada.fecha).toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <h1 className="font-display text-4xl mb-2">{jornada.nombre}</h1>
      <p className="text-black/60 mb-10">
        {jornada.lugar ?? "—"}
        {jornada.club ? ` · ${jornada.club.nombre}` : ""}
        {jornada.juez ? ` · Juez principal: ${jornada.juez.nombre}` : ""}
      </p>

      {jornada.estado !== "PUBLICADA" ? (
        <p className="text-black/50">
          Los resultados de esta jornada todavía no se han publicado. Vuelve a consultarlos cuando
          termine de celebrarse.
        </p>
      ) : jornada.competiciones.length === 0 ? (
        <p className="text-black/50">Todavía no hay resultados publicados de esta jornada.</p>
      ) : (
        <div className="space-y-10">
          {jornada.competiciones.map((c) => (
            <section key={c.id}>
              <h2 className="font-semibold text-lg mb-3">
                {ETIQUETA_MODALIDAD[c.modalidad] ?? c.modalidad} · {ETIQUETA_NIVEL[c.nivel] ?? c.nivel} ·{" "}
                {ETIQUETA_TALLA_CORTA[c.talla] ?? c.talla}
                {c.manga > 1 ? ` · Manga ${c.manga}` : ""}
              </h2>
              {c.resultados.length === 0 ? (
                <p className="text-sm text-black/50">Sin resultados publicados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm card">
                    <thead>
                      <tr className="text-left text-black/50 border-b border-black/10">
                        <th className="py-3 px-4">Pos.</th>
                        <th className="py-3 px-4">Binomio</th>
                        <th className="py-3 px-4">Club</th>
                        <th className="py-3 px-4">Tiempo</th>
                        <th className="py-3 px-4">Faltas</th>
                        <th className="py-3 px-4">Rehúses</th>
                        <th className="py-3 px-4">Penalización</th>
                        <th className="py-3 px-4">Calificación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.resultados.map((r, i) => (
                        <tr key={r.id} className="border-b border-black/5 last:border-0">
                          <td className="py-3 px-4 font-semibold">{i + 1}</td>
                          <td className="py-3 px-4">
                            {r.binomio.guia.nombre} {r.binomio.guia.apellidos} · {r.binomio.perro.nombre}
                          </td>
                          <td className="py-3 px-4 text-black/60">{r.binomio.club?.nombre ?? "—"}</td>
                          <td className="py-3 px-4">{r.tiempoS ?? "—"}</td>
                          <td className="py-3 px-4">{r.faltas}</td>
                          <td className="py-3 px-4">{r.rehuses}</td>
                          <td className="py-3 px-4">
                            {r.penalizacionTotal !== null ? r.penalizacionTotal.toFixed(2) : "—"}
                          </td>
                          <td className="py-3 px-4">
                            {r.calificacion ? (
                              <span className={`chip ${ESTILO_CALIFICACION[r.calificacion] ?? ""}`}>
                                {ETIQUETA_CALIFICACION[r.calificacion] ?? r.calificacion}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {jornada.galerias.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-semibold text-lg mb-3">Galería</h2>
          <div className="flex flex-wrap gap-3">
            {jornada.galerias.map((g) => (
              <Link key={g.id} href={`/galerias/${g.id}`} className="chip bg-black/5 hover:bg-black/10">
                {g.titulo} ({g.fotos.length} fotos)
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
