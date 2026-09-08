import { notFound } from "next/navigation";
import { getGuiaPorId, getClubesTodos } from "@/lib/data/backoffice";
import { actualizarGuiaAction, eliminarGuiaAction } from "@/app/actions/entidades";

export default async function EditarGuiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [guia, clubes] = await Promise.all([getGuiaPorId(id), getClubesTodos()]);
  if (!guia) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar guía</h1>

      <form action={actualizarGuiaAction} className="card p-6 space-y-4">
        <input type="hidden" name="guiaId" value={guia.id} />

        <Field label="Nombre" required>
          <input name="nombre" defaultValue={guia.nombre} required className="input" />
        </Field>

        <Field label="Apellidos" required>
          <input name="apellidos" defaultValue={guia.apellidos} required className="input" />
        </Field>

        <Field label="Licencia">
          <input name="licencia" defaultValue={guia.licencia ?? ""} className="input" />
        </Field>

        <Field label="Club">
          <select name="clubId" defaultValue={guia.clubId ?? ""} className="input">
            <option value="">— Sin especificar —</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar guía</h2>
        <p className="text-sm text-black/60 mb-4">
          Solo se puede borrar si no tiene ningún binomio asociado.
        </p>
        <form action={eliminarGuiaAction}>
          <input type="hidden" name="guiaId" value={guia.id} />
          <button type="submit" className="btn-danger">
            Borrar guía
          </button>
        </form>
      </div>
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
