import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: { default: "Backoffice", template: "%s · Backoffice ADACV" },
};

const NAV = [
  { href: "/backoffice/dashboard", label: "Panel" },
  { href: "/backoffice/jornadas/nueva", label: "Nueva jornada" },
  { href: "/backoffice/clasificaciones", label: "Clasificaciones" },
];

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // La página de login no tiene sesión todavía: se muestra sin el chrome
  // del backoffice (sidebar/topbar), centrada en la pantalla.
  if (!session) {
    return (
      <div className="min-h-screen bg-brand-ink flex items-center justify-center p-6 font-body">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-body text-brand-ink flex">
      <aside className="w-64 shrink-0 bg-brand-ink text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-xs uppercase tracking-widest text-white/50">ADACV</p>
          <p className="font-semibold">Backoffice</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10 text-sm">
          <p className="px-3 text-white/60">{session.nombre}</p>
          <p className="px-3 text-xs text-white/40 mb-2">{session.rol}</p>
          <form action={logoutAction}>
            <button type="submit" className="w-full text-left rounded-lg px-3 py-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
