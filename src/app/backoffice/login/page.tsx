import { loginAction } from "@/app/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams?.next ?? "/backoffice/dashboard";
  const error = searchParams?.error;

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <p className="text-white/50 text-xs uppercase tracking-widest mb-1">ADACV</p>
        <h1 className="text-white text-2xl font-semibold">Acceso secretaría</h1>
      </div>
      <div className="card bg-white p-6">
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
