"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type {
  getJornadaConTodo,
  getBinomiosActivos,
  getInscripcionesJornada,
  getBinomiosNoInscritosEnJornada,
} from "@/lib/data/backoffice";
import type { getClubesActivos, getJueces } from "@/lib/data/public";
import {
  agregarCompeticionAction,
  eliminarCompeticionAction,
  guardarResultadoAction,
  eliminarResultadoAction,
  finalizarMangaAction,
  publicarCompeticionAction,
  despublicarCompeticionAction,
  publicarJornadaAction,
  despublicarJornadaAction,
  actualizarDatosJornadaAction,
  eliminarJornadaAction,
} from "@/app/actions/jornadas";
import { inscribirBinomioAction, desinscribirBinomioAction } from "@/app/actions/inscripciones";
import { realizarSorteoAction, actualizarOrdenSalidaAction } from "@/app/actions/sorteo";
import { MODALIDADES, NIVELES, TALLAS, TALLAS_CON_GRADO, nivelValidoParaTalla, ETIQUETA_MODALIDAD, ETIQUETA_NIVEL, ETIQUETA_TALLA_CORTA, ETIQUETA_CALIFICACION, ESTILO_CALIFICACION } from "@/lib/constants";

type Jornada = NonNullable<Awaited<ReturnType<typeof getJornadaConTodo>>>;
type Competicion = Jornada["competiciones"][number];
type ResultadoFila = Competicion["resultados"][number];
type Binomio = Awaited<ReturnType<typeof getBinomiosActivos>>[number];
type Inscripcion = Awaited<ReturnType<typeof getInscripcionesJornada>>[number];
type BinomioNoInscrito = Awaited<ReturnType<typeof getBinomiosNoInscritosEnJornada>>[number];
type Club = Awaited<ReturnType<typeof getClubesActivos>>[number];
type Juez = Awaited<ReturnType<typeof getJueces>>[number];

const PASOS = ["Datos", "Inscripciones", "Competiciones", "Resultados", "Revisar", "Publicar"] as const;

export function JornadaWizard({
  jornada,
  binomios,
  inscripciones,
  noInscritos,
  clubes,
  jueces,
}: {
  jornada: Jornada;
  binomios: Binomio[];
  inscripciones: Inscripcion[];
  noInscritos: BinomioNoInscrito[];
  clubes: Club[];
  jueces: Juez[];
}) {
  const [paso, setPaso] = useState(1);
  const [maxPaso, setMaxPaso] = useState(1);
  const [revisado, setRevisado] = useState(false);
  // Los huecos de jornada generados al crear la temporada empiezan sin
  // configurar (fecha/lugar todavía son un valor provisional): se abre el
  // formulario de datos directamente para que secretaría los rellene antes
  // de ver nada más del asistente.
  const [editandoDatos, setEditandoDatos] = useState(!jornada.configurada);

  const totalResultados = jornada.competiciones.reduce((acc, c) => acc + c.resultados.length, 0);

  function irAPaso(n: number) {
    if (n === 6 && !revisado) return;
    setPaso(n);
    setMaxPaso((m) => Math.max(m, n));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link href="/backoffice/dashboard" className="text-sm text-black/50 hover:underline">
            ← Panel
          </Link>
          <h1 className="text-2xl font-semibold">{jornada.nombre}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`chip ${
              jornada.estado === "PUBLICADA"
                ? "bg-success/10 text-success border-success/20"
                : "bg-black/5 text-black/60 border-black/10"
            }`}
          >
            {jornada.estado === "PUBLICADA" ? "Publicada" : "Borrador"}
          </span>
          {jornada.estado !== "PUBLICADA" ? (
            <form action={eliminarJornadaAction}>
              <input type="hidden" name="jornadaId" value={jornada.id} />
              <button type="submit" className="text-danger text-sm hover:underline">
                Borrar jornada
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {!jornada.configurada ? (
        <p className="text-sm text-black/60 bg-black/5 border border-black/10 rounded-lg px-4 py-2 mb-4">
          Esta jornada todavía no está configurada: rellena su fecha y lugar reales en el paso 1
          antes de continuar.
        </p>
      ) : null}

      <ol className="flex flex-wrap gap-2 my-6">
        {PASOS.map((label, i) => {
          const n = i + 1;
          const alcanzable = n <= maxPaso || n === maxPaso + 1;
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!alcanzable}
                onClick={() => irAPaso(n)}
                className={`chip border ${
                  paso === n
                    ? "bg-brand-ink text-white border-brand-ink"
                    : alcanzable
                      ? "bg-white text-brand-ink border-black/15 hover:bg-black/5"
                      : "bg-black/5 text-black/30 border-transparent"
                }`}
              >
                {n}. {label}
              </button>
            </li>
          );
        })}
      </ol>

      {paso === 1 ? (
        <PasoDatos
          jornada={jornada}
          clubes={clubes}
          jueces={jueces}
          editando={editandoDatos}
          setEditando={setEditandoDatos}
          onSiguiente={() => irAPaso(2)}
        />
      ) : null}

      {paso === 2 ? (
        <PasoInscripciones
          jornada={jornada}
          inscripciones={inscripciones}
          noInscritos={noInscritos}
          onSiguiente={() => irAPaso(3)}
          onAtras={() => irAPaso(1)}
        />
      ) : null}

      {paso === 3 ? (
        <PasoCompeticiones jornada={jornada} onSiguiente={() => irAPaso(4)} onAtras={() => irAPaso(2)} />
      ) : null}

      {paso === 4 ? (
        <PasoResultados
          jornada={jornada}
          binomios={binomios}
          inscripciones={inscripciones}
          onSiguiente={() => irAPaso(5)}
          onAtras={() => irAPaso(3)}
        />
      ) : null}

      {paso === 5 ? (
        <PasoRevisar
          jornada={jornada}
          revisado={revisado}
          setRevisado={setRevisado}
          onSiguiente={() => irAPaso(6)}
          onAtras={() => irAPaso(4)}
        />
      ) : null}

      {paso === 6 ? (
        <PasoPublicar jornada={jornada} totalResultados={totalResultados} onAtras={() => irAPaso(5)} />
      ) : null}
    </div>
  );
}

// --- Paso 1: Datos -----------------------------------------------------------

function PasoDatos({
  jornada,
  clubes,
  jueces,
  editando,
  setEditando,
  onSiguiente,
}: {
  jornada: Jornada;
  clubes: Club[];
  jueces: Juez[];
  editando: boolean;
  setEditando: (v: boolean) => void;
  onSiguiente: () => void;
}) {
  if (editando) {
    return (
      <form action={actualizarDatosJornadaAction} className="card p-6 space-y-4 max-w-xl">
        <input type="hidden" name="jornadaId" value={jornada.id} />
        <label className="block">
          <span className="block text-sm font-medium mb-1">Nombre</span>
          <input name="nombre" defaultValue={jornada.nombre} required className="input" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Fecha</span>
          <input
            name="fecha"
            type="date"
            defaultValue={new Date(jornada.fecha).toISOString().slice(0, 10)}
            required
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Lugar</span>
          <input name="lugar" defaultValue={jornada.lugar ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Club organizador</span>
          <select name="clubId" defaultValue={jornada.clubId ?? ""} className="input">
            <option value="">— Sin especificar —</option>
            {clubes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Juez principal</span>
          <select name="juezId" defaultValue={jornada.juezId ?? ""} className="input">
            <option value="">— Sin especificar —</option>
            {jueces.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Descripción</span>
          <textarea name="descripcion" defaultValue={jornada.descripcion ?? ""} rows={3} className="input" />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Guardar
          </button>
          {jornada.configurada ? (
            <button type="button" onClick={() => setEditando(false)} className="btn-secondary">
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <div className="card p-6 max-w-xl space-y-3">
      <Dato label="Nombre" valor={jornada.nombre} />
      <Dato label="Fecha" valor={new Date(jornada.fecha).toLocaleDateString("es-ES")} />
      <Dato label="Lugar" valor={jornada.lugar ?? "—"} />
      <Dato label="Club organizador" valor={jornada.club?.nombre ?? "—"} />
      <Dato label="Juez principal" valor={jornada.juez?.nombre ?? "—"} />
      <Dato label="Descripción" valor={jornada.descripcion ?? "—"} />
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => setEditando(true)} className="btn-secondary">
          Editar
        </button>
        <button type="button" onClick={onSiguiente} className="btn-primary">
          Siguiente →
        </button>
      </div>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-black/40">{label}</p>
      <p>{valor}</p>
    </div>
  );
}

// --- Paso 2: Inscripciones ----------------------------------------------------

const SIN_NIVEL = "SIN_NIVEL";

/** Agrupa las inscripciones por nivel (con un grupo aparte para los
 * binomios cuyo perro todavía no tiene nivel asignado en su ficha) y,
 * dentro de cada nivel, por talla — solo para pintar los subtítulos de la
 * lista; el sorteo (src/app/actions/sorteo.ts) usa ese mismo nivel
 * (Perro.nivel) para decidir quién entra en cada manga. */
function agruparPorNivelYTalla(inscripciones: Inscripcion[]) {
  const grupos = new Map<string, Map<string, Inscripcion[]>>();
  for (const inscripcion of inscripciones) {
    const nivelKey = inscripcion.nivel ?? SIN_NIVEL;
    const tallaKey = inscripcion.binomio.perro.talla;
    if (!grupos.has(nivelKey)) grupos.set(nivelKey, new Map());
    const porTalla = grupos.get(nivelKey)!;
    if (!porTalla.has(tallaKey)) porTalla.set(tallaKey, []);
    porTalla.get(tallaKey)!.push(inscripcion);
  }
  return grupos;
}

function PasoInscripciones({
  jornada,
  inscripciones,
  noInscritos,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  inscripciones: Inscripcion[];
  noInscritos: BinomioNoInscrito[];
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  const [binomioSeleccionado, setBinomioSeleccionado] = useState("");
  const [error, setError] = useState<string | null>(null);

  const grupos = agruparPorNivelYTalla(inscripciones);

  async function inscribir() {
    if (!binomioSeleccionado) return;
    setError(null);
    try {
      await inscribirBinomioAction(jornada.id, binomioSeleccionado);
      setBinomioSeleccionado("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido inscribir el binomio.");
    }
  }

  async function quitar(inscripcionId: string) {
    setError(null);
    try {
      await desinscribirBinomioAction(inscripcionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido quitar la inscripción.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Binomios inscritos</h2>
        {inscripciones.length === 0 ? (
          <p className="text-sm text-black/50">Todavía no hay ningún binomio inscrito en esta jornada.</p>
        ) : (
          Array.from(grupos.entries()).map(([nivelKey, porTalla]) => (
            <div key={nivelKey} className="mb-4 last:mb-0">
              <h3 className="font-semibold text-sm mb-2">
                {nivelKey === SIN_NIVEL ? "Sin nivel asignado todavía" : ETIQUETA_NIVEL[nivelKey] ?? nivelKey}
              </h3>
              {Array.from(porTalla.entries()).map(([tallaKey, lista]) => (
                <div key={tallaKey} className="mb-3 last:mb-0 pl-2">
                  <h4 className="text-xs uppercase tracking-wide text-black/40 mb-1">
                    {ETIQUETA_TALLA_CORTA[tallaKey] ?? tallaKey}
                    {nivelKey === SIN_NIVEL && !TALLAS_CON_GRADO.includes(tallaKey)
                      ? " — categoría única, sin grado"
                      : ""}
                  </h4>
                  <ul>
                    {lista.map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center justify-between text-sm py-1 border-b border-black/5 last:border-0"
                      >
                        <span>
                          {i.binomio.guia.nombre} {i.binomio.guia.apellidos} · {i.binomio.perro.nombre}
                          {i.binomio.club ? ` (${i.binomio.club.nombre})` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => quitar(i.id)}
                          className="text-danger text-sm hover:underline"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Añadir inscripción</h2>
        {error ? <p className="text-danger text-sm mb-3">{error}</p> : null}
        {noInscritos.length === 0 ? (
          <p className="text-sm text-black/50">No quedan binomios activos por inscribir.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block flex-1 min-w-[240px]">
              <span className="block text-sm font-medium mb-1">Binomio</span>
              <select
                value={binomioSeleccionado}
                onChange={(e) => setBinomioSeleccionado(e.target.value)}
                className="input"
              >
                <option value="">— Selecciona —</option>
                {noInscritos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.perro.nombre} ({b.guia.nombre} {b.guia.apellidos})
                    {b.club ? ` — ${b.club.nombre}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={inscribir} disabled={!binomioSeleccionado} className="btn-primary">
              Inscribir
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onAtras} className="btn-secondary">
          ← Atrás
        </button>
        <button type="button" onClick={onSiguiente} className="btn-primary">
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// --- Paso 3: Competiciones ---------------------------------------------------

function PasoCompeticiones({
  jornada,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  const [tallaNueva, setTallaNueva] = useState("");
  const tallaTieneGrado = TALLAS_CON_GRADO.includes(tallaNueva);
  // Sin talla elegida todavía se muestran todas las opciones de nivel (para
  // no bloquear antes de tiempo); en cuanto se elige talla, se filtran a
  // las que de verdad tienen sentido para ella (ver nivelValidoParaTalla).
  const opcionesNivelNueva = tallaNueva ? NIVELES.filter((n) => nivelValidoParaTalla(tallaNueva, n.value)) : NIVELES;
  const nivelPorDefectoNueva = tallaNueva && !tallaTieneGrado ? "SIN_GRADO" : "";

  return (
    <div className="space-y-6">
      <p className="text-sm text-black/60 bg-black/5 border border-black/10 rounded-lg px-4 py-2">
        Esto lo suele rellenar quien juzgue la jornada, normalmente la misma semana de la prueba,
        cuando ya conoce la pista y el número de inscritos. No hace falta completarlo antes.
      </p>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Competiciones de esta jornada</h2>
        {jornada.competiciones.length === 0 ? (
          <p className="text-sm text-black/50">Todavía no hay ninguna competición añadida.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-black/50 border-b border-black/10">
                <th className="py-2 pr-4">Modalidad</th>
                <th className="py-2 pr-4">Nivel</th>
                <th className="py-2 pr-4">Talla</th>
                <th className="py-2 pr-4">Manga</th>
                <th className="py-2 pr-4">Resultados</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {jornada.competiciones.map((c) => (
                <tr key={c.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4">{ETIQUETA_MODALIDAD[c.modalidad] ?? c.modalidad}</td>
                  <td className="py-2 pr-4">{ETIQUETA_NIVEL[c.nivel] ?? c.nivel}</td>
                  <td className="py-2 pr-4">{ETIQUETA_TALLA_CORTA[c.talla] ?? c.talla}</td>
                  <td className="py-2 pr-4">{c.manga}</td>
                  <td className="py-2 pr-4">{c.resultados.length}</td>
                  <td className="py-2 pr-4 text-right">
                    <form action={eliminarCompeticionAction}>
                      <input type="hidden" name="competicionId" value={c.id} />
                      <input type="hidden" name="jornadaId" value={jornada.id} />
                      <button type="submit" className="text-danger text-sm hover:underline">
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">Añadir competición</h2>
        <form action={agregarCompeticionAction} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <input type="hidden" name="jornadaId" value={jornada.id} />
          <label className="block">
            <span className="block text-sm font-medium mb-1">Modalidad</span>
            <select name="modalidad" required className="input">
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Talla</span>
            <select
              name="talla"
              required
              className="input"
              value={tallaNueva}
              onChange={(e) => setTallaNueva(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {TALLAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Nivel</span>
            <select key={tallaNueva} name="nivel" required defaultValue={nivelPorDefectoNueva} className="input">
              <option value="">— Selecciona —</option>
              {opcionesNivelNueva.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
            {tallaNueva && !tallaTieneGrado ? (
              <span className="block text-xs text-black/50 mt-1">
                En esta talla no hay grados II/III: se ha marcado «Sin grado» automáticamente.
              </span>
            ) : null}
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Manga</span>
            <input name="manga" type="number" defaultValue={1} min={1} className="input" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Longitud recorrido (m)</span>
            <input name="longitudM" type="number" step="0.1" placeholder="Ej. 160" className="input" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Velocidad (m/s)</span>
            <input name="velocidadMs" type="number" step="0.01" placeholder="Ej. 3.2" className="input" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Parada en mesa (s)</span>
            <input name="tiempoParadaMesaS" type="number" step="0.1" defaultValue={0} className="input" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Factor TRM (1,5–2,0)</span>
            <input
              name="trmFactor"
              type="number"
              step="0.1"
              min={1.5}
              max={2}
              defaultValue={1.5}
              className="input"
            />
          </label>
          <div className="col-span-2 md:col-span-3">
            <button type="submit" className="btn-primary">
              Añadir competición
            </button>
          </div>
        </form>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onAtras} className="btn-secondary">
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onSiguiente}
          disabled={jornada.competiciones.length === 0}
          className="btn-primary"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// --- Paso 4: Resultados -------------------------------------------------------

function PasoResultados({
  jornada,
  binomios,
  inscripciones,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  binomios: Binomio[];
  inscripciones: Inscripcion[];
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  const [competicionActivaId, setCompeticionActivaId] = useState(jornada.competiciones[0]?.id ?? "");
  const [mostrarTodosBinomios, setMostrarTodosBinomios] = useState(false);
  const [mensajeSorteo, setMensajeSorteo] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [mensajePublicacion, setMensajePublicacion] = useState<string | null>(null);
  const competicionActiva = jornada.competiciones.find((c) => c.id === competicionActivaId);

  // El desplegable para añadir un resultado a mano parte de los binomios ya
  // inscritos en la jornada (paso "Inscripciones") con la talla de la
  // competición activa — es lo normal, ya que el sorteo se hace justo a
  // partir de esas inscripciones. "Mostrar todos" queda como escape para el
  // caso raro de un binomio que compite sin haber pasado por inscripción.
  const inscritosDeLaTalla = competicionActiva
    ? inscripciones.filter((i) => i.binomio.perro.talla === competicionActiva.talla)
    : inscripciones;
  const binomiosInscritos = inscritosDeLaTalla.map((i) => i.binomio);
  const binomiosOpciones = mostrarTodosBinomios ? binomios : binomiosInscritos;

  function seleccionarCompeticion(id: string) {
    setCompeticionActivaId(id);
    setMensajeSorteo(null);
    setModoManual(false);
    setMensajePublicacion(null);
  }

  async function realizarSorteo() {
    if (!competicionActiva) return;
    setMensajeSorteo(null);
    try {
      const resultado = await realizarSorteoAction(competicionActiva.id);
      setMensajeSorteo(
        `Sorteo realizado: ${resultado.creados} binomio(s) en el orden de salida.` +
          (resultado.excluidosSinNivel > 0
            ? ` ${resultado.excluidosSinNivel} inscrito(s) excluido(s) por no tener nivel asignado todavía en la ficha de su perro (ve a Perros y asígnaselo).`
            : "")
      );
    } catch (err) {
      setMensajeSorteo(err instanceof Error ? err.message : "No se ha podido realizar el sorteo.");
    }
  }

  async function publicarManga() {
    if (!competicionActiva) return;
    setMensajePublicacion(null);
    setPublicando(true);
    try {
      await publicarCompeticionAction(competicionActiva.id);
      setMensajePublicacion(
        "Resultados publicados: ya se ven en la web y la clasificación de este nivel/altura se ha actualizado."
      );
    } catch (err) {
      setMensajePublicacion(err instanceof Error ? err.message : "No se han podido publicar los resultados.");
    } finally {
      setPublicando(false);
    }
  }

  async function despublicarManga() {
    if (!competicionActiva) return;
    setMensajePublicacion(null);
    setPublicando(true);
    try {
      await despublicarCompeticionAction(competicionActiva.id);
      setMensajePublicacion("Resultados retirados de la web y clasificación recalculada sin ellos.");
    } catch (err) {
      setMensajePublicacion(err instanceof Error ? err.message : "No se ha podido despublicar.");
    } finally {
      setPublicando(false);
    }
  }

  if (jornada.competiciones.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-sm text-black/50">Añade al menos una competición en el paso anterior.</p>
        <button type="button" onClick={onAtras} className="btn-secondary mt-4">
          ← Atrás
        </button>
      </div>
    );
  }

  // El sorteo no se puede repetir en cuanto hay algún resultado real
  // introducido (tiempo o eliminación) — igual que comprueba, por su
  // cuenta, realizarSorteoAction en el servidor.
  const puedeSortear =
    !!competicionActiva &&
    competicionActiva.resultados.every((r) => r.tiempoS == null && !r.eliminado);

  // Estado de publicación de la manga activa: cada manga se puede
  // publicar por separado en cuanto se termina (no hace falta esperar a
  // toda la jornada) — ver publicarCompeticionAction.
  const totalResultadosActiva = competicionActiva?.resultados.length ?? 0;
  const publicadosActiva = competicionActiva?.resultados.filter((r) => r.publicado).length ?? 0;
  const totalmentePublicada = totalResultadosActiva > 0 && publicadosActiva === totalResultadosActiva;
  const parcialmentePublicada = publicadosActiva > 0 && !totalmentePublicada;

  return (
    <div className="space-y-6">
      <p className="text-sm text-black/60 bg-black/5 border border-black/10 rounded-lg px-4 py-2">
        Esto lo suele rellenar quien juzgue la jornada, normalmente la misma semana de la prueba,
        cuando ya conoce la pista y el número de inscritos.
      </p>

      <div className="flex flex-wrap gap-2">
        {jornada.competiciones.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => seleccionarCompeticion(c.id)}
            className={`chip border ${
              c.id === competicionActivaId
                ? "bg-brand-ink text-white border-brand-ink"
                : "bg-white text-brand-ink border-black/15 hover:bg-black/5"
            }`}
          >
            {ETIQUETA_MODALIDAD[c.modalidad]} · {ETIQUETA_NIVEL[c.nivel]} · {ETIQUETA_TALLA_CORTA[c.talla]}
            {c.manga > 1 ? ` · M${c.manga}` : ""}
          </button>
        ))}
      </div>

      {competicionActiva ? (
        <>
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Sorteo del orden de salida</h2>
            <p className="text-sm text-black/50 mb-3">
              Apunta, en orden aleatorio, a los binomios inscritos en esta jornada con la talla y el
              nivel de esta competición.
            </p>
            <button type="button" onClick={realizarSorteo} disabled={!puedeSortear} className="btn-secondary">
              Realizar sorteo
            </button>
            {!puedeSortear ? (
              <p className="text-xs text-black/40 mt-2">
                Ya hay resultados introducidos en esta competición: no se puede repetir el sorteo.
              </p>
            ) : null}
            {mensajeSorteo ? <p className="text-sm mt-3">{mensajeSorteo}</p> : null}

            {competicionActiva.resultados.length > 0 ? (
              <form
                action={actualizarOrdenSalidaAction.bind(null, competicionActiva.id)}
                className="mt-5 pt-4 border-t border-black/10 space-y-2"
              >
                <h3 className="font-semibold text-sm mb-2">Orden de salida</h3>
                {competicionActiva.resultados.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-sm">
                    <input
                      name={`orden-${r.id}`}
                      type="number"
                      min={1}
                      defaultValue={r.dorsal ?? undefined}
                      className="input w-20"
                    />
                    <span>
                      {r.binomio.guia.nombre} {r.binomio.guia.apellidos} · {r.binomio.perro.nombre}
                    </span>
                  </div>
                ))}
                <button type="submit" className="btn-secondary mt-2">
                  Guardar orden
                </button>
              </form>
            ) : null}
          </div>

          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Resultados</h2>
                {totalmentePublicada ? (
                  <span className="chip bg-success/10 text-success border-success/20">Publicada</span>
                ) : parcialmentePublicada ? (
                  <span className="chip bg-brand-yellow/20 text-brand-ink border-transparent">
                    Publicada a medias
                  </span>
                ) : (
                  <span className="chip bg-black/5 text-black/50 border-black/10">Sin publicar</span>
                )}
              </div>
              {competicionActiva.resultados.length > 0 ? (
                totalmentePublicada ? (
                  <button
                    type="button"
                    onClick={despublicarManga}
                    disabled={publicando}
                    className="btn-secondary text-sm"
                  >
                    Despublicar estos resultados
                  </button>
                ) : (
                  <button type="button" onClick={publicarManga} disabled={publicando} className="btn-primary text-sm">
                    Publicar estos resultados
                  </button>
                )
              ) : null}
            </div>
            {mensajePublicacion ? <p className="text-sm text-black/60 mb-3">{mensajePublicacion}</p> : null}
            <p className="text-xs text-black/40 mb-4">
              Al publicar esta manga, sus resultados se ven ya en la web y la clasificación de este
              nivel/altura (y la general, si ya hay resultados de otra modalidad) se actualiza y publica
              sola, lista para imprimir.
            </p>
            {competicionActiva.resultados.length === 0 ? (
              <p className="text-sm text-black/50 mb-4">Todavía no hay resultados en esta competición.</p>
            ) : (
              <table className="w-full text-sm mb-2">
                <thead>
                  <tr className="text-left text-black/50 border-b border-black/10">
                    <th className="py-2 pr-3">Dorsal</th>
                    <th className="py-2 pr-3">Binomio</th>
                    <th className="py-2 pr-3">Tiempo</th>
                    <th className="py-2 pr-3">Faltas</th>
                    <th className="py-2 pr-3">Rehúses</th>
                    <th className="py-2 pr-3">Penalización</th>
                    <th className="py-2 pr-3">Calificación</th>
                    <th className="py-2 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {competicionActiva.resultados.map((r) => (
                    <tr key={r.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2 pr-3">{r.dorsal ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {r.binomio.guia.nombre} {r.binomio.guia.apellidos} · {r.binomio.perro.nombre}
                      </td>
                      <td className="py-2 pr-3">{r.tiempoS ?? "—"}</td>
                      <td className="py-2 pr-3">{r.faltas}</td>
                      <td className="py-2 pr-3">{r.rehuses}</td>
                      <td className="py-2 pr-3">
                        {r.penalizacionTotal !== null ? r.penalizacionTotal.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.noPresentado ? (
                          <span className="chip bg-black/10 text-black/60 border-black/10">No presentado</span>
                        ) : r.calificacion ? (
                          <span className={`chip ${ESTILO_CALIFICACION[r.calificacion] ?? ""}`}>
                            {ETIQUETA_CALIFICACION[r.calificacion] ?? r.calificacion}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <form action={eliminarResultadoAction}>
                          <input type="hidden" name="resultadoId" value={r.id} />
                          <input type="hidden" name="jornadaId" value={jornada.id} />
                          <button type="submit" className="text-danger text-sm hover:underline">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {competicionActiva.resultados.length > 0 && !modoManual ? (
            <FormularioResultadoSecuencial
              key={competicionActiva.id}
              competicionId={competicionActiva.id}
              jornadaId={jornada.id}
              tallaEtiqueta={ETIQUETA_TALLA_CORTA[competicionActiva.talla] ?? competicionActiva.talla}
              resultados={competicionActiva.resultados}
              onModoManual={() => setModoManual(true)}
            />
          ) : (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Añadir / actualizar resultado</h2>
                {competicionActiva.resultados.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModoManual(false)}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    ← Volver al modo por orden de salida
                  </button>
                ) : null}
              </div>
              <FormularioResultadoManual
                competicionId={competicionActiva.id}
                jornadaId={jornada.id}
                tallaEtiqueta={ETIQUETA_TALLA_CORTA[competicionActiva.talla] ?? competicionActiva.talla}
                binomiosOpciones={binomiosOpciones}
                mostrarTodosBinomios={mostrarTodosBinomios}
                totalBinomios={binomios.length}
                totalInscritos={binomiosInscritos.length}
                onMostrarTodos={() => setMostrarTodosBinomios(true)}
              />
            </div>
          )}
        </>
      ) : null}

      <div className="flex gap-2">
        <button type="button" onClick={onAtras} className="btn-secondary">
          ← Atrás
        </button>
        <button type="button" onClick={onSiguiente} className="btn-primary">
          Siguiente →
        </button>
      </div>
    </div>
  );
}

/** Formulario de resultado "de toda la vida": un desplegable con el binomio
 * a elegir a mano. Se usa cuando todavía no hay sorteo/orden de salida en
 * esta manga, o como escape para un binomio que compite sin haber pasado
 * por el sorteo (botón "Volver al modo por orden de salida" / enlace
 * "No encuentro el binomio"). */
function FormularioResultadoManual({
  competicionId,
  jornadaId,
  tallaEtiqueta,
  binomiosOpciones,
  mostrarTodosBinomios,
  totalBinomios,
  totalInscritos,
  onMostrarTodos,
}: {
  competicionId: string;
  jornadaId: string;
  tallaEtiqueta: string;
  binomiosOpciones: Binomio[];
  mostrarTodosBinomios: boolean;
  totalBinomios: number;
  totalInscritos: number;
  onMostrarTodos: () => void;
}) {
  return (
    <form action={guardarResultadoAction} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <input type="hidden" name="competicionId" value={competicionId} />
      <input type="hidden" name="jornadaId" value={jornadaId} />
      <label className="block col-span-2">
        <span className="block text-sm font-medium mb-1">
          Binomio <span className="font-normal text-black/40">({tallaEtiqueta})</span>
        </span>
        <select name="binomioId" required className="input">
          <option value="">— Selecciona —</option>
          {binomiosOpciones.map((b) => (
            <option key={b.id} value={b.id}>
              {b.guia.nombre} {b.guia.apellidos} · {b.perro.nombre}
              {b.club ? ` (${b.club.nombre})` : ""}
            </option>
          ))}
        </select>
        {!mostrarTodosBinomios && totalInscritos < totalBinomios ? (
          <button type="button" onClick={onMostrarTodos} className="text-xs text-brand-blue hover:underline mt-1">
            No encuentro el binomio — mostrar todos los binomios activos
          </button>
        ) : null}
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Dorsal</span>
        <input name="dorsal" type="number" className="input" />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Tiempo (s)</span>
        <input name="tiempoS" type="number" step="0.01" className="input" />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Faltas</span>
        <input name="faltas" type="number" defaultValue={0} min={0} className="input" />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1">Rehúses</span>
        <input name="rehuses" type="number" defaultValue={0} min={0} className="input" />
      </label>
      <label className="flex items-center gap-2 mt-6">
        <input name="eliminadoManual" type="checkbox" className="h-4 w-4" />
        <span className="text-sm">Eliminar por otra causa del reglamento</span>
      </label>
      <label className="flex items-center gap-2 mt-6">
        <input name="noPresentado" type="checkbox" className="h-4 w-4" />
        <span className="text-sm">No presentado</span>
      </label>
      <label className="block col-span-2">
        <span className="block text-sm font-medium mb-1">Motivo (si aplica)</span>
        <input name="motivoEliminacionManual" className="input" />
      </label>
      <div className="col-span-2 md:col-span-4">
        <button type="submit" className="btn-primary">
          Guardar resultado
        </button>
      </div>
    </form>
  );
}

/** Formulario de resultado pensado para la mesa durante la propia
 * competición: recorre los binomios de la manga EN EL ORDEN DE SALIDA del
 * sorteo (dorsal 1, 2, 3...), con un botón "Guardar y siguiente" que graba
 * el resultado del binomio actual y pasa automáticamente al siguiente
 * dorsal, para no tener que buscar cada binomio en un desplegable mientras
 * corren los perros.
 *
 * Reutiliza `guardarResultadoAction` (la misma acción que el modo manual),
 * pero la llama programáticamente desde `onSubmit` en vez de dejar que el
 * `<form action=...>` la dispare directamente, porque necesitamos "hacer
 * algo después" (avanzar de posición) una vez guardado. */
function FormularioResultadoSecuencial({
  competicionId,
  jornadaId,
  tallaEtiqueta,
  resultados,
  onModoManual,
}: {
  competicionId: string;
  jornadaId: string;
  tallaEtiqueta: string;
  resultados: ResultadoFila[];
  onModoManual: () => void;
}) {
  const [indice, setIndice] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPresentado, setNoPresentado] = useState(() => resultados[0]?.noPresentado ?? false);
  const [finalizando, setFinalizando] = useState(false);
  const [mensajeFinalizar, setMensajeFinalizar] = useState<string | null>(null);

  const total = resultados.length;
  const indiceSeguro = Math.min(indice, total - 1);
  const actual = resultados[indiceSeguro];
  const pendientes = resultados.filter((r) => r.tiempoS === null && !r.eliminado && !r.noPresentado);

  function irA(i: number) {
    const clamped = Math.max(0, Math.min(i, total - 1));
    setIndice(clamped);
    setError(null);
    setNoPresentado(resultados[clamped]?.noPresentado ?? false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const avanzar = submitter?.value !== "solo-guardar";

    setError(null);
    setGuardando(true);
    const fd = new FormData(e.currentTarget);
    try {
      await guardarResultadoAction(fd);
      if (avanzar && indiceSeguro < total - 1) {
        irA(indiceSeguro + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar el resultado.");
    } finally {
      setGuardando(false);
    }
  }

  /** Botón rápido "No presentado": guarda el binomio actual directamente
   * como no presentado (sin tocar la casilla ni pulsar Guardar) y pasa al
   * siguiente, para el caso frecuente en la mesa de un perro que no
   * corre. */
  async function marcarNoPresentadoYAvanzar() {
    if (!actual) return;
    setError(null);
    setGuardando(true);
    const fd = new FormData();
    fd.set("competicionId", competicionId);
    fd.set("jornadaId", jornadaId);
    fd.set("binomioId", actual.binomioId);
    fd.set("dorsal", String(actual.dorsal ?? indiceSeguro + 1));
    fd.set("faltas", "0");
    fd.set("rehuses", "0");
    fd.set("noPresentado", "on");
    try {
      await guardarResultadoAction(fd);
      if (indiceSeguro < total - 1) irA(indiceSeguro + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar el resultado.");
    } finally {
      setGuardando(false);
    }
  }

  /** Cierra la manga de golpe: a todos los que sigan con los datos por
   * defecto del sorteo (sin tiempo, sin eliminar) se les marca como no
   * presentados, sin tener que pasarlos uno a uno. */
  async function finalizarManga() {
    if (pendientes.length === 0) return;
    const confirmado = window.confirm(
      `Vas a marcar como "no presentado" a ${pendientes.length} binomio(s) que todavía no tienen resultado. ¿Continuar?`
    );
    if (!confirmado) return;

    setMensajeFinalizar(null);
    setFinalizando(true);
    try {
      const resultado = await finalizarMangaAction(competicionId);
      setMensajeFinalizar(`Manga cerrada: ${resultado.marcados} binomio(s) marcado(s) como no presentados.`);
    } catch (err) {
      setMensajeFinalizar(err instanceof Error ? err.message : "No se ha podido cerrar la manga.");
    } finally {
      setFinalizando(false);
    }
  }

  if (!actual) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Añadir / actualizar resultado — por orden de salida</h2>
        <button type="button" onClick={onModoManual} className="text-xs text-brand-blue hover:underline">
          Añadir un binomio fuera del sorteo
        </button>
      </div>
      <p className="text-sm text-black/50 mb-2">
        Binomio {indiceSeguro + 1} de {total} ({tallaEtiqueta}). Guarda y pasa automáticamente al
        siguiente dorsal.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          type="button"
          onClick={finalizarManga}
          disabled={pendientes.length === 0 || finalizando}
          className="btn-secondary text-sm"
        >
          Dar la manga por finalizada{pendientes.length > 0 ? ` (${pendientes.length} sin resultado)` : ""}
        </button>
        {mensajeFinalizar ? <p className="text-sm text-black/60">{mensajeFinalizar}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => irA(indiceSeguro - 1)}
          disabled={indiceSeguro === 0}
          className="btn-secondary"
        >
          ← Anterior
        </button>
        <select
          value={actual.id}
          onChange={(e) => irA(resultados.findIndex((r) => r.id === e.target.value))}
          className="input w-auto"
        >
          {resultados.map((r, i) => (
            <option key={r.id} value={r.id}>
              Dorsal {r.dorsal ?? i + 1} — {r.binomio.guia.nombre} {r.binomio.guia.apellidos} ·{" "}
              {r.binomio.perro.nombre}
              {r.tiempoS !== null || r.eliminado || r.noPresentado ? " ✓" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => irA(indiceSeguro + 1)}
          disabled={indiceSeguro === total - 1}
          className="btn-secondary"
        >
          Siguiente →
        </button>
      </div>

      {error ? <p className="text-danger text-sm mb-3">{error}</p> : null}

      <form key={actual.id} onSubmit={onSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <input type="hidden" name="competicionId" value={competicionId} />
        <input type="hidden" name="jornadaId" value={jornadaId} />
        <input type="hidden" name="binomioId" value={actual.binomioId} />
        <div className="block col-span-2 md:col-span-4">
          <span className="block text-sm font-medium mb-1">Binomio</span>
          <p className="text-sm">
            <span className="font-semibold">Dorsal {actual.dorsal ?? indiceSeguro + 1}</span> —{" "}
            {actual.binomio.guia.nombre} {actual.binomio.guia.apellidos} · {actual.binomio.perro.nombre}
            {actual.binomio.club ? ` (${actual.binomio.club.nombre})` : ""}
          </p>
        </div>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Dorsal</span>
          <input name="dorsal" type="number" defaultValue={actual.dorsal ?? indiceSeguro + 1} className="input" />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Tiempo (s)</span>
          <input
            name="tiempoS"
            type="number"
            step="0.01"
            defaultValue={actual.tiempoS ?? ""}
            disabled={noPresentado}
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Faltas</span>
          <input
            name="faltas"
            type="number"
            defaultValue={actual.faltas}
            min={0}
            disabled={noPresentado}
            className="input"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Rehúses</span>
          <input
            name="rehuses"
            type="number"
            defaultValue={actual.rehuses}
            min={0}
            disabled={noPresentado}
            className="input"
          />
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input name="eliminadoManual" type="checkbox" disabled={noPresentado} className="h-4 w-4" />
          <span className="text-sm">Eliminar por otra causa del reglamento</span>
        </label>
        <label className="flex items-center gap-2 mt-6">
          <input
            name="noPresentado"
            type="checkbox"
            checked={noPresentado}
            onChange={(e) => setNoPresentado(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">No presentado (penalización fija)</span>
        </label>
        <label className="block col-span-2">
          <span className="block text-sm font-medium mb-1">Motivo (si aplica)</span>
          <input
            name="motivoEliminacionManual"
            defaultValue={actual.noPresentado ? "" : actual.motivoEliminacion ?? ""}
            disabled={noPresentado}
            className="input"
          />
        </label>
        <div className="col-span-2 md:col-span-4 flex flex-wrap gap-2">
          <button type="submit" name="accion" value="guardar-siguiente" disabled={guardando} className="btn-primary">
            {indiceSeguro < total - 1 ? "Guardar y siguiente →" : "Guardar"}
          </button>
          <button
            type="submit"
            name="accion"
            value="solo-guardar"
            disabled={guardando}
            className="btn-secondary"
          >
            Guardar (sin avanzar)
          </button>
          <button
            type="button"
            onClick={marcarNoPresentadoYAvanzar}
            disabled={guardando}
            className="text-danger text-sm border border-danger/30 rounded-xl px-4 py-2 hover:bg-danger/5"
          >
            No presentado →
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Paso 5: Revisar -----------------------------------------------------------

function PasoRevisar({
  jornada,
  revisado,
  setRevisado,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  revisado: boolean;
  setRevisado: (v: boolean) => void;
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Resumen antes de publicar</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-4">Competición</th>
              <th className="py-2 pr-4">Resultados</th>
              <th className="py-2 pr-4">Eliminados</th>
            </tr>
          </thead>
          <tbody>
            {jornada.competiciones.map((c) => (
              <tr key={c.id} className="border-b border-black/5 last:border-0">
                <td className="py-2 pr-4">
                  {ETIQUETA_MODALIDAD[c.modalidad]} · {ETIQUETA_NIVEL[c.nivel]} · {ETIQUETA_TALLA_CORTA[c.talla]}
                </td>
                <td className="py-2 pr-4">{c.resultados.length}</td>
                <td className="py-2 pr-4">{c.resultados.filter((r) => r.eliminado).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="flex items-start gap-3 card p-5 cursor-pointer">
        <input
          type="checkbox"
          checked={revisado}
          onChange={(e) => setRevisado(e.target.checked)}
          className="h-5 w-5 mt-0.5"
        />
        <span>
          He revisado que todos los resultados de esta jornada son correctos y están listos para
          publicarse en la web pública.
        </span>
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={onAtras} className="btn-secondary">
          ← Atrás
        </button>
        <button type="button" onClick={onSiguiente} disabled={!revisado} className="btn-primary">
          Siguiente →
        </button>
      </div>
    </div>
  );
}

// --- Paso 6: Publicar -----------------------------------------------------------

function PasoPublicar({
  jornada,
  totalResultados,
  onAtras,
}: {
  jornada: Jornada;
  totalResultados: number;
  onAtras: () => void;
}) {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="card p-6">
        <h2 className="font-semibold mb-2">
          {jornada.estado === "PUBLICADA" ? "Esta jornada ya está publicada" : "Publicar jornada"}
        </h2>
        <p className="text-sm text-black/60 mb-4">
          {totalResultados} resultado(s) en {jornada.competiciones.length} competición(es) pasarán a ser
          visibles en la web pública.
        </p>

        {jornada.estado === "PUBLICADA" ? (
          <form action={despublicarJornadaAction}>
            <input type="hidden" name="jornadaId" value={jornada.id} />
            <button type="submit" className="btn-secondary">
              Despublicar (volver a borrador)
            </button>
          </form>
        ) : (
          <form action={publicarJornadaAction} className="space-y-4">
            <input type="hidden" name="jornadaId" value={jornada.id} />
            <label className="flex items-start gap-3">
              <input type="checkbox" name="confirmado" required className="h-5 w-5 mt-0.5" />
              <span className="text-sm">
                Confirmo que quiero publicar esta jornada tal y como está.
              </span>
            </label>
            <button type="submit" className="btn-primary">
              Publicar jornada
            </button>
          </form>
        )}
      </div>

      <button type="button" onClick={onAtras} className="btn-secondary">
        ← Atrás
      </button>
    </div>
  );
}
