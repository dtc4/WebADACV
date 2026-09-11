"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function requireSession() {
  return getSession();
}

// --- Inscripciones -------------------------------------------------------
//
// Un binomio "inscrito" en una jornada es la base sobre la que luego se hace
// el sorteo del orden de salida (ver src/app/actions/sorteo.ts). Lo gestiona
// secretaría/la mesa desde el backoffice: no hay inscripción pública ni
// login de guías (decisión del club), así que estas acciones solo se llaman
// desde el paso "Inscripciones" del asistente de jornada.

export async function inscribirBinomioAction(jornadaId: string, binomioId: string) {
  await requireSession();
  if (!jornadaId || !binomioId) {
    throw new Error("Selecciona un binomio para inscribir.");
  }

  // Comprobación previa (en vez de dejar que falle la restricción única de
  // base de datos) para poder dar un mensaje claro en español, siguiendo el
  // mismo patrón que crearBinomioAction en entidades.ts.
  const existente = await prisma.inscripcion.findUnique({
    where: { jornadaId_binomioId: { jornadaId, binomioId } },
  });
  if (existente) {
    throw new Error("Ese binomio ya está inscrito en esta jornada.");
  }

  await prisma.inscripcion.create({ data: { jornadaId, binomioId } });

  revalidatePath(`/backoffice/jornadas/${jornadaId}`);
}

export async function desinscribirBinomioAction(inscripcionId: string) {
  await requireSession();
  if (!inscripcionId) throw new Error("Falta el identificador de la inscripción.");

  const inscripcion = await prisma.inscripcion.delete({ where: { id: inscripcionId } });

  revalidatePath(`/backoffice/jornadas/${inscripcion.jornadaId}`);
}
