"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getReglaModalidad } from "@/lib/data/reglas";
import { calcularResultado } from "@/lib/rules/engine";
import type { Modalidad, NivelCompeticion, Talla } from "@prisma/client";

function requireSession() {
  // Nota: el middleware ya bloquea /backoffice/** sin sesión, esta
  // comprobación es una segunda capa por si una acción se invocara desde
  // otro contexto en el futuro.
  return getSession();
}

// --- Datos de la jornada -----------------------------------------------------

export async function crearJornadaAction(formData: FormData) {
  const session = await requireSession();
  if (!session) redirect("/backoffice/login");

  const temporadaId = String(formData.get("temporadaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  const lugar = String(formData.get("lugar") ?? "").trim() || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const clubId = String(formData.get("clubId") ?? "") || null;
  const juezId = String(formData.get("juezId") ?? "") || null;

  if (!temporadaId || !nombre || !fecha) {
    throw new Error("Faltan campos obligatorios: temporada, nombre y fecha.");
  }

  const jornada = await prisma.jornada.create({
    data: {
      temporadaId,
      nombre,
      fecha: new Date(fecha),
      lugar,
      descripcion,
      clubId,
      juezId,
    },
  });

  redirect(`/backoffice/jornadas/${jornada.id}`);
}

export async function actualizarDatosJornadaAction(formData: FormData) {
  await requireSession();
  const jornadaId = String(formData.get("jornadaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  const lugar = String(formData.get("lugar") ?? "").trim() || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const clubId = String(formData.get("clubId") ?? "") || null;
  const juezId = String(formData.get("juezId") ?? "") || null;

  if (!jornadaId) throw new Error("Falta el identificador de la jornada.");

  await prisma.jornada.update({
    where: { id: jornadaId },
    data: { nombre, fecha: new Date(fecha), lugar, descripcion, clubId, juezId },
  });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
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
    { faltas, rehuses, tiempoS, eliminadoManual, motivoEliminacionManual },
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
      penalizacionTiempo: calculado.penalizacionTiempo,
      penalizacionTotal: calculado.penalizacionTotal,
      calificacion: calculado.calificacion,
    },
  });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
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

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}
