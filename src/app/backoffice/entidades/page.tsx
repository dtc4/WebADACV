import Link from "next/link";
import { contarEntidades } from "@/lib/data/backoffice";

export default async function EntidadesPage() {
  const resumen = await contarEntidades();

  const secciones = [
    {
      href: "/backoffice/clubes",
      nuevoHref: "/backoffice/clubes/nuevo",
      titulo: "Clubes",
      descripcion: "Clubes de agility que participan en las jornadas.",
      total: resumen.clubes,
    },
    {
      href: "/backoffice/jueces",
      nuevoHref: "/backoffice/jueces/nuevo",
      titulo: "Jueces",
      descripcion: "Jueces que dirigen jornadas y competiciones.",
      total: resumen.jueces,
    },
    {
      href: "/backoffice/guias",
      nuevoHref: "/backoffice/guias/nueva",
      titulo: "Guías",
      descripcion: "Personas que compiten con sus perros.",
      total: resumen.guias,
    },
    {
      href: "/backoffice/perros",
      nuevoHref: "/backoffice/perros/nuevo",
      titulo: "Perros",
      descripcion: "Perros inscritos, con su talla oficial.",
      total: resumen.perros,
    },
    {
      href: "/backoffice/binomios",
      nuevoHref: "/backoffice/binomios/nuevo",
      titulo: "Binomios",
      descripcion: "Parejas Guía + Perro que compiten juntas.",
      total: resumen.binomios,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clubes, jueces y binomios</h1>
        <p className="text-sm text-black/50 mt-1">
          Fichas maestras que se usan al configurar jornadas y resultados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {secciones.map((s) => (
          <div key={s.href} className="card p-5 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-semibold">{s.titulo}</h2>
              <span className="chip bg-black/5 text-black/60 border-black/10">{s.total}</span>
            </div>
            <p className="text-sm text-black/50 mb-4 flex-1">{s.descripcion}</p>
            <div className="flex gap-2">
              <Link href={s.href} className="btn-secondary flex-1 text-center">
                Ver listado
              </Link>
              <Link href={s.nuevoHref} className="btn-primary flex-1 text-center">
                + Nuevo
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
