"use client";

import { useState } from "react";
import Link from "next/link";
import type { getJornadaConTodo, getBinomiosActivos } from "@/lib/data/backoffice";
import type { getClubesActivos, getJueces } from "@/lib/data/public";
import {
  agregarCompeticionAction,
  eliminarCompeticionAction,
  guardarResultadoAction,
  eliminarResultadoAction,
  publicarJornadaAction,
  despublicarJornadaAction,
  actualizarDatosJornadaAction,
  eliminarJornadaAction,
} from "@/app/actions/jornadas";
import { MODALIDADES, NIVELES, TALLAS, ETIQUETA_MODALIDAD, ETIQUETA_NIVEL, ETIQUETA_TALLA_CORTA, ETIQUETA_CALIFICACION, ESTILO_CALIFICACION } from "@/lib/constants";

type Jornada = NonNullable<Awaited<ReturnType<typeof getJornadaConTodo>>>;
type Binomio = Awaited<ReturnType<typeof getBinomiosActivos>>[number];
type Club = Awaited<ReturnType<typeof getClubesActivos>>[number];
type Juez = Awaited<ReturnType<typeof getJueces>>[number];

const PASOS = ["Datos", "Competiciones", "Resultados", "Revisar", "Publicar"] as const;

export function JornadaWizard({
  jornada,
  binomios,
  clubes,
  jueces,
}: {
  jornada: Jornada;
  binomios: Binomio[];
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
    if (n === 5 && !revisado) return;
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
        <PasoCompeticiones jornada={jornada} onSiguiente={() => irAPaso(3)} onAtras={() => irAPaso(1)} />
      ) : null}

      {paso === 3 ? (
        <PasoResultados
          jornada={jornada}
          binomios={binomios}
          onSiguiente={() => irAPaso(4)}
          onAtras={() => irAPaso(2)}
        />
      ) : null}

      {paso === 4 ? (
        <PasoRevisar
          jornada={jornada}
          revisado={revisado}
          setRevisado={setRevisado}
          onSiguiente={() => irAPaso(5)}
          onAtras={() => irAPaso(3)}
        />
      ) : null}

      {paso === 5 ? (
        <PasoPublicar jornada={jornada} totalResultados={totalResultados} onAtras={() => irAPaso(4)} />
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

// --- Paso 2: Competiciones ---------------------------------------------------

function PasoCompeticiones({
  jornada,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  return (
    <div className="space-y-6">
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
            <span className="block text-sm font-medium mb-1">Nivel</span>
            <select name="nivel" required className="input">
              {NIVELES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-medium mb-1">Talla</span>
            <select name="talla" required className="input">
              {TALLAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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

// --- Paso 3: Resultados -------------------------------------------------------

function PasoResultados({
  jornada,
  binomios,
  onSiguiente,
  onAtras,
}: {
  jornada: Jornada;
  binomios: Binomio[];
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  const [competicionActivaId, setCompeticionActivaId] = useState(jornada.competiciones[0]?.id ?? "");
  const [mostrarTodasTallas, setMostrarTodasTallas] = useState(false);
  const competicionActiva = jornada.competiciones.find((c) => c.id === competicionActivaId);

  // La talla de la competición ya fija qué binomios pueden correrla (un
  // perro solo compite en la talla que tiene asignada), así que por
  // defecto se filtra el desplegable para no obligar a buscar entre todos
  // los binomios de la temporada. "Mostrar todos" queda como escape por si
  // hace falta (p. ej. un perro con la talla mal puesta todavía).
  const binomiosDeLaTalla = competicionActiva
    ? binomios.filter((b) => b.perro.talla === competicionActiva.talla)
    : binomios;
  const binomiosOpciones = mostrarTodasTallas ? binomios : binomiosDeLaTalla;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {jornada.competiciones.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => setCompeticionActivaId(c.id)}
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
            <h2 className="font-semibold mb-4">Resultados</h2>
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
                        {r.calificacion ? (
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

          <div className="card p-5">
            <h2 className="font-semibold mb-4">Añadir / actualizar resultado</h2>
            <form action={guardarResultadoAction} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input type="hidden" name="competicionId" value={competicionActiva.id} />
              <input type="hidden" name="jornadaId" value={jornada.id} />
              <label className="block col-span-2">
                <span className="block text-sm font-medium mb-1">
                  Binomio{" "}
                  <span className="font-normal text-black/40">
                    ({ETIQUETA_TALLA_CORTA[competicionActiva.talla]})
                  </span>
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
                {!mostrarTodasTallas && binomiosDeLaTalla.length < binomios.length ? (
                  <button
                    type="button"
                    onClick={() => setMostrarTodasTallas(true)}
                    className="text-xs text-brand-blue hover:underline mt-1"
                  >
                    No encuentro el binomio — mostrar de todas las tallas
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
          </div>
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

// --- Paso 4: Revisar -----------------------------------------------------------

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

// --- Paso 5: Publicar -----------------------------------------------------------

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
