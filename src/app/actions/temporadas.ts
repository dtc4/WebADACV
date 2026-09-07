"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BANDAS_CALIFICACION_OFICIALES } from "@/lib/rules/types";
import { asegurarClasificacionesTemporadaAction } from "@/app/actions/clasificaciones";
import type { Prisma } from "@prisma/client";

function requireSession() {
  return getSession();
}

// Modalidades para las que el motor de reglas ya está implementado (ver
// src/lib/rules/modalidades/estandar.ts). Las demás (Jumping Relevos, K.O.,
// Dédalo) no tienen todavía una fórmula de penalización confirmada por el
// reglamento, así que no se les crea una ReglaModalidad por defecto.
const MODALIDADES_CON_REGLAS = ["AGILITY_STANDARD", "JUMPING", "STEEPLECHASE"] as const;

/**
 * Crea una Temporada y, en el mismo paso:
 *  - genera automáticamente los N "huecos" de Jornada (Jornada 1..N) que
 *    secretaría eligirá y rellenará más adelante desde "Nueva jornada";
 *  - crea las ReglaModalidad por defecto (mismos valores que el reglamento
 *    vigente en la temporada de ejemplo) para que ya se puedan guardar
 *    resultados sin tener que configurar el motor de reglas a mano;
 *  - crea los "huecos" de ClasificacionTemporada (3 niveles × 4 categorías)
 *    para que la sección de clasificaciones no aparezca vacía.
 *
 * Todo dentro de una única transacción: o se crea la temporada completa y
 * lista para usarse, o no se crea nada.
 */
export async function crearTemporadaAction(formData: FormData) {
  const session = await requireSession();
  if (!session) redirect("/backoffice/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const fechaFin = String(formData.get("fechaFin") ?? "");
  const numeroJornadas = Number(formData.get("numeroJornadas") ?? 0);
  const marcarActiva = formData.get("marcarActiva") === "on";

  if (!nombre || !fechaInicio || !fechaFin) {
    throw new Error("Faltan campos obligatorios: nombre, fecha de inicio y fecha de fin.");
  }
  if (!Number.isInteger(numeroJornadas) || numeroJornadas < 1 || numeroJornadas > 30) {
    throw new Error("El número de jornadas debe ser un entero entre 1 y 30.");
  }
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }

  const temporadaId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (marcarActiva) {
      await tx.temporada.updateMany({ where: { activa: true }, data: { activa: false } });
    }

    const temporada = await tx.temporada.create({
      data: {
        nombre,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        numeroJornadas,
        activa: marcarActiva,
      },
    });

    // Huecos de jornada, sin configurar todavía: la fecha de inicio se usa
    // solo como valor provisional (no se muestra como fecha real mientras
    // configurada = false) hasta que secretaría defina la fecha de cada una.
    await tx.jornada.createMany({
      data: Array.from({ length: numeroJornadas }, (_, i) => ({
        temporadaId: temporada.id,
        numero: i + 1,
        nombre: `Jornada ${i + 1}`,
        fecha: new Date(fechaInicio),
        configurada: false,
      })),
    });

    for (const modalidad of MODALIDADES_CON_REGLAS) {
      await tx.reglaModalidad.upsert({
        where: { temporadaId_modalidad: { temporadaId: temporada.id, modalidad } },
        create: {
          temporadaId: temporada.id,
          modalidad,
          penalizacionFalta: 5,
          penalizacionRehuse: 5,
          penalizacionPorSegundo: 1,
          penalizacionEliminacion: 50,
          rehusesParaEliminar: 3,
          trmFactorMin: 1.5,
          trmFactorMax: 2.0,
          bandasCalificacion: BANDAS_CALIFICACION_OFICIALES as unknown as Prisma.InputJsonValue,
        },
        update: {},
      });
    }

    return temporada.id;
  });

  await asegurarClasificacionesTemporadaAction(temporadaId);

  revalidatePath("/backoffice/temporadas");
  revalidatePath("/backoffice/dashboard");
  redirect(`/backoffice/temporadas/${temporadaId}`);
}

/** Añade un hueco de jornada adicional a una temporada ya creada, para
 * eventos fuera del plan original (p. ej. una jornada de recuperación tras
 * una cancelación). Se numera a continuación de la última jornada existente. */
export async function agregarJornadaExtraAction(formData: FormData) {
  await requireSession();
  const temporadaId = String(formData.get("temporadaId") ?? "");
  if (!temporadaId) throw new Error("Falta el identificador de la temporada.");

  const temporada = await prisma.temporada.findUniqueOrThrow({ where: { id: temporadaId } });
  // Se usa un agregado MAX en vez de un findFirst+orderBy porque en SQL el
  // ordenamiento DESC coloca los NULL primero: si la temporada tiene alguna
  // jornada antigua sin número (numero = null, p. ej. de antes de esta
  // función), un orderBy nos habría dado esa como "última" y calculado mal
  // el siguiente número. MAX() ignora los NULL correctamente.
  const { _max } = await prisma.jornada.aggregate({
    where: { temporadaId },
    _max: { numero: true },
  });
  const siguienteNumero = (_max.numero ?? 0) + 1;

  const jornada = await prisma.jornada.create({
    data: {
      temporadaId,
      numero: siguienteNumero,
      nombre: `Jornada ${siguienteNumero}`,
      fecha: temporada.fechaInicio,
      configurada: false,
    },
  });

  revalidatePath("/backoffice/jornadas/nueva");
  redirect(`/backoffice/jornadas/${jornada.id}`);
}

export async function activarTemporadaAction(formData: FormData) {
  await requireSession();
  const temporadaId = String(formData.get("temporadaId") ?? "");
  if (!temporadaId) throw new Error("Falta el identificador de la temporada.");

  await prisma.$transaction([
    prisma.temporada.updateMany({ where: { activa: true }, data: { activa: false } }),
    prisma.temporada.update({ where: { id: temporadaId }, data: { activa: true } }),
  ]);

  revalidatePath("/backoffice/temporadas");
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/");
  revalidatePath("/calendario");
}

/** Edita el nombre y las fechas de una temporada. El número de jornadas no
 * se toca aquí a propósito: los huecos ya generados se gestionan añadiendo
 * (agregarJornadaExtraAction) o borrando (eliminarJornadaAction) jornadas
 * una a una, para no arriesgarse a borrar datos reales al "reducir" un
 * número en un formulario. */
export async function actualizarTemporadaAction(formData: FormData) {
  await requireSession();
  const temporadaId = String(formData.get("temporadaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const fechaFin = String(formData.get("fechaFin") ?? "");

  if (!temporadaId || !nombre || !fechaInicio || !fechaFin) {
    throw new Error("Faltan campos obligatorios: nombre, fecha de inicio y fecha de fin.");
  }
  if (new Date(fechaFin) < new Date(fechaInicio)) {
    throw new Error("La fecha de fin no puede ser anterior a la fecha de inicio.");
  }

  await prisma.temporada.update({
    where: { id: temporadaId },
    data: { nombre, fechaInicio: new Date(fechaInicio), fechaFin: new Date(fechaFin) },
  });

  revalidatePath("/backoffice/temporadas");
  revalidatePath(`/backoffice/temporadas/${temporadaId}`);
  revalidatePath("/backoffice/dashboard");
  redirect(`/backoffice/temporadas/${temporadaId}`);
}

/**
 * Borra una temporada completa: todas sus jornadas (con sus competiciones y
 * resultados), sus clasificaciones y sus fichas de binomio-temporada. Es
 * destructivo e irreversible, así que se exige escribir el nombre exacto de
 * la temporada para confirmar (en vez de una simple casilla), y se hace
 * todo dentro de una transacción: o se borra todo, o no se borra nada.
 */
export async function eliminarTemporadaAction(formData: FormData) {
  await requireSession();
  const temporadaId = String(formData.get("temporadaId") ?? "");
  const confirmacion = String(formData.get("confirmacionNombre") ?? "").trim();
  if (!temporadaId) throw new Error("Falta el identificador de la temporada.");

  const temporada = await prisma.temporada.findUniqueOrThrow({ where: { id: temporadaId } });
  if (confirmacion !== temporada.nombre) {
    throw new Error(
      `Para borrar la temporada escribe su nombre exactamente: "${temporada.nombre}".`
    );
  }

  await prisma.$transaction([
    // competiciones y resultados de cada jornada se borran en cascada al
    // borrar la jornada (ver onDelete: Cascade en el esquema).
    prisma.jornada.deleteMany({ where: { temporadaId } }),
    // las entradas de cada clasificación se borran en cascada al borrar la
    // ClasificacionTemporada.
    prisma.clasificacionTemporada.deleteMany({ where: { temporadaId } }),
    prisma.binomioTemporada.deleteMany({ where: { temporadaId } }),
    // las ReglaModalidad de la temporada se borran en cascada al borrar la
    // temporada (ver onDelete: Cascade en el esquema).
    prisma.temporada.delete({ where: { id: temporadaId } }),
  ]);

  revalidatePath("/backoffice/temporadas");
  revalidatePath("/backoffice/dashboard");
  revalidatePath("/");
  revalidatePath("/calendario");
  redirect("/backoffice/temporadas");
}
