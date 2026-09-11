"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getReglaModalidad } from "@/lib/data/reglas";
import { calcularResultado } from "@/lib/rules/engine";
import type { Modalidad, NivelCompeticion, Talla } from "@prisma/client";
import { nivelValidoParaTalla } from "@/lib/constants";
import {
  recalcularClasificacionDeCompeticionAction,
  recalcularClasificacionesDeJornadaAction,
} from "@/app/actions/clasificaciones";

function requireSession() {
  // Nota: el middleware ya bloquea /backoffice/** sin sesión, esta
  // comprobación es una segunda capa por si una acción se invocara desde
  // otro contexto en el futuro.
  return getSession();
}

// --- Datos de la jornada -----------------------------------------------------
//
// Ya no existe una creación de jornada "libre": las jornadas se generan como
// huecos vacíos al crear la Temporada (ver src/app/actions/temporadas.ts) y
// secretaría elige uno desde /backoffice/jornadas/nueva. Esta acción rellena
// (o edita más adelante) los datos reales de esa jornada, y es la que marca
// `configurada = true` la primera vez que se guarda.

export async function actualizarDatosJornadaAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  const lugar = String(formData.get("lugar") ?? "").trim() || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const clubId = String(formData.get("clubId") ?? "") || null;
  const juezId = String(formData.get("juezId") ?? "") || null;

  if (!jornadaId || !nombre || !fecha) {
    throw new Error("Faltan campos obligatorios: nombre y fecha.");
  }

  await prisma.jornada.update({
    where: { id: jornadaId },
    data: { nombre, fecha: new Date(fecha), lugar, descripcion, clubId, juezId, configurada: true },
  });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/backoffice/jornadas/nueva");
}

// --- Competiciones -----------------------------------------------------------

export async function agregarCompeticionAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const modalidad = String(formData.get("modalidad") ?? "") as Modalidad;
  const nivel = String(formData.get("nivel") ?? "") as NivelCompeticion;
  const talla = String(formData.get("talla") ?? "") as Talla;
  const manga = Number(formData.get("manga") ?? 1);
  const longitudM = formData.get("longitudM") ? Number(formData.get("longitudM")) : null;
  const velocidadMs = formData.get("velocidadMs") ? Number(formData.get("velocidadMs")) : null;
  const tiempoParadaMesaS = Number(formData.get("tiempoParadaMesaS") ?? 0);
  const trmFactor = Number(formData.get("trmFactor") ?? 1.5);
  const juezId = String(formData.get("juezId") ?? "") || null;

  if (!jornadaId || !modalidad || !nivel || !talla) {
    throw new Error("Faltan campos obligatorios para la competición.");
  }
  if (!nivelValidoParaTalla(talla, nivel)) {
    throw new Error(
      "Esa combinación de nivel y talla no existe: Nivel II/III solo son para Maxi y Large; " +
        "el resto de tallas van con «Sin grado» (o Performance)."
    );
  }

  await prisma.competicion.create({
    data: {
      jornadaId,
      modalidad,
      nivel,
      talla,
      manga,
      longitudM,
      velocidadMs,
      tiempoParadaMesaS,
      trmFactor,
      juezId,
    },
  });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

export async function eliminarCompeticionAction(formData: FormData) {
  await requireSession();
  const competicionId = String(formData.get("competicionId") ?? "");
  const jornadaId = String(formData.get("jornadaId") ?? "");
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  await prisma.competicion.delete({ where: { id: competicionId } });
  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

// --- Resultados ---------------------------------------------------------------

export async function guardarResultadoAction(formData: FormData) {
  await requireSession();
  const competicionId = String(formData.get("competicionId") ?? "");
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const binomioId = String(formData.get("binomioId") ?? "");
  const dorsal = formData.get("dorsal") ? Number(formData.get("dorsal")) : null;
  const tiempoS = formData.get("tiempoS") ? Number(formData.get("tiempoS")) : null;
  const faltas = Number(formData.get("faltas") ?? 0);
  const rehuses = Number(formData.get("rehuses") ?? 0);
  const eliminadoManual = formData.get("eliminadoManual") === "on";
  const motivoEliminacionManual = String(formData.get("motivoEliminacionManual") ?? "").trim() || null;
  const noPresentado = formData.get("noPresentado") === "on";

  if (!competicionId || !binomioId) {
    throw new Error("Faltan campos obligatorios para el resultado.");
  }

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    include: { jornada: true },
  });

  const regla = await getReglaModalidad(competicion.jornada.temporadaId, competicion.modalidad);

  const calculado = calcularResultado(
    competicion.modalidad,
    { faltas, rehuses, tiempoS, eliminadoManual, motivoEliminacionManual, noPresentado },
    {
      longitudM: competicion.longitudM,
      velocidadMs: competicion.velocidadMs,
      tiempoParadaMesaS: competicion.tiempoParadaMesaS,
      trmFactor: competicion.trmFactor,
    },
    regla
  );

  await prisma.resultado.upsert({
    where: { competicionId_binomioId: { competicionId, binomioId } },
    create: {
      competicionId,
      binomioId,
      dorsal,
      tiempoS,
      faltas,
      rehuses,
      eliminado: calculado.eliminado,
      motivoEliminacion: calculado.motivoEliminacion,
      noPresentado: calculado.noPresentado,
      penalizacionTiempo: calculado.penalizacionTiempo,
      penalizacionTotal: calculado.penalizacionTotal,
      calificacion: calculado.calificacion,
    },
    update: {
      dorsal,
      tiempoS,
      faltas,
      rehuses,
      eliminado: calculado.eliminado,
      motivoEliminacion: calculado.motivoEliminacion,
      noPresentado: calculado.noPresentado,
      penalizacionTiempo: calculado.penalizacionTiempo,
      penalizacionTotal: calculado.penalizacionTotal,
      calificacion: calculado.calificacion,
    },
  });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

/**
 * Da por finalizada una manga: a cualquier resultado que siga tal cual lo
 * dejó el sorteo (sin tiempo, sin eliminar, sin marcar como no
 * presentado) se le aplica de golpe la penalización de "no presentado",
 * en vez de tener que marcarlos uno a uno al llegar al final de la lista
 * de dorsales en la mesa.
 *
 * Un resultado con datos reales ya introducidos (tiempo, eliminación, o
 * ya marcado no presentado) no se toca, así que se puede llamar varias
 * veces sin riesgo de pisar nada.
 */
export async function finalizarMangaAction(competicionId: string) {
  await requireSession();
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    include: { jornada: true, resultados: true },
  });

  const pendientes = competicion.resultados.filter(
    (r: { tiempoS: number | null; eliminado: boolean; noPresentado: boolean }) =>
      r.tiempoS === null && !r.eliminado && !r.noPresentado
  );

  if (pendientes.length === 0) {
    return { marcados: 0 };
  }

  const regla = await getReglaModalidad(competicion.jornada.temporadaId, competicion.modalidad);

  const calculado = calcularResultado(
    competicion.modalidad,
    {
      faltas: 0,
      rehuses: 0,
      tiempoS: null,
      eliminadoManual: false,
      motivoEliminacionManual: null,
      noPresentado: true,
    },
    {
      longitudM: competicion.longitudM,
      velocidadMs: competicion.velocidadMs,
      tiempoParadaMesaS: competicion.tiempoParadaMesaS,
      trmFactor: competicion.trmFactor,
    },
    regla
  );

  await prisma.$transaction(
    pendientes.map((r: { id: string }) =>
      prisma.resultado.update({
        where: { id: r.id },
        data: {
          faltas: 0,
          rehuses: 0,
          tiempoS: null,
          eliminado: calculado.eliminado,
          motivoEliminacion: calculado.motivoEliminacion,
          noPresentado: true,
          penalizacionTiempo: calculado.penalizacionTiempo,
          penalizacionTotal: calculado.penalizacionTotal,
          calificacion: calculado.calificacion,
        },
      })
    )
  );

  revalidatePath(`/backoffice/jornadas/${competicion.jornadaId}`);
  return { marcados: pendientes.length };
}

export async function eliminarResultadoAction(formData: FormData) {
  await requireSession();
  const resultadoId = String(formData.get("resultadoId") ?? "");
  const jornadaId = String(formData.get("jornadaId") ?? "");
  if (!resultadoId) throw new Error("Falta el identificador del resultado.");

  await prisma.resultado.delete({ where: { id: resultadoId } });
  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

// --- Publicación ---------------------------------------------------------------

/**
 * Publica de golpe los resultados de UNA manga (Competicion): es lo que
 * usa el botón "Publicar estos resultados" del paso Resultados para ir
 * publicando cada altura+grado en cuanto se termina, sin esperar a que
 * esté toda la jornada acabada. En cuanto se publica la primera manga de
 * una jornada, la jornada pasa a "PUBLICADA" (aparece en la web, aunque
 * de momento solo se vean los resultados de esa manga: el resto sigue
 * oculto hasta que también se publiquen). Recalcula y publica de paso la
 * clasificación (por nivel/categoría) a la que pertenece esa manga — ver
 * recalcularClasificacionDeCompeticionAction.
 */
export async function publicarCompeticionAction(competicionId: string) {
  await requireSession();
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    include: { jornada: true, resultados: true },
  });

  if (competicion.resultados.length === 0) {
    throw new Error("Esta manga todavía no tiene ningún resultado que publicar.");
  }

  await prisma.$transaction([
    prisma.resultado.updateMany({ where: { competicionId }, data: { publicado: true } }),
    ...(competicion.jornada.estado !== "PUBLICADA"
      ? [prisma.jornada.update({ where: { id: competicion.jornadaId }, data: { estado: "PUBLICADA" as const } })]
      : []),
  ]);

  await recalcularClasificacionDeCompeticionAction(competicionId);

  revalidatePath(`/backoffice/jornadas/${competicion.jornadaId}`);
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/calendario");
  revalidatePath(`/jornadas/${competicion.jornadaId}`);
}

/** Deshace la publicación de una manga: sus resultados dejan de verse en
 * la web y se excluyen de la clasificación (se recalcula sin ellos). Si
 * era la última manga publicada de la jornada, la jornada vuelve a
 * "BORRADOR" (deja de aparecer como publicada). */
export async function despublicarCompeticionAction(competicionId: string) {
  await requireSession();
  if (!competicionId) throw new Error("Falta el identificador de la competición.");

  const competicion = await prisma.competicion.findUniqueOrThrow({
    where: { id: competicionId },
    select: { jornadaId: true },
  });

  await prisma.resultado.updateMany({ where: { competicionId }, data: { publicado: false } });

  const quedanPublicados = await prisma.resultado.count({
    where: { competicion: { jornadaId: competicion.jornadaId }, publicado: true },
  });
  if (quedanPublicados === 0) {
    await prisma.jornada.update({ where: { id: competicion.jornadaId }, data: { estado: "BORRADOR" } });
  }

  await recalcularClasificacionDeCompeticionAction(competicionId);

  revalidatePath(`/backoffice/jornadas/${competicion.jornadaId}`);
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/calendario");
  revalidatePath(`/jornadas/${competicion.jornadaId}`);
}

/** Publica de golpe TODOS los resultados de la jornada (equivalente a
 * pulsar "Publicar" manga por manga, pero de una vez) — pensado para
 * cuando ya se han terminado todas las mangas del día y no hace falta ir
 * publicando una a una. */
export async function publicarJornadaAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const confirmado = formData.get("confirmado") === "on";

  if (!jornadaId) throw new Error("Falta el identificador de la jornada.");
  if (!confirmado) {
    throw new Error("Debes confirmar que los resultados han sido revisados antes de publicar.");
  }

  const totalResultados = await prisma.resultado.count({
    where: { competicion: { jornadaId } },
  });

  if (totalResultados === 0) {
    throw new Error("No se puede publicar una jornada sin resultados.");
  }

  await prisma.$transaction([
    prisma.resultado.updateMany({
      where: { competicion: { jornadaId } },
      data: { publicado: true },
    }),
    prisma.jornada.update({ where: { id: jornadaId }, data: { estado: "PUBLICADA" } }),
  ]);

  await recalcularClasificacionesDeJornadaAction(jornadaId);

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/calendario");
}

export async function despublicarJornadaAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  if (!jornadaId) throw new Error("Falta el identificador de la jornada.");

  await prisma.$transaction([
    prisma.resultado.updateMany({
      where: { competicion: { jornadaId } },
      data: { publicado: false },
    }),
    prisma.jornada.update({ where: { id: jornadaId }, data: { estado: "BORRADOR" } }),
  ]);

  await recalcularClasificacionesDeJornadaAction(jornadaId);

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

/** Borra una jornada (y en cascada sus competiciones y resultados). No se
 * permite borrar una jornada publicada directamente: hay que despublicarla
 * primero, para que nadie borre por error una jornada cuyos resultados ya
 * son visibles en la web pública. */
export async function eliminarJornadaAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  if (!jornadaId) throw new Error("Falta el identificador de la jornada.");

  const jornada = await prisma.jornada.findUniqueOrThrow({ where: { id: jornadaId } });
  if (jornada.estado === "PUBLICADA") {
    throw new Error("No se puede borrar una jornada publicada. Despublícala primero.");
  }

  await prisma.jornada.delete({ where: { id: jornadaId } });

  revalidatePath("/backoffice/dashboard");
  revalidatePath("/backoffice/jornadas/nueva");
  revalidatePath(`/backoffice/temporadas/${jornada.temporadaId}`);
  redirect(`/backoffice/temporadas/${jornada.temporadaId}`);
}
