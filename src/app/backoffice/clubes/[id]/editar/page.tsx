import { notFound } from "next/navigation";
import { getClubPorId } from "@/lib/data/backoffice";
import { actualizarClubAction, eliminarClubAction } from "@/app/actions/entidades";

export default async function EditarClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = await getClubPorId(id);
  if (!club) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar club</h1>

      <form action={actualizarClubAction} className="card p-6 space-y-4">
        <input type="hidden" name="clubId" value={club.id} />

        <Field label="Nombre" required>
          <input name="nombre" defaultValue={club.nombre} required className="input" />
        </Field>

        <Field label="Población">
          <input name="poblacion" defaultValue={club.poblacion ?? ""} className="input" />
        </Field>

        <Field label="Provincia">
          <input name="provincia" defaultValue={club.provincia ?? ""} className="input" />
        </Field>

        <Field label="Web">
          <input name="web" type="url" defaultValue={club.web ?? ""} className="input" />
        </Field>

        <Field label="URL del logo">
          <input name="logoUrl" type="url" defaultValue={club.logoUrl ?? ""} className="input" />
        </Field>

        <label className="flex items-center gap-2">
          <input name="activo" type="checkbox" defaultChecked={club.activo} className="h-4 w-4" />
          <span className="text-sm">Club activo (aparece para elegir en jornadas y binomios)</span>
        </label>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar club</h2>
        <p className="text-sm text-black/60 mb-4">
          No borra guías, binomios ni jornadas asociadas: simplemente se quedan sin club.
        </p>
        <form action={eliminarClubAction}>
          <input type="hidden" name="clubId" value={club.id} />
          <button type="submit" className="btn-danger">
            Borrar club
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
