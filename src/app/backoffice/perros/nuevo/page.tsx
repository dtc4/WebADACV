import { crearPerroAction } from "@/app/actions/entidades";
import { SEXOS_PERRO } from "@/lib/constants";
import { CamposTallaNivel } from "../campos-talla-nivel";

export default function NuevoPerroPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Nuevo perro</h1>

      <form action={crearPerroAction} className="card p-6 space-y-4">
        <Field label="Nombre" required>
          <input name="nombre" required className="input" />
        </Field>

        <Field label="Raza">
          <input name="raza" className="input" />
        </Field>

        <CamposTallaNivel />

        <Field label="Altura a la cruz (cm)">
          <input name="tallaCm" type="number" step="0.1" className="input" />
        </Field>

        <Field label="Sexo (opcional)">
          <select name="sexo" className="input">
            <option value="">— Sin especificar —</option>
            {SEXOS_PERRO.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Microchip (opcional)">
          <input name="microchip" className="input" />
        </Field>

        <Field label="Fecha de nacimiento">
          <input name="fechaNacimiento" type="date" className="input" />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Crear perro
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
