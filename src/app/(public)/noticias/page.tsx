import Link from "next/link";
import { getNoticias } from "@/lib/data/public";

export default async function NoticiasPage() {
  const noticias = await getNoticias(50);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="font-display text-4xl mb-8">Noticias</h1>

      {noticias.length === 0 ? (
        <p className="text-black/50">Todavía no hay noticias publicadas.</p>
      ) : (
        <div className="space-y-4">
          {noticias.map((n) => (
            <Link key={n.id} href={`/noticias/${n.slug}`} className="card p-5 block hover:shadow-md transition-shadow">
              <p className="text-xs text-black/40 mb-1">{new Date(n.publicadoEn).toLocaleDateString("es-ES")}</p>
              <h2 className="font-semibold mb-1">{n.titulo}</h2>
              <p className="text-sm text-black/60">{n.resumen}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
