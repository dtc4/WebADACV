import { notFound } from "next/navigation";
import { getPerroPorId } from "@/lib/data/backoffice";
import { actualizarPerroAction, eliminarPerroAction } from "@/app/actions/entidades";
import { SEXOS_PERRO } from "@/lib/constants";
import { CamposTallaNivel } from "../../campos-talla-nivel";

export default async function EditarPerroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perro = await getPerroPorId(id);
  if (!perro) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar perro</h1>

      <form action={actualizarPerroAction} className="card p-6 space-y-4">
        <input type="hidden" name="perroId" value={perro.id} />

        <Field label="Nombre" required>
          <input name="nombre" defaultValue={perro.nombre} required className="input" />
        </Field>

        <Field label="Raza">
          <input name="raza" defaultValue={perro.raza ?? ""} className="input" />
        </Field>

        <CamposTallaNivel defaultTalla={perro.talla} defaultNivel={perro.nivel} />

        <Field label="Altura a la cruz (cm)">
          <input name="tallaCm" type="number" step="0.1" defaultValue={perro.tallaCm ?? ""} className="input" />
        </Field>

        <Field label="Sexo (opcional)">
          <select name="sexo" defaultValue={perro.sexo ?? ""} className="input">
            <option value="">— Sin especificar —</option>
            {SEXOS_PERRO.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Microchip (opcional)">
          <input name="microchip" defaultValue={perro.microchip ?? ""} className="input" />
        </Field>

        <Field label="Fecha de nacimiento">
          <input
            name="fechaNacimiento"
            type="date"
            defaultValue={perro.fechaNacimiento ? new Date(perro.fechaNacimiento).toISOString().slice(0, 10) : ""}
            className="input"
          />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar perro</h2>
        <p className="text-sm text-black/60 mb-4">
          Solo se puede borrar si no tiene ningún binomio asociado.
        </p>
        <form action={eliminarPerroAction}>
          <input type="hidden" name="perroId" value={perro.id} />
          <button type="submit" className="btn-danger">
            Borrar perro
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
