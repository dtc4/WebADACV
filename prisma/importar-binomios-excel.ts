/**
 * Importa a la base de datos los binomios reales recogidos en el Excel de
 * "Solicitud de tarjeta deportiva ADACV" (respuestas de un formulario de
 * Google, exportadas a .xlsx).
 *
 * El propio Excel NO se lee aquí: ya se ha limpiado y convertido de
 * antemano a `prisma/datos-import-binomios.json` (fechas normalizadas,
 * teléfonos/microchips como texto en vez de números con coma flotante,
 * provincias con mayúsculas/tildes uniformadas, y las inscripciones
 * duplicadas de una misma persona+perro ya reducidas a una sola, quedándose
 * con los datos más recientes). Así este script no necesita ninguna
 * librería nueva para leer Excel: solo usa `@prisma/client`, igual que
 * `seed.ts` y `reset-datos-demo.ts`.
 *
 * Qué crea (o reutiliza si ya existe):
 *   - Club  (busca por nombre, sin distinguir mayúsculas; lo crea si no existe)
 *   - Guia  (busca por email, sin distinguir mayúsculas; si ya existe solo
 *            rellena los campos que tuviera vacíos — nunca pisa datos que
 *            secretaría ya haya introducido a mano)
 *   - Perro (busca por microchip cuando el excel lo trae; si no hay
 *            microchip, se crea siempre como perro nuevo, porque no hay
 *            forma fiable de saber si ya existe)
 *   - Binomio (Guía + Perro + Club; busca por la pareja guía+perro, la crea
 *              si no existe)
 *
 * Qué NO crea (a propósito, queda para más adelante):
 *   - No asigna nivel a ningún binomio en ninguna temporada (BinomioTemporada).
 *     El excel trae una columna "Nivel" (2, 3, o "Prueba de acceso"), pero
 *     decidir en qué temporada activa y con qué nivel exacto se da de alta
 *     cada binomio es una decisión de secretaría, no algo que este script
 *     deba adivinar. El nivel de origen queda solo en el informe de abajo,
 *     como referencia.
 *   - Los 3 perros marcados como "Medir" en el excel (talla aún sin
 *     determinar) se omiten por completo — no se puede crear un Perro sin
 *     talla (campo obligatorio). Salen listados al final para darlos de
 *     alta a mano en cuanto se les mida.
 *
 * Es una operación real sobre la base de datos (no borra nada, pero sí crea
 * filas), así que, igual que reset-datos-demo.ts, no hace nada si se
 * ejecuta sin más: hay que pasarle expresamente la palabra "confirmar".
 *
 *   npx tsx prisma/importar-binomios-excel.ts confirmar
 *
 * Usa rutas relativas (no el alias "@/...") a propósito, igual que
 * seed.ts y reset-datos-demo.ts: este script lo ejecuta `tsx` directamente,
 * fuera del bundler de Next.js.
 */
import { PrismaClient } from "@prisma/client";
import datosImport from "./datos-import-binomios.json";

const prisma = new PrismaClient();

type RegistroImport = {
  fila_excel: number;
  guia: {
    nombre: string | null;
    apellidos: string | null;
    email: string | null;
    telefono: string | null;
    dni: string | null;
    fechaNacimiento: string | null;
    domicilio: string | null;
    poblacion: string | null;
    provincia: string | null;
    codigoPostal: string | null;
  };
  perro: {
    nombre: string | null;
    raza: string | null;
    microchip: string | null;
    fechaNacimiento: string | null;
    sexo: "MACHO" | "HEMBRA" | null;
    talla: "MINI1" | "MINI2" | "MEDIA" | "MAXI" | "LARGE" | null;
    performance: boolean;
  };
  club: string | null;
  nivel: string | null;
  nivel_original: string | null;
  warnings: string[];
};

const registros = datosImport as RegistroImport[];

async function buscarOCrearClub(nombre: string | null) {
  if (!nombre) return null;
  const existente = await prisma.club.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });
  if (existente) return existente;
  return prisma.club.create({ data: { nombre } });
}

async function buscarOCrearGuia(g: RegistroImport["guia"], clubId: string | null) {
  if (!g.nombre || !g.apellidos) return null;

  const existente = g.email
    ? await prisma.guia.findFirst({ where: { email: { equals: g.email, mode: "insensitive" } } })
    : null;

  if (existente) {
    // No se pisan datos ya existentes: solo se rellenan los campos que
    // estuvieran vacíos, por si secretaría ya había tocado esta ficha.
    const actualizacion: Record<string, unknown> = {};
    if (!existente.telefono && g.telefono) actualizacion.telefono = g.telefono;
    if (!existente.dni && g.dni) actualizacion.dni = g.dni;
    if (!existente.fechaNacimiento && g.fechaNacimiento) actualizacion.fechaNacimiento = new Date(g.fechaNacimiento);
    if (!existente.domicilio && g.domicilio) actualizacion.domicilio = g.domicilio;
    if (!existente.poblacion && g.poblacion) actualizacion.poblacion = g.poblacion;
    if (!existente.provincia && g.provincia) actualizacion.provincia = g.provincia;
    if (!existente.codigoPostal && g.codigoPostal) actualizacion.codigoPostal = g.codigoPostal;
    if (!existente.clubId && clubId) actualizacion.clubId = clubId;
    if (Object.keys(actualizacion).length === 0) return existente;
    return prisma.guia.update({ where: { id: existente.id }, data: actualizacion });
  }

  return prisma.guia.create({
    data: {
      nombre: g.nombre,
      apellidos: g.apellidos,
      email: g.email,
      telefono: g.telefono,
      dni: g.dni,
      fechaNacimiento: g.fechaNacimiento ? new Date(g.fechaNacimiento) : null,
      domicilio: g.domicilio,
      poblacion: g.poblacion,
      provincia: g.provincia,
      codigoPostal: g.codigoPostal,
      clubId,
    },
  });
}

async function buscarOCrearPerro(p: RegistroImport["perro"]) {
  if (!p.nombre || !p.talla) return null;

  if (p.microchip) {
    const existente = await prisma.perro.findFirst({ where: { microchip: p.microchip } });
    if (existente) return existente;
  }

  return prisma.perro.create({
    data: {
      nombre: p.nombre,
      raza: p.raza,
      microchip: p.microchip,
      sexo: p.sexo,
      talla: p.talla,
      fechaNacimiento: p.fechaNacimiento ? new Date(p.fechaNacimiento) : null,
    },
  });
}

async function main() {
  const confirmado = process.argv.includes("confirmar");
  if (!confirmado) {
    console.log(
      `Este script va a importar ${registros.length} binomios (guía + perro) reales desde ` +
        "prisma/datos-import-binomios.json a la base de datos a la que apunte tu DATABASE_URL.\n" +
        "No borra nada, y si un guía o club ya existe, solo rellena los huecos que tuviera vacíos.\n\n" +
        "Si estás seguro, vuelve a ejecutar:\n" +
        "  npx tsx prisma/importar-binomios-excel.ts confirmar\n"
    );
    return;
  }

  let clubesCreados = 0;
  let guiasCreados = 0;
  let guiasActualizados = 0;
  let perrosCreados = 0;
  let perrosReutilizados = 0;
  let binomiosCreados = 0;
  let binomiosExistentes = 0;
  const omitidosPorTalla: RegistroImport[] = [];

  const clubesCache = new Map<string, string | null>();

  for (const r of registros) {
    if (!r.perro.talla) {
      omitidosPorTalla.push(r);
      continue;
    }

    let clubId: string | null;
    if (r.club && clubesCache.has(r.club)) {
      clubId = clubesCache.get(r.club)!;
    } else {
      const clubAntes = r.club ? await prisma.club.count({ where: { nombre: { equals: r.club, mode: "insensitive" } } }) : 0;
      const club = await buscarOCrearClub(r.club);
      clubId = club?.id ?? null;
      if (r.club) {
        clubesCache.set(r.club, clubId);
        if (clubAntes === 0 && club) clubesCreados++;
      }
    }

    const guiaAntes = r.guia.email
      ? await prisma.guia.count({ where: { email: { equals: r.guia.email, mode: "insensitive" } } })
      : 0;
    const guia = await buscarOCrearGuia(r.guia, clubId);
    if (!guia) {
      console.warn(`  ! Fila ${r.fila_excel}: faltan datos de guía, se omite.`);
      continue;
    }
    if (guiaAntes === 0) guiasCreados++;
    else guiasActualizados++;

    const perroAntes = r.perro.microchip
      ? await prisma.perro.count({ where: { microchip: r.perro.microchip } })
      : 0;
    const perro = await buscarOCrearPerro(r.perro);
    if (!perro) {
      console.warn(`  ! Fila ${r.fila_excel}: faltan datos de perro, se omite.`);
      continue;
    }
    if (perroAntes === 0) perrosCreados++;
    else perrosReutilizados++;

    const binomioExistente = await prisma.binomio.findUnique({
      where: { guiaId_perroId: { guiaId: guia.id, perroId: perro.id } },
    });
    if (binomioExistente) {
      binomiosExistentes++;
    } else {
      await prisma.binomio.create({
        data: { guiaId: guia.id, perroId: perro.id, clubId },
      });
      binomiosCreados++;
    }
  }

  console.log("\nImportación terminada:");
  console.log(`  - ${clubesCreados} club(es) nuevo(s)`);
  console.log(`  - ${guiasCreados} guía(s) nuevo(s), ${guiasActualizados} ya existían (se completaron huecos si los tenían)`);
  console.log(`  - ${perrosCreados} perro(s) nuevo(s), ${perrosReutilizados} ya existían (identificados por microchip)`);
  console.log(`  - ${binomiosCreados} binomio(s) nuevo(s), ${binomiosExistentes} ya existían`);

  if (omitidosPorTalla.length > 0) {
    console.log(
      `\n${omitidosPorTalla.length} perro(s) NO se han importado porque el excel no traía su talla ` +
        `todavía (columna "Medir") — dalos de alta a mano en cuanto se les mida:`
    );
    for (const r of omitidosPorTalla) {
      console.log(
        `  - Fila ${r.fila_excel}: ${r.guia.nombre} ${r.guia.apellidos} (${r.guia.email ?? "sin email"}) ` +
          `— perro "${r.perro.nombre}"`
      );
    }
  }

  console.log(
    "\nRecuerda: este script NO ha asignado nivel a ningún binomio en ninguna temporada. " +
      "El nivel que traía el excel (columna \"Nivel\") queda como referencia en " +
      "prisma/datos-import-binomios.json (campo \"nivel_original\") para cuando decidas en qué " +
      "temporada y con qué nivel das de alta a cada binomio."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
