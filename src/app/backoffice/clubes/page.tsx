import Link from "next/link";
import { getClubesTodos } from "@/lib/data/backoffice";

export default async function ClubesPage() {
  const clubes = await getClubesTodos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clubes</h1>
        <Link href="/backoffice/clubes/nuevo" className="btn-primary">
          + Nuevo club
        </Link>
      </div>

      {clubes.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">Todavía no hay ningún club creado.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Población</th>
                <th className="py-2 pr-4">Guías</th>
                <th className="py-2 pr-4">Binomios</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {clubes.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/clubes/${c.id}/editar`} className="font-medium hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {c.poblacion ?? "—"}
                    {c.provincia ? ` (${c.provincia})` : ""}
                  </td>
                  <td className="py-2 pr-4">{c._count.guias}</td>
                  <td className="py-2 pr-4">{c._count.binomios}</td>
                  <td className="py-2 pr-4">
                    {c.activo ? (
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
