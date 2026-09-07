import { crearTemporadaAction } from "@/app/actions/temporadas";

export default function NuevaTemporadaPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Nueva temporada</h1>
      <p className="text-sm text-black/50 mb-6">
        Decide cuántas jornadas tendrá la temporada: se crearán automáticamente esa cantidad de
        jornadas vacías (Jornada 1, Jornada 2...) para que luego solo tengas que elegir una desde
        &quot;Nueva jornada&quot; y rellenar dónde y cuándo se celebra.
      </p>

      <form action={crearTemporadaAction} className="card p-6 space-y-4">
        <Field label="Nombre de la temporada" required>
          <input name="nombre" required placeholder="Ej. 2026/2027" className="input" />
        </Field>

        <Field label="Fecha de la primera prueba" required>
          <input name="fechaInicio" type="date" required className="input" />
        </Field>

        <Field label="Fecha de la última prueba" required>
          <input name="fechaFin" type="date" required className="input" />
        </Field>

        <Field label="Número de jornadas" required>
          <input
            name="numeroJornadas"
            type="number"
            min={1}
            max={30}
            defaultValue={9}
            required
            className="input"
          />
        </Field>

        <label className="flex items-center gap-2">
          <input name="marcarActiva" type="checkbox" className="h-4 w-4" />
          <span className="text-sm">
            Marcar como temporada activa (la que se muestra en la web pública)
          </span>
        </label>

        <button type="submit" className="btn-primary w-full">
          Crear temporada
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
