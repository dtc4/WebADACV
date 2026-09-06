import Link from "next/link";
import { getGalerias } from "@/lib/data/public";

export default async function GaleriasPage() {
  const galerias = await getGalerias();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-8">Galería</h1>

      {galerias.length === 0 ? (
        <p className="text-black/50">Todavía no hay galerías publicadas.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {galerias.map((g) => (
            <Link key={g.id} href={`/galerias/${g.id}`} className="card overflow-hidden block hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] bg-black/5 flex items-center justify-center text-black/30 text-sm">
                {g.fotos[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.fotos[0].url} alt={g.titulo} className="w-full h-full object-cover" />
                ) : (
                  "Sin fotos"
                )}
              </div>
              <div className="p-3">
                <h2 className="font-medium text-sm">{g.titulo}</h2>
                <p className="text-xs text-black/50">
                  {new Date(g.fecha).toLocaleDateString("es-ES")} · {g._count.fotos} fotos
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
