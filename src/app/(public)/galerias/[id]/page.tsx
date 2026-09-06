import { notFound } from "next/navigation";
import Link from "next/link";
import { getGaleriaConFotos } from "@/lib/data/public";

export default async function GaleriaDetallePage({ params }: { params: { id: string } }) {
  const galeria = await getGaleriaConFotos(params.id);
  if (!galeria) notFound();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Link href="/galerias" className="text-sm text-black/50 hover:underline">
        ← Galería
      </Link>
      <h1 className="font-display text-4xl mt-2 mb-1">{galeria.titulo}</h1>
      <p className="text-black/60 mb-8">
        {new Date(galeria.fecha).toLocaleDateString("es-ES")}
        {galeria.jornada ? (
          <>
            {" · "}
            <Link href={`/jornadas/${galeria.jornada.id}`} className="underline">
              {galeria.jornada.nombre}
            </Link>
          </>
        ) : null}
      </p>

      {galeria.fotos.length === 0 ? (
        <p className="text-black/50">Esta galería todavía no tiene fotos.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galeria.fotos.map((f) => (
            <figure key={f.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.caption ?? galeria.titulo} className="w-full aspect-[4/3] object-cover" />
              {f.caption ? <figcaption className="p-2 text-xs text-black/60">{f.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
