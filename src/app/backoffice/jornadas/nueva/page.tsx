import Link from "next/link";
import {
  getTemporadas,
  getTemporadaActivaOFallback,
  getJornadasTemporada,
} from "@/lib/data/backoffice";
import { agregarJornadaExtraAction } from "@/app/actions/temporadas";

export default async function NuevaJornadaPage({
  searchParams,
}: {
  searchParams: Promise<{ temporadaId?: string }>;
}) {
  const [{ temporadaId: temporadaIdParam }, temporadas, temporadaPorDefecto] = await Promise.all([
    searchParams,
    getTemporadas(),
    getTemporadaActivaOFallback(),
  ]);

  if (temporadas.length === 0) {
    return (
      <div className="card p-6 max-w-xl">
        <h1 className="text-2xl font-semibold mb-2">Nueva jornada</h1>
        <p className="text-sm text-black/60 mb-4">
          Todavía no hay ninguna temporada creada. Primero hay que crear la temporada (con el
          número de jornadas previstas) y luego se elige aquí cuál de ellas rellenar.
        </p>
        <Link href="/backoffice/temporadas/nueva" className="btn-primary">
          Crear temporada
        </Link>
      </div>
    );
  }

  const temporadaId = temporadaIdParam || temporadaPorDefecto?.id || temporadas[0].id;
  const temporada = temporadas.find((t) => t.id === temporadaId) ?? temporadas[0];
  const jornadas = await getJornadasTemporada(temporada.id);

  const pendientes = jornadas.filter((j) => !j.configurada);
  const configuradas = jornadas.filter((j) => j.configurada);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Nueva jornada</h1>
        <p className="text-sm text-black/50">
          Elige la temporada y después la jornada que quieres rellenar.
        </p>
      </div>

      {temporadas.length > 1 ? (
        <form className="flex items-end gap-3" method="get">
          <label className="block">
            <span className="block text-sm font-medium mb-1">Temporada</span>
            <select name="temporadaId" defaultValue={temporada.id} className="input">
              {temporadas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.activa ? " (activa)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-secondary">
            Cambiar
          </button>
        </form>
      ) : null}

      <div className="card p-5">
        <h2 className="font-semibold mb-4">
          Jornadas pendientes de configurar — {temporada.nombre}
        </h2>
        {pendientes.length === 0 ? (
          <p className="text-sm text-black/50 mb-4">
            Todas las jornadas previstas de esta temporada ya están configuradas.
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
            {pendientes.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/backoffice/jornadas/${j.id}`}
                  className="block card p-4 text-center hover:shadow-md transition-shadow border-black/10"
                >
                  <span className="font-semibold">{j.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={agregarJornadaExtraAction} className="pt-3 border-t border-black/10 mt-3">
          <input type="hidden" name="temporadaId" value={temporada.id} />
          <button type="submit" className="text-sm text-brand-blue hover:underline">
            + Añadir una jornada adicional a esta temporada (fuera del plan original)
          </button>
        </form>
      </div>

      {configuradas.length > 0 ? (
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Jornadas ya configuradas</h2>
          <ul className="space-y-2">
            {configuradas.map((j) => (
              <li key={j.id} className="flex items-center justify-between text-sm">
                <Link href={`/backoffice/jornadas/${j.id}`} className="hover:underline">
                  {j.nombre} — {new Date(j.fecha).toLocaleDateString("es-ES")}
                </Link>
                <span
                  className={`chip ${
                    j.estado === "PUBLICADA"
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-black/5 text-black/60 border-black/10"
                  }`}
                >
                  {j.estado === "PUBLICADA" ? "Publicada" : "Borrador"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
