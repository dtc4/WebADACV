"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Talla } from "@prisma/client";

function requireSession() {
  return getSession();
}

// ---------------------------------------------------------------------------
// Club
// ---------------------------------------------------------------------------

export async function crearClubAction(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const poblacion = String(formData.get("poblacion") ?? "").trim() || null;
  const provincia = String(formData.get("provincia") ?? "").trim() || null;
  const web = String(formData.get("web") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;

  if (!nombre) throw new Error("Falta el nombre del club.");

  const club = await prisma.club.create({
    data: { nombre, poblacion, provincia, web, logoUrl },
  });

  revalidatePath("/backoffice/clubes");
  redirect(`/backoffice/clubes/${club.id}/editar`);
}

export async function actualizarClubAction(formData: FormData) {
  await requireSession();
  const clubId = String(formData.get("clubId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const poblacion = String(formData.get("poblacion") ?? "").trim() || null;
  const provincia = String(formData.get("provincia") ?? "").trim() || null;
  const web = String(formData.get("web") ?? "").trim() || null;
  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const activo = formData.get("activo") === "on";

  if (!clubId || !nombre) throw new Error("Faltan campos obligatorios.");

  await prisma.club.update({
    where: { id: clubId },
    data: { nombre, poblacion, provincia, web, logoUrl, activo },
  });

  revalidatePath("/backoffice/clubes");
  revalidatePath(`/backoffice/clubes/${clubId}/editar`);
  redirect("/backoffice/clubes");
}

/** Borrar un club nunca borra guías, binomios ni jornadas: al no tener
 * onDelete: Cascade en el esquema, esas fichas simplemente se quedan sin
 * club asociado (clubId a null). Es una operación segura. */
export async function eliminarClubAction(formData: FormData) {
  await requireSession();
  const clubId = String(formData.get("clubId") ?? "");
  if (!clubId) throw new Error("Falta el identificador del club.");

  await prisma.club.delete({ where: { id: clubId } });

  revalidatePath("/backoffice/clubes");
  redirect("/backoffice/clubes");
}

// ---------------------------------------------------------------------------
// Juez
// ---------------------------------------------------------------------------

export async function crearJuezAction(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const licencia = String(formData.get("licencia") ?? "").trim() || null;
  const fotoUrl = String(formData.get("fotoUrl") ?? "").trim() || null;

  if (!nombre) throw new Error("Falta el nombre del juez.");

  const juez = await prisma.juez.create({ data: { nombre, licencia, fotoUrl } });

  revalidatePath("/backoffice/jueces");
  redirect(`/backoffice/jueces/${juez.id}/editar`);
}

export async function actualizarJuezAction(formData: FormData) {
  await requireSession();
  const juezId = String(formData.get("juezId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const licencia = String(formData.get("licencia") ?? "").trim() || null;
  const fotoUrl = String(formData.get("fotoUrl") ?? "").trim() || null;
  const activo = formData.get("activo") === "on";

  if (!juezId || !nombre) throw new Error("Faltan campos obligatorios.");

  await prisma.juez.update({ where: { id: juezId }, data: { nombre, licencia, fotoUrl, activo } });

  revalidatePath("/backoffice/jueces");
  revalidatePath(`/backoffice/jueces/${juezId}/editar`);
  redirect("/backoffice/jueces");
}

/** Igual que con el club: borrar un juez deja sin juez asignado a sus
 * jornadas y competiciones pasadas (no las borra). */
export async function eliminarJuezAction(formData: FormData) {
  await requireSession();
  const juezId = String(formData.get("juezId") ?? "");
  if (!juezId) throw new Error("Falta el identificador del juez.");

  await prisma.juez.delete({ where: { id: juezId } });

  revalidatePath("/backoffice/jueces");
  redirect("/backoffice/jueces");
}

// ---------------------------------------------------------------------------
// Guía
// ---------------------------------------------------------------------------

export async function crearGuiaAction(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const licencia = String(formData.get("licencia") ?? "").trim() || null;
  const clubId = String(formData.get("clubId") ?? "") || null;

  if (!nombre || !apellidos) throw new Error("Faltan campos obligatorios: nombre y apellidos.");

  const guia = await prisma.guia.create({ data: { nombre, apellidos, licencia, clubId } });

  revalidatePath("/backoffice/guias");
  redirect(`/backoffice/guias/${guia.id}/editar`);
}

export async function actualizarGuiaAction(formData: FormData) {
  await requireSession();
  const guiaId = String(formData.get("guiaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const licencia = String(formData.get("licencia") ?? "").trim() || null;
  const clubId = String(formData.get("clubId") ?? "") || null;

  if (!guiaId || !nombre || !apellidos) throw new Error("Faltan campos obligatorios.");

  await prisma.guia.update({ where: { id: guiaId }, data: { nombre, apellidos, licencia, clubId } });

  revalidatePath("/backoffice/guias");
  revalidatePath(`/backoffice/guias/${guiaId}/editar`);
  redirect("/backoffice/guias");
}

/** A diferencia de club/juez, un guía SÍ es obligatorio en cada binomio
 * (Binomio.guiaId no admite null), así que borrar un guía con binomios
 * asociados fallaría contra la base de datos. Se comprueba antes para dar
 * un mensaje claro en vez de un error técnico de Prisma. */
export async function eliminarGuiaAction(formData: FormData) {
  await requireSession();
  const guiaId = String(formData.get("guiaId") ?? "");
  if (!guiaId) throw new Error("Falta el identificador del guía.");

  const binomios = await prisma.binomio.count({ where: { guiaId } });
  if (binomios > 0) {
    throw new Error(
      `Este guía tiene ${binomios} binomio(s) asociado(s). Bórralos o reasígnalos a otro guía antes de borrar la ficha.`
    );
  }

  await prisma.guia.delete({ where: { id: guiaId } });

  revalidatePath("/backoffice/guias");
  redirect("/backoffice/guias");
}

// ---------------------------------------------------------------------------
// Perro
// ---------------------------------------------------------------------------

export async function crearPerroAction(formData: FormData) {
  await requireSession();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const raza = String(formData.get("raza") ?? "").trim() || null;
  const tallaCm = formData.get("tallaCm") ? Number(formData.get("tallaCm")) : null;
  const talla = String(formData.get("talla") ?? "") as Talla;
  const fechaNacimiento = String(formData.get("fechaNacimiento") ?? "");

  if (!nombre || !talla) throw new Error("Faltan campos obligatorios: nombre y talla.");

  const perro = await prisma.perro.create({
    data: {
      nombre,
      raza,
      tallaCm,
      talla,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
    },
  });

  revalidatePath("/backoffice/perros");
  redirect(`/backoffice/perros/${perro.id}/editar`);
}

export async function actualizarPerroAction(formData: FormData) {
  await requireSession();
  const perroId = String(formData.get("perroId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const raza = String(formData.get("raza") ?? "").trim() || null;
  const tallaCm = formData.get("tallaCm") ? Number(formData.get("tallaCm")) : null;
  const talla = String(formData.get("talla") ?? "") as Talla;
  const fechaNacimiento = String(formData.get("fechaNacimiento") ?? "");

  if (!perroId || !nombre || !talla) throw new Error("Faltan campos obligatorios.");

  await prisma.perro.update({
    where: { id: perroId },
    data: {
      nombre,
      raza,
      tallaCm,
      talla,
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
    },
  });

  revalidatePath("/backoffice/perros");
  revalidatePath(`/backoffice/perros/${perroId}/editar`);
  redirect("/backoffice/perros");
}

/** Igual que con el guía: Binomio.perroId es obligatorio, así que no se
 * puede borrar un perro con binomios asociados. */
export async function eliminarPerroAction(formData: FormData) {
  await requireSession();
  const perroId = String(formData.get("perroId") ?? "");
  if (!perroId) throw new Error("Falta el identificador del perro.");

  const binomios = await prisma.binomio.count({ where: { perroId } });
  if (binomios > 0) {
    throw new Error(
      `Este perro tiene ${binomios} binomio(s) asociado(s). Bórralos o reasígnalos antes de borrar la ficha.`
    );
  }

  await prisma.perro.delete({ where: { id: perroId } });

  revalidatePath("/backoffice/perros");
  redirect("/backoffice/perros");
}

// ---------------------------------------------------------------------------
// Binomio (Guía + Perro + Club)
// ---------------------------------------------------------------------------

export async function crearBinomioAction(formData: FormData) {
  await requireSession();
  const guiaId = String(formData.get("guiaId") ?? "");
  const perroId = String(formData.get("perroId") ?? "");
  const clubId = String(formData.get("clubId") ?? "") || null;

  if (!guiaId || !perroId) throw new Error("Selecciona un guía y un perro.");

  const existente = await prisma.binomio.findUnique({
    where: { guiaId_perroId: { guiaId, perroId } },
  });
  if (existente) {
    throw new Error("Ya existe un binomio con ese guía y ese perro.");
  }

  const binomio = await prisma.binomio.create({ data: { guiaId, perroId, clubId } });

  revalidatePath("/backoffice/binomios");
  redirect(`/backoffice/binomios/${binomio.id}/editar`);
}

export async function actualizarBinomioAction(formData: FormData) {
  await requireSession();
  const binomioId = String(formData.get("binomioId") ?? "");
  const clubId = String(formData.get("clubId") ?? "") || null;
  const activo = formData.get("activo") === "on";

  if (!binomioId) throw new Error("Falta el identificador del binomio.");

  await prisma.binomio.update({ where: { id: binomioId }, data: { clubId, activo } });

  revalidatePath("/backoffice/binomios");
  revalidatePath(`/backoffice/binomios/${binomioId}/editar`);
  redirect("/backoffice/binomios");
}

/** Un binomio con resultados o entradas de clasificación NO se puede borrar
 * (Resultado.binomioId y ClasificacionEntrada.binomioId son obligatorios):
 * borrarlo significaría perder ese histórico de competición. En ese caso
 * se recomienda desactivarlo en vez de borrarlo. */
export async function eliminarBinomioAction(formData: FormData) {
  await requireSession();
  const binomioId = String(formData.get("binomioId") ?? "");
  if (!binomioId) throw new Error("Falta el identificador del binomio.");

  const [resultados, clasificaciones, temporadas] = await Promise.all([
    prisma.resultado.count({ where: { binomioId } }),
    prisma.clasificacionEntrada.count({ where: { binomioId } }),
    prisma.binomioTemporada.count({ where: { binomioId } }),
  ]);

  if (resultados > 0 || clasificaciones > 0 || temporadas > 0) {
    throw new Error(
      "Este binomio ya tiene resultados o clasificaciones registrados y no se puede borrar sin perder ese histórico. Desactívalo en su lugar (así deja de aparecer para nuevos resultados, pero conserva los datos)."
    );
  }

  await prisma.binomio.delete({ where: { id: binomioId } });

  revalidatePath("/backoffice/binomios");
  redirect("/backoffice/binomios");
}
