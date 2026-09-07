import Link from "next/link";
import { getTemporadas } from "@/lib/data/backoffice";
import { activarTemporadaAction } from "@/app/actions/temporadas";

export default async function TemporadasPage() {
  const temporadas = await getTemporadas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Temporadas</h1>
        <Link href="/backoffice/temporadas/nueva" className="btn-primary">
          + Nueva temporada
        </Link>
      </div>

      {temporadas.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">Todavía no hay ninguna temporada creada.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Temporada</th>
                <th className="py-2 pr-4">Del</th>
                <th className="py-2 pr-4">Al</th>
                <th className="py-2 pr-4">Jornadas previstas</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {temporadas.map((t) => (
                <tr key={t.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/temporadas/${t.id}`} className="font-medium hover:underline">
                      {t.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{new Date(t.fechaInicio).toLocaleDateString("es-ES")}</td>
                  <td className="py-2 pr-4">{new Date(t.fechaFin).toLocaleDateString("es-ES")}</td>
                  <td className="py-2 pr-4">{t.numeroJornadas ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {t.activa ? (
                      <span className="chip bg-success/10 text-success border-success/20">Activa</span>
                    ) : (
                      <span className="chip bg-black/5 text-black/60 border-black/10">Inactiva</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {!t.activa ? (
                      <form action={activarTemporadaAction}>
                        <input type="hidden" name="temporadaId" value={t.id} />
                        <button type="submit" className="text-brand-blue text-sm hover:underline">
                          Activar
                        </button>
                      </form>
                    ) : null}
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
