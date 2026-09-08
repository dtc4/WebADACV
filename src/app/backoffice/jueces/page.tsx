import Link from "next/link";
import { getJuecesTodos } from "@/lib/data/backoffice";

export default async function JuecesPage() {
  const jueces = await getJuecesTodos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jueces</h1>
        <Link href="/backoffice/jueces/nuevo" className="btn-primary">
          + Nuevo juez
        </Link>
      </div>

      {jueces.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">Todavía no hay ningún juez creado.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Licencia</th>
                <th className="py-2 pr-4">Jornadas dirigidas</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {jueces.map((j) => (
                <tr key={j.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/jueces/${j.id}/editar`} className="font-medium hover:underline">
                      {j.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{j.licencia ?? "—"}</td>
                  <td className="py-2 pr-4">{j._count.jornadas}</td>
                  <td className="py-2 pr-4">
                    {j.activo ? (
                      <span className="chip bg-success/10 text-success border-success/20">Activo</span>
                    ) : (
                      <span className="chip bg-black/5 text-black/60 border-black/10">Inactivo</span>
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
