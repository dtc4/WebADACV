import Link from "next/link";
import { getGuiasTodas } from "@/lib/data/backoffice";

export default async function GuiasPage() {
  const guias = await getGuiasTodas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Guías</h1>
        <Link href="/backoffice/guias/nueva" className="btn-primary">
          + Nuevo guía
        </Link>
      </div>

      {guias.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">Todavía no hay ningún guía creado.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Licencia</th>
                <th className="py-2 pr-4">Club</th>
                <th className="py-2 pr-4">Binomios</th>
              </tr>
            </thead>
            <tbody>
              {guias.map((g) => (
                <tr key={g.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/guias/${g.id}/editar`} className="font-medium hover:underline">
                      {g.nombre} {g.apellidos}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{g.licencia ?? "—"}</td>
                  <td className="py-2 pr-4">{g.club?.nombre ?? "—"}</td>
                  <td className="py-2 pr-4">{g._count.binomios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
