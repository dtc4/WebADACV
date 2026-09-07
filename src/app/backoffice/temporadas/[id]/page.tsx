import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemporadaPorId, getJornadasTemporada } from "@/lib/data/backoffice";
import { activarTemporadaAction, agregarJornadaExtraAction, eliminarTemporadaAction } from "@/app/actions/temporadas";
import { eliminarJornadaAction } from "@/app/actions/jornadas";

export default async function TemporadaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temporada = await getTemporadaPorId(id);
  if (!temporada) notFound();

  const jornadas = await getJornadasTemporada(temporada.id);
  const pendientes = jornadas.filter((j) => !j.configurada).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/backoffice/temporadas" className="text-sm text-black/50 hover:underline">
          ← Temporadas
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-semibold">{temporada.nombre}</h1>
          <div className="flex items-center gap-2">
            <Link href={`/backoffice/temporadas/${temporada.id}/editar`} className="btn-secondary">
              Editar
            </Link>
            {temporada.activa ? (
              <span className="chip bg-success/10 text-success border-success/20">Temporada activa</span>
            ) : (
              <form action={activarTemporadaAction}>
                <input type="hidden" name="temporadaId" value={temporada.id} />
                <button type="submit" className="btn-secondary">
                  Marcar como activa
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-sm text-black/50 mt-1">
          {new Date(temporada.fechaInicio).toLocaleDateString("es-ES")} —{" "}
          {new Date(temporada.fechaFin).toLocaleDateString("es-ES")} · {temporada.numeroJornadas ?? jornadas.length}{" "}
          jornadas previstas
          {pendientes > 0 ? ` · ${pendientes} por configurar` : ""}
        </p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Jornadas</h2>
          <Link href={`/backoffice/jornadas/nueva?temporadaId=${temporada.id}`} className="btn-primary">
            + Nueva jornada
          </Link>
        </div>

        {jornadas.length === 0 ? (
          <p className="text-sm text-black/50">Esta temporada todavía no tiene jornadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Jornada</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Lugar</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {jornadas.map((j) => (
                <tr key={j.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/jornadas/${j.id}`} className="font-medium hover:underline">
                      {j.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {j.configurada ? new Date(j.fecha).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="py-2 pr-4">{j.configurada ? (j.lugar ?? "—") : "—"}</td>
                  <td className="py-2 pr-4">
                    {!j.configurada ? (
                      <span className="chip bg-black/5 text-black/50 border-black/10">Sin configurar</span>
                    ) : j.estado === "PUBLICADA" ? (
                      <span className="chip bg-success/10 text-success border-success/20">Publicada</span>
                    ) : (
                      <span className="chip bg-black/5 text-black/60 border-black/10">Borrador</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {j.estado !== "PUBLICADA" ? (
                      <form action={eliminarJornadaAction}>
                        <input type="hidden" name="jornadaId" value={j.id} />
                        <button type="submit" className="text-danger text-sm hover:underline">
                          Eliminar
                        </button>
                      </form>
                    ) : (
                      <span className="text-black/30 text-xs">Despublica para borrar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={agregarJornadaExtraAction} className="pt-4 mt-4 border-t border-black/10">
          <input type="hidden" name="temporadaId" value={temporada.id} />
          <button type="submit" className="text-sm text-brand-blue hover:underline">
            + Añadir una jornada adicional (fuera del plan original)
          </button>
        </form>
      </div>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar temporada</h2>
        <p className="text-sm text-black/60 mb-4">
          Esto borra la temporada junto con todas sus jornadas, competiciones, resultados y
          clasificaciones. No se puede deshacer. Escribe el nombre exacto de la temporada (
          <strong>{temporada.nombre}</strong>) para confirmar.
        </p>
        <form action={eliminarTemporadaAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="temporadaId" value={temporada.id} />
          <input
            name="confirmacionNombre"
            placeholder={temporada.nombre}
            required
            className="input max-w-xs"
          />
          <button type="submit" className="btn-danger">
            Borrar temporada definitivamente
          </button>
        </form>
      </div>
    </div>
  );
}
