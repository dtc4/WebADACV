import { notFound } from "next/navigation";
import { getTemporadaPorId } from "@/lib/data/backoffice";
import { actualizarTemporadaAction } from "@/app/actions/temporadas";

export default async function EditarTemporadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const temporada = await getTemporadaPorId(id);
  if (!temporada) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Editar temporada</h1>
      <p className="text-sm text-black/50 mb-6">
        El número de jornadas no se edita aquí: añade o borra jornadas sueltas desde la ficha de
        la temporada.
      </p>

      <form action={actualizarTemporadaAction} className="card p-6 space-y-4">
        <input type="hidden" name="temporadaId" value={temporada.id} />

        <Field label="Nombre de la temporada" required>
          <input name="nombre" defaultValue={temporada.nombre} required className="input" />
        </Field>

        <Field label="Fecha de la primera prueba" required>
          <input
            name="fechaInicio"
            type="date"
            defaultValue={new Date(temporada.fechaInicio).toISOString().slice(0, 10)}
            required
            className="input"
          />
        </Field>

        <Field label="Fecha de la última prueba" required>
          <input
            name="fechaFin"
            type="date"
            defaultValue={new Date(temporada.fechaFin).toISOString().slice(0, 10)}
            required
            className="input"
          />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
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
