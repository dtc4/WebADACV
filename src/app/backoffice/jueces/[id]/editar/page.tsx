import { notFound } from "next/navigation";
import { getJuezPorId } from "@/lib/data/backoffice";
import { actualizarJuezAction, eliminarJuezAction } from "@/app/actions/entidades";

export default async function EditarJuezPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const juez = await getJuezPorId(id);
  if (!juez) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar juez</h1>

      <form action={actualizarJuezAction} className="card p-6 space-y-4">
        <input type="hidden" name="juezId" value={juez.id} />

        <Field label="Nombre" required>
          <input name="nombre" defaultValue={juez.nombre} required className="input" />
        </Field>

        <Field label="Licencia">
          <input name="licencia" defaultValue={juez.licencia ?? ""} className="input" />
        </Field>

        <Field label="URL de la foto">
          <input name="fotoUrl" type="url" defaultValue={juez.fotoUrl ?? ""} className="input" />
        </Field>

        <label className="flex items-center gap-2">
          <input name="activo" type="checkbox" defaultChecked={juez.activo} className="h-4 w-4" />
          <span className="text-sm">Juez activo (aparece para elegir en jornadas y competiciones)</span>
        </label>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar juez</h2>
        <p className="text-sm text-black/60 mb-4">
          No borra jornadas ni competiciones asociadas: simplemente se quedan sin juez asignado.
        </p>
        <form action={eliminarJuezAction}>
          <input type="hidden" name="juezId" value={juez.id} />
          <button type="submit" className="btn-danger">
            Borrar juez
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
