import Link from "next/link";
import { getTemporadaActivaOFallback, getClasificacionesTemporada } from "@/lib/data/backoffice";
import { asegurarClasificacionesTemporadaAction, recalcularClasificacionAction, marcarRevisadaAction, publicarClasificacionAction, bloquearClasificacionAction, desbloquearClasificacionAction } from "@/app/actions/clasificaciones";
import { ETIQUETA_NIVEL, CATEGORIAS_TALLA } from "@/lib/constants";

const ETIQUETA_ESTADO: Record<string, string> = {
  PENDIENTE: "Pendiente de revisión",
  REVISADA: "Revisada",
  PUBLICADA: "Publicada",
  BLOQUEADA: "Bloqueada",
};

const ESTILO_ESTADO: Record<string, string> = {
  PENDIENTE: "bg-black/5 text-black/60 border-black/10",
  REVISADA: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  PUBLICADA: "bg-success/10 text-success border-success/20",
  BLOQUEADA: "bg-danger/10 text-danger border-danger/20",
};

const ETIQUETA_CATEGORIA: Record<string, string> = Object.fromEntries(
  CATEGORIAS_TALLA.map((c) => [c.value, c.label])
);

export default async function ClasificacionesPage() {
  const temporada = await getTemporadaActivaOFallback();
  if (!temporada) {
    return (
      <div className="card p-6">
        <p>Todavía no hay ninguna temporada creada.</p>
      </div>
    );
  }

  await asegurarClasificacionesTemporadaAction(temporada.id);
  const clasificaciones = await getClasificacionesTemporada(temporada.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-black/50">Temporada activa</p>
        <h1 className="text-2xl font-semibold">Clasificaciones — {temporada.nombre}</h1>
      </div>

      <div className="card p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-4">Nivel</th>
              <th className="py-2 pr-4">Categoría</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Actualizada</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody>
            {clasificaciones.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <td className="py-3 pr-4">{ETIQUETA_NIVEL[c.nivel] ?? c.nivel}</td>
                <td className="py-3 pr-4">{ETIQUETA_CATEGORIA[c.categoria] ?? c.categoria}</td>
                <td className="py-3 pr-4">
                  <span className={`chip ${ESTILO_ESTADO[c.estado]}`}>{ETIQUETA_ESTADO[c.estado]}</span>
                </td>
                <td className="py-3 pr-4 text-black/50">
                  {new Date(c.actualizadaEn).toLocaleDateString("es-ES")}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Link href={`/backoffice/clasificaciones/${c.id}`} className="btn-ghost text-sm px-2 py-1">
                      Ver
                    </Link>
                    {c.estado !== "BLOQUEADA" ? (
                      <form action={recalcularClasificacionAction}>
                        <input type="hidden" name="clasificacionId" value={c.id} />
                        <button type="submit" className="btn-secondary text-sm px-2 py-1">
                          Recalcular
                        </button>
                      </form>
                    ) : null}
                    {c.estado === "PENDIENTE" ? (
                      <form action={marcarRevisadaAction}>
                        <input type="hidden" name="clasificacionId" value={c.id} />
                        <button type="submit" className="btn-secondary text-sm px-2 py-1">
                          Marcar revisada
                        </button>
                      </form>
                    ) : null}
                    {c.estado === "REVISADA" ? (
                      <form action={publicarClasificacionAction}>
                        <input type="hidden" name="clasificacionId" value={c.id} />
                        <button type="submit" className="btn-primary text-sm px-2 py-1">
                          Publicar
                        </button>
                      </form>
                    ) : null}
                    {c.estado === "BLOQUEADA" ? (
                      <form action={desbloquearClasificacionAction}>
                        <input type="hidden" name="clasificacionId" value={c.id} />
                        <button type="submit" className="btn-secondary text-sm px-2 py-1">
                          Desbloquear
                        </button>
                      </form>
                    ) : (
                      <form action={bloquearClasificacionAction}>
                        <input type="hidden" name="clasificacionId" value={c.id} />
                        <button type="submit" className="text-danger text-sm px-2 py-1 border border-danger/30 rounded-xl hover:bg-danger/5">
                          Bloquear
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
