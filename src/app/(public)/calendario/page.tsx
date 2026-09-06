import Link from "next/link";
import { getTemporadaActiva, getJornadasPublicadas } from "@/lib/data/public";

export default async function CalendarioPage() {
  const temporada = await getTemporadaActiva();
  const jornadas = temporada ? await getJornadasPublicadas(temporada.id) : [];
  const hoy = new Date();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-2">Calendario</h1>
      <p className="text-black/60 mb-8">{temporada ? `Temporada ${temporada.nombre}` : "Sin temporada activa"}</p>

      {jornadas.length === 0 ? (
        <p className="text-black/50">Todavía no hay jornadas publicadas para esta temporada.</p>
      ) : (
        <div className="space-y-3">
          {jornadas.map((j) => {
            const pasada = new Date(j.fecha) < hoy;
            return (
              <Link
                key={j.id}
                href={`/jornadas/${j.id}`}
                className={`card p-5 flex items-center justify-between block hover:shadow-md transition-shadow ${
                  pasada ? "opacity-70" : ""
                }`}
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-black/40">
                    {new Date(j.fecha).toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <h2 className="font-semibold text-lg">{j.nombre}</h2>
                  <p className="text-sm text-black/60">
                    {j.lugar ?? "—"}
                    {j.club ? ` · ${j.club.nombre}` : ""}
                  </p>
                </div>
                <span className={`chip ${pasada ? "bg-black/5 text-black/50" : "bg-brand-blue/10 text-brand-blue"}`}>
                  {pasada ? "Celebrada" : "Próxima"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
