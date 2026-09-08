import { crearClubAction } from "@/app/actions/entidades";

export default function NuevoClubPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Nuevo club</h1>

      <form action={crearClubAction} className="card p-6 space-y-4">
        <Field label="Nombre" required>
          <input name="nombre" required placeholder="Ej. Club Agility Torrent" className="input" />
        </Field>

        <Field label="Población">
          <input name="poblacion" className="input" />
        </Field>

        <Field label="Provincia">
          <input name="provincia" className="input" />
        </Field>

        <Field label="Web">
          <input name="web" type="url" placeholder="https://..." className="input" />
        </Field>

        <Field label="URL del logo">
          <input name="logoUrl" type="url" placeholder="https://..." className="input" />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Crear club
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
