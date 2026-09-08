import Link from "next/link";
import { getGuiasTodas, getPerrosTodos, getClubesTodos } from "@/lib/data/backoffice";
import { crearBinomioAction } from "@/app/actions/entidades";

export default async function NuevoBinomioPage() {
  const [guias, perros, clubes] = await Promise.all([
    getGuiasTodas(),
    getPerrosTodos(),
    getClubesTodos(),
  ]);

  if (guias.length === 0 || perros.length === 0) {
    return (
      <div className="card p-6 max-w-xl">
        <h1 className="text-2xl font-semibold mb-2">Nuevo binomio</h1>
        <p className="text-sm text-black/60 mb-4">
          Necesitas al menos un guía y un perro creados antes de poder formar un binomio.
        </p>
        <div className="flex gap-3">
          {guias.length === 0 ? (
            <Link href="/backoffice/guias/nueva" className="btn-primary">
              Crear guía
            </Link>
          ) : null}
          {perros.length === 0 ? (
            <Link href="/backoffice/perros/nuevo" className="btn-primary">
              Crear perro
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Nuevo binomio</h1>

      <form action={crearBinomioAction} className="card p-6 space-y-4">
        <Field label="Guía" required>
          <select name="guiaId" required className="input">
            <option value="">— Selecciona —</option>
            {guias.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} {g.apellidos}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Perro" required>
          <select name="perroId" required className="input">
            <option value="">— Selecciona —</option>
            {perros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Club">
          <select name="clubId" className="input">
            <option value="">— Sin especificar —</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className="btn-primary w-full">
          Crear binomio
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">
        {label} {required ? <span className="text-brand-red">*</span> : null}
      </span>
      {children}
    </label>
  );
}
