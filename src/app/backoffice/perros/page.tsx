import Link from "next/link";
import { getPerrosTodos } from "@/lib/data/backoffice";
import { ETIQUETA_TALLA_CORTA, ETIQUETA_NIVEL } from "@/lib/constants";

export default async function PerrosPage() {
  const perros = await getPerrosTodos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Perros</h1>
        <Link href="/backoffice/perros/nuevo" className="btn-primary">
          + Nuevo perro
        </Link>
      </div>

      {perros.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">Todavía no hay ningún perro creado.</p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Raza</th>
                <th className="py-2 pr-4">Talla</th>
                <th className="py-2 pr-4">Nivel</th>
                <th className="py-2 pr-4">Binomios</th>
              </tr>
            </thead>
            <tbody>
              {perros.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/perros/${p.id}/editar`} className="font-medium hover:underline">
                      {p.nombre}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{p.raza ?? "—"}</td>
                  <td className="py-2 pr-4">{ETIQUETA_TALLA_CORTA[p.talla] ?? p.talla}</td>
                  <td className="py-2 pr-4">
                    {p.nivel ? ETIQUETA_NIVEL[p.nivel] ?? p.nivel : <span className="text-black/40">Sin asignar</span>}
                  </td>
                  <td className="py-2 pr-4">{p._count.binomios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
