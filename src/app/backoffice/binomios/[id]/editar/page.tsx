import { notFound } from "next/navigation";
import { getBinomioPorId, getClubesTodos } from "@/lib/data/backoffice";
import { actualizarBinomioAction, eliminarBinomioAction } from "@/app/actions/entidades";

export default async function EditarBinomioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [binomio, clubes] = await Promise.all([getBinomioPorId(id), getClubesTodos()]);
  if (!binomio) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {binomio.guia.nombre} {binomio.guia.apellidos} · {binomio.perro.nombre}
        </h1>
        <p className="text-sm text-black/50">
          El guía y el perro de un binomio no se pueden cambiar: si te has equivocado, borra este
          binomio (si todavía no tiene resultados) y crea uno nuevo.
        </p>
      </div>

      <form action={actualizarBinomioAction} className="card p-6 space-y-4">
        <input type="hidden" name="binomioId" value={binomio.id} />

        <Field label="Club">
          <select name="clubId" defaultValue={binomio.clubId ?? ""} className="input">
            <option value="">— Sin especificar —</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-center gap-2">
          <input name="activo" type="checkbox" defaultChecked={binomio.activo} className="h-4 w-4" />
          <span className="text-sm">
            Binomio activo (aparece para elegir al introducir resultados de una jornada)
          </span>
        </label>

        <button type="submit" className="btn-primary w-full">
          Guardar cambios
        </button>
      </form>

      <div className="card p-5 border border-danger/20">
        <h2 className="font-semibold text-danger mb-2">Borrar binomio</h2>
        <p className="text-sm text-black/60 mb-4">
          Solo se puede borrar si todavía no tiene resultados ni clasificaciones registrados. Si ya
          compitió alguna vez, desactívalo en vez de borrarlo para conservar su histórico.
        </p>
        <form action={eliminarBinomioAction}>
          <input type="hidden" name="binomioId" value={binomio.id} />
          <button type="submit" className="btn-danger">
            Borrar binomio
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
