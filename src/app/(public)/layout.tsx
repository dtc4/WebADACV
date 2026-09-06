import Link from "next/link";
import { getSponsorsActivos } from "@/lib/data/public";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/calendario", label: "Calendario" },
  { href: "/clasificaciones", label: "Clasificaciones" },
  { href: "/galerias", label: "Galería" },
  { href: "/noticias", label: "Noticias" },
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const sponsors = await getSponsorsActivos();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-black/10 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-wide text-brand-red">
            ADACV
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand-blue transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/backoffice/login" className="text-sm text-black/40 hover:text-black/70">
            Secretaría
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-black/10 mt-16">
        {sponsors.length > 0 ? (
          <div className="max-w-6xl mx-auto px-6 py-8 border-b border-black/5">
            <p className="text-xs uppercase tracking-widest text-black/40 mb-4">Patrocinadores</p>
            <div className="flex flex-wrap items-center gap-8">
              {sponsors.map((s) => (
                <a
                  key={s.id}
                  href={s.url ?? undefined}
                  target={s.url ? "_blank" : undefined}
                  rel={s.url ? "noopener noreferrer" : undefined}
                  className="text-sm text-black/60 hover:text-black"
                >
                  {s.nombre}
                </a>
              ))}
            </div>
          </div>
        ) : null}
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-black/50 flex flex-wrap justify-between gap-4">
          <p>© {new Date().getFullYear()} ADACV — Agrupación Deportiva de Agility de la Comunidad Valenciana</p>
          <Link href="/backoffice/login" className="hover:text-black/70">
            Acceso secretaría
          </Link>
        </div>
      </footer>
    </div>
  );
}
