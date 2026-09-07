import Link from "next/link";
import { getTemporadaActivaOFallback, getJornadasTemporada, contarResumenDashboard } from "@/lib/data/backoffice";

export default async function DashboardPage() {
  const temporada = await getTemporadaActivaOFallback();

  if (!temporada) {
    return (
      <div className="card p-6">
        <p>Todavía no hay ninguna temporada creada.</p>
      </div>
    );
  }

  const [jornadas, resumen] = await Promise.all([
    getJornadasTemporada(temporada.id),
    contarResumenDashboard(temporada.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black/50">Temporada activa</p>
          <h1 className="text-2xl font-semibold">{temporada.nombre}</h1>
        </div>
        <Link href="/backoffice/jornadas/nueva" className="btn-primary">
          + Nueva jornada
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Jornadas" value={resumen.jornadas} />
        <StatCard label="Borradores" value={resumen.borradores} />
        <StatCard label="Binomios activos" value={resumen.binomios} />
        <StatCard label="Clasificaciones por revisar" value={resumen.clasificacionesPendientes} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Jornadas</h2>
        {jornadas.length === 0 ? (
          <p className="text-sm text-black/50">No hay jornadas todavía en esta temporada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Jornada</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Club</th>
                <th className="py-2 pr-4">Competiciones</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map((j) => (
                <tr key={j.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/jornadas/${j.id}`} className="font-medium hover:underline">
                      {j.nombre}
                    </Link>
                    {!j.configurada ? (
                      <span className="chip ml-2 bg-black/5 text-black/50 border-black/10">Sin configurar</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4">
                    {j.configurada ? new Date(j.fecha).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="py-2 pr-4">{j.club?.nombre ?? "—"}</td>
                  <td className="py-2 pr-4">{j._count.competiciones}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`chip ${
                        j.estado === "PUBLICADA"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-black/5 text-black/60 border-black/10"
                      }`}
                    >
                      {j.estado === "PUBLICADA" ? "Publicada" : "Borrador"}
                    </span>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-black/50">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
