import Link from "next/link";
import { getBinomiosTodos } from "@/lib/data/backoffice";

export default async function BinomiosPage() {
  const binomios = await getBinomiosTodos();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Binomios</h1>
        <Link href="/backoffice/binomios/nuevo" className="btn-primary">
          + Nuevo binomio
        </Link>
      </div>

      {binomios.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-black/60">
            Todavía no hay ningún binomio creado. Primero necesitas al menos un guía y un perro.
          </p>
        </div>
      ) : (
        <div className="card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Guía</th>
                <th className="py-2 pr-4">Perro</th>
                <th className="py-2 pr-4">Club</th>
                <th className="py-2 pr-4">Resultados</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {binomios.map((b) => (
                <tr key={b.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/backoffice/binomios/${b.id}/editar`} className="font-medium hover:underline">
                      {b.guia.nombre} {b.guia.apellidos}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{b.perro.nombre}</td>
                  <td className="py-2 pr-4">{b.club?.nombre ?? "—"}</td>
                  <td className="py-2 pr-4">{b._count.resultados}</td>
                  <td className="py-2 pr-4">
                    {b.activo ? (
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
