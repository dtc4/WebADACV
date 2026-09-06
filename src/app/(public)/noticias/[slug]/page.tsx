import { notFound } from "next/navigation";
import Link from "next/link";
import { getNoticiaPorSlug } from "@/lib/data/public";

export default async function NoticiaPage({ params }: { params: { slug: string } }) {
  const noticia = await getNoticiaPorSlug(params.slug);
  if (!noticia) notFound();

  return (
    <article className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/noticias" className="text-sm text-black/50 hover:underline">
        ← Noticias
      </Link>
      <p className="text-xs text-black/40 mt-4 mb-1">
        {new Date(noticia.publicadoEn).toLocaleDateString("es-ES")}
        {noticia.autor ? ` · ${noticia.autor}` : ""}
      </p>
      <h1 className="font-display text-4xl mb-6">{noticia.titulo}</h1>
      <div className="whitespace-pre-wrap leading-relaxed text-black/80">{noticia.contenido}</div>
    </article>
  );
}
