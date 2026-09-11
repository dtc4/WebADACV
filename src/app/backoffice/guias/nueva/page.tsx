import { getClubesTodos } from "@/lib/data/backoffice";
import { crearGuiaAction } from "@/app/actions/entidades";

export default async function NuevaGuiaPage() {
  const clubes = await getClubesTodos();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Nuevo guía</h1>

      <form action={crearGuiaAction} className="card p-6 space-y-4">
        <Field label="Nombre" required>
          <input name="nombre" required className="input" />
        </Field>

        <Field label="Apellidos" required>
          <input name="apellidos" required className="input" />
        </Field>

        <Field label="Licencia">
          <input name="licencia" className="input" />
        </Field>

        <Field label="Email (opcional)">
          <input name="email" type="email" className="input" />
        </Field>

        <Field label="Teléfono (opcional)">
          <input name="telefono" type="tel" className="input" />
        </Field>

        <Field label="DNI/NIE/Pasaporte (opcional)">
          <input name="dni" className="input" />
        </Field>

        <Field label="Fecha de nacimiento (opcional)">
          <input name="fechaNacimiento" type="date" className="input" />
        </Field>

        <Field label="Domicilio (opcional)">
          <input name="domicilio" className="input" />
        </Field>

        <Field label="Población (opcional)">
          <input name="poblacion" className="input" />
        </Field>

        <Field label="Provincia (opcional)">
          <input name="provincia" className="input" />
        </Field>

        <Field label="Código postal (opcional)">
          <input name="codigoPostal" className="input" />
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
          Crear guía
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
