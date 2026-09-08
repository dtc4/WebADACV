import { crearJuezAction } from "@/app/actions/entidades";

export default function NuevoJuezPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Nuevo juez</h1>

      <form action={crearJuezAction} className="card p-6 space-y-4">
        <Field label="Nombre" required>
          <input name="nombre" required className="input" />
        </Field>

        <Field label="Licencia">
          <input name="licencia" className="input" />
        </Field>

        <Field label="URL de la foto">
          <input name="fotoUrl" type="url" placeholder="https://..." className="input" />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Crear juez
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
