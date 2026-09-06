import { getTemporadaActivaOFallback } from "@/lib/data/backoffice";
import { getClubesActivos, getJueces } from "@/lib/data/public";
import { crearJornadaAction } from "@/app/actions/jornadas";

export default async function NuevaJornadaPage() {
  const [temporada, clubes, jueces] = await Promise.all([
    getTemporadaActivaOFallback(),
    getClubesActivos(),
    getJueces(),
  ]);

  if (!temporada) {
    return (
      <div className="card p-6">
        <p>Necesitas crear una temporada antes de poder añadir una jornada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-1">Nueva jornada</h1>
      <p className="text-sm text-black/50 mb-6">Temporada {temporada.nombre}</p>

      <form action={crearJornadaAction} className="card p-6 space-y-4">
        <input type="hidden" name="temporadaId" value={temporada.id} />

        <Field label="Nombre de la jornada" required>
          <input name="nombre" required placeholder="Ej. 3ª Jornada Nivel II/III" className="input" />
        </Field>

        <Field label="Fecha" required>
          <input name="fecha" type="date" required className="input" />
        </Field>

        <Field label="Lugar">
          <input name="lugar" placeholder="Ej. Polideportivo Municipal, Torrent" className="input" />
        </Field>

        <Field label="Club organizador">
          <select name="clubId" className="input">
            <option value="">— Sin especificar —</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Juez principal">
          <select name="juezId" className="input">
            <option value="">— Sin especificar —</option>
            {jueces.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Descripción">
          <textarea name="descripcion" rows={3} className="input" />
        </Field>

        <button type="submit" className="btn-primary w-full">
          Crear jornada y continuar
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
