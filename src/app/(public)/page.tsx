import Link from "next/link";
import { getTemporadaActiva, getProximaJornada, getNoticias } from "@/lib/data/public";

export default async function HomePage() {
  const temporada = await getTemporadaActiva();
  const proxima = temporada ? await getProximaJornada(temporada.id) : null;
  const noticias = await getNoticias(3);

  return (
    <div>
      <section className="bg-brand-ink text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-brand-yellow text-sm font-semibold uppercase tracking-widest mb-3">
            {temporada ? `Temporada ${temporada.nombre}` : "Agility"}
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-tight mb-4">
            Agility en la <span className="text-brand-red">Comunidad Valenciana</span>
          </h1>
          <p className="text-white/70 max-w-xl mb-8">
            Calendario, resultados y clasificaciones oficiales de las competiciones de ADACV.
          </p>
          <div className="flex gap-3">
            <Link href="/calendario" className="btn-primary">
              Ver calendario
            </Link>
            <Link href="/clasificaciones" className="btn bg-white/10 text-white hover:bg-white/20">
              Ver clasificaciones
            </Link>
          </div>
        </div>
      </section>

      {proxima ? (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-xs uppercase tracking-widest text-black/40 mb-3">Próxima jornada</p>
          <Link href={`/jornadas/${proxima.id}`} className="card p-6 flex items-center justify-between hover:shadow-md transition-shadow block">
            <div>
              <h2 className="text-xl font-semibold">{proxima.nombre}</h2>
              <p className="text-black/60 text-sm mt-1">
                {new Date(proxima.fecha).toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {proxima.lugar ? ` · ${proxima.lugar}` : ""}
                {proxima.club ? ` · ${proxima.club.nombre}` : ""}
              </p>
            </div>
            <span className="btn-secondary">Ver ficha →</span>
          </Link>
        </section>
      ) : null}

      {noticias.length > 0 ? (
        <section className="max-w-6xl mx-auto px-6 py-12">
          <p className="text-xs uppercase tracking-widest text-black/40 mb-4">Últimas noticias</p>
          <div className="grid md:grid-cols-3 gap-6">
            {noticias.map((n) => (
              <Link key={n.id} href={`/noticias/${n.slug}`} className="card p-5 hover:shadow-md transition-shadow block">
                <p className="text-xs text-black/40 mb-2">
                  {new Date(n.publicadoEn).toLocaleDateString("es-ES")}
                </p>
                <h3 className="font-semibold mb-2">{n.titulo}</h3>
                <p className="text-sm text-black/60 line-clamp-3">{n.resumen}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
