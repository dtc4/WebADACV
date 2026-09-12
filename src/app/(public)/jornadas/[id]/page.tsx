import { notFound } from "next/navigation";
import Link from "next/link";
import { getJornadaPublicaConResultados, getClasificacionesJornada } from "@/lib/data/public";
import { ETIQUETA_MODALIDAD, ETIQUETA_NIVEL, ETIQUETA_TALLA_CORTA, ETIQUETA_CALIFICACION, ESTILO_CALIFICACION } from "@/lib/constants";
import { ETIQUETA_CATEGORIA } from "@/lib/rules/categorias";

const MEDALLA = ["🥇", "🥈", "🥉"];

export default async function JornadaPublicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jornada = await getJornadaPublicaConResultados(id);
  if (!jornada) notFound();

  const clasificacionesJornada = await getClasificacionesJornada(id);
  const gruposClasificacion = new Map<string, typeof clasificacionesJornada>();
  for (const fila of clasificacionesJornada) {
    const clave = `${fila.nivel}:${fila.categoria}`;
    if (!gruposClasificacion.has(clave)) gruposClasificacion.set(clave, []);
    gruposClasificacion.get(clave)!.push(fila);
  }

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

      {gruposClasificacion.size > 0 ? (
        <div className="space-y-10 mt-12">
          <h2 className="font-display text-2xl">Clasificación de la jornada</h2>
          {Array.from(gruposClasificacion.entries()).map(([clave, filas]) => {
            const [nivel, categoria] = clave.split(":");
            const general = filas.find((f) => f.agrupacion === "GENERAL");
            const porModalidad = filas.filter((f) => f.agrupacion !== "GENERAL");
            return (
              <section key={clave}>
                <h3 className="font-semibold text-lg mb-1">
                  {ETIQUETA_NIVEL[nivel] ?? nivel} · {ETIQUETA_CATEGORIA[categoria as keyof typeof ETIQUETA_CATEGORIA] ?? categoria}
                </h3>
                <p className="text-xs text-black/50 mb-3">
                  Se dan trofeos a los tres primeros de la general de la jornada y de cada modalidad. El 1º,
                  2º y 3º de la general además restan puntos de bonificación (−8/−6/−2) tanto de esta jornada
                  como de la clasificación de temporada.
                </p>

                {porModalidad.length > 0 ? (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {porModalidad.map((f) => (
                      <div key={f.id} className="card px-4 py-3 text-sm">
                        <p className="font-semibold mb-1">{ETIQUETA_MODALIDAD[f.agrupacion] ?? f.agrupacion}</p>
                        {f.entradas.slice(0, 3).map((e, i) => (
                          <p key={e.id} className="text-black/70">
                            {MEDALLA[i]} {e.binomio.guia.nombre} {e.binomio.guia.apellidos} · {e.binomio.perro.nombre}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}

                {general && general.entradas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm card">
                      <thead>
                        <tr className="text-left text-black/50 border-b border-black/10">
                          <th className="py-3 px-4">Pos.</th>
                          <th className="py-3 px-4">Binomio</th>
                          <th className="py-3 px-4">Club</th>
                          <th className="py-3 px-4">Puntos</th>
                          <th className="py-3 px-4">Desc.</th>
                          <th className="py-3 px-4">Total jornada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {general.entradas.map((e, i) => (
                          <tr
                            key={e.id}
                            className={`border-b border-black/5 last:border-0 ${i < 3 ? "bg-brand-yellow/10" : ""}`}
                          >
                            <td className="py-3 px-4 font-semibold">
                              {MEDALLA[i] ?? ""} {e.posicion}
                            </td>
                            <td className="py-3 px-4">
                              {e.binomio.guia.nombre} {e.binomio.guia.apellidos} · {e.binomio.perro.nombre}
                            </td>
                            <td className="py-3 px-4 text-black/60">{e.binomio.club?.nombre ?? "—"}</td>
                            <td className="py-3 px-4">{e.puntos.toFixed(2)}</td>
                            <td className="py-3 px-4">{e.bonus !== 0 ? e.bonus : "—"}</td>
                            <td className="py-3 px-4 font-semibold">{(e.puntos + e.bonus).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

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
