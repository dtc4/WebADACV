/**
 * Datos de ejemplo para desarrollo local. Ejecutar con `npm run db:seed`
 * (requiere que `npm run db:push` se haya ejecutado antes para crear el
 * esquema en la base de datos apuntada por DATABASE_URL).
 *
 * Usa rutas RELATIVAS (no el alias "@/...") a propósito: este script lo
 * ejecuta `tsx` directamente, fuera del bundler de Next.js, que es quien
 * resuelve normalmente ese alias.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { calcularResultado } from "../src/lib/rules/engine";
import { BANDAS_CALIFICACION_OFICIALES } from "../src/lib/rules/types";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("Sembrando datos de ejemplo…");

  // --- Usuario de backoffice -------------------------------------------------
  const email = "secretaria@adacv.es";
  const passwordPlano = "adacv2026";
  await prisma.usuario.upsert({
    where: { email },
    create: {
      email,
      nombre: "Secretaría ADACV",
      rol: "ADMIN",
      passwordHash: hashPassword(passwordPlano),
    },
    update: {},
  });

  // --- Temporada + reglas ------------------------------------------------------
  const temporada = await prisma.temporada.upsert({
    where: { nombre: "2025/2026" },
    create: {
      nombre: "2025/2026",
      fechaInicio: new Date("2025-09-01"),
      fechaFin: new Date("2026-08-31"),
      activa: true,
    },
    update: { activa: true },
  });

  const modalidadesConReglas = ["AGILITY_STANDARD", "JUMPING", "STEEPLECHASE"] as const;
  for (const modalidad of modalidadesConReglas) {
    await prisma.reglaModalidad.upsert({
      where: { temporadaId_modalidad: { temporadaId: temporada.id, modalidad } },
      create: {
        temporadaId: temporada.id,
        modalidad,
        penalizacionFalta: 5,
        penalizacionRehuse: 5,
        penalizacionPorSegundo: 1,
        penalizacionEliminacion: 50,
        penalizacionNoPresentado: 75,
        rehusesParaEliminar: 3,
        trmFactorMin: 1.5,
        trmFactorMax: 2.0,
        bandasCalificacion: BANDAS_CALIFICACION_OFICIALES as unknown as Prisma.InputJsonValue,
      },
      update: {},
    });
  }

  // --- Clubes y jueces ----------------------------------------------------------
  const [clubTorrent, clubValencia, clubCastello] = await Promise.all([
    prisma.club.upsert({ where: { id: "club-torrent" }, create: { id: "club-torrent", nombre: "Club Agility Torrent", poblacion: "Torrent", provincia: "Valencia" }, update: {} }),
    prisma.club.upsert({ where: { id: "club-valencia" }, create: { id: "club-valencia", nombre: "Club Canino Valencia", poblacion: "Valencia", provincia: "Valencia" }, update: {} }),
    prisma.club.upsert({ where: { id: "club-castello" }, create: { id: "club-castello", nombre: "Agility Castelló", poblacion: "Castellón", provincia: "Castellón" }, update: {} }),
  ]);

  const juezPrincipal = await prisma.juez.upsert({
    where: { id: "juez-1" },
    create: { id: "juez-1", nombre: "María Ferrer", licencia: "J-014" },
    update: {},
  });
  await prisma.juez.upsert({
    where: { id: "juez-2" },
    create: { id: "juez-2", nombre: "Josep Llàcer", licencia: "J-022" },
    update: {},
  });

  // --- Guías, perros y binomios ---------------------------------------------------
  type BinomioSeed = {
    id: string;
    guiaNombre: string;
    guiaApellidos: string;
    perroNombre: string;
    talla: "MINI1" | "MINI2" | "MEDIA" | "MAXI" | "LARGE";
    club: string;
    nivel: "NIVEL_II" | "NIVEL_III" | "PERFORMANCE";
  };

  const binomiosSeed: BinomioSeed[] = [
    { id: "bin-1", guiaNombre: "Laura", guiaApellidos: "Gimeno", perroNombre: "Rayo", talla: "MEDIA", club: clubTorrent.id, nivel: "NIVEL_III" },
    { id: "bin-2", guiaNombre: "Carlos", guiaApellidos: "Peris", perroNombre: "Nube", talla: "MEDIA", club: clubValencia.id, nivel: "NIVEL_III" },
    { id: "bin-3", guiaNombre: "Marta", guiaApellidos: "Soler", perroNombre: "Kira", talla: "MEDIA", club: clubTorrent.id, nivel: "NIVEL_III" },
    { id: "bin-4", guiaNombre: "David", guiaApellidos: "Ibáñez", perroNombre: "Trueno", talla: "MEDIA", club: clubCastello.id, nivel: "NIVEL_III" },
    { id: "bin-5", guiaNombre: "Ana", guiaApellidos: "Roig", perroNombre: "Luna", talla: "MEDIA", club: clubValencia.id, nivel: "NIVEL_III" },
    { id: "bin-6", guiaNombre: "Pau", guiaApellidos: "Martí", perroNombre: "Flash", talla: "MEDIA", club: clubTorrent.id, nivel: "NIVEL_III" },
    { id: "bin-7", guiaNombre: "Elena", guiaApellidos: "Vidal", perroNombre: "Chispa", talla: "MINI1", club: clubValencia.id, nivel: "NIVEL_II" },
    { id: "bin-8", guiaNombre: "Jordi", guiaApellidos: "Bru", perroNombre: "Tornado", talla: "MINI1", club: clubCastello.id, nivel: "NIVEL_II" },
  ];

  const binomios: Record<string, { id: string }> = {};

  for (const b of binomiosSeed) {
    const guia = await prisma.guia.upsert({
      where: { id: `guia-${b.id}` },
      create: { id: `guia-${b.id}`, nombre: b.guiaNombre, apellidos: b.guiaApellidos, clubId: b.club },
      update: {},
    });
    const perro = await prisma.perro.upsert({
      where: { id: `perro-${b.id}` },
      create: { id: `perro-${b.id}`, nombre: b.perroNombre, talla: b.talla },
      update: {},
    });
    const binomio = await prisma.binomio.upsert({
      where: { id: b.id },
      create: { id: b.id, guiaId: guia.id, perroId: perro.id, clubId: b.club },
      update: {},
    });
    await prisma.binomioTemporada.upsert({
      where: { binomioId_temporadaId: { binomioId: binomio.id, temporadaId: temporada.id } },
      create: { binomioId: binomio.id, temporadaId: temporada.id, nivel: b.nivel, pruebasDisputadas: 1 },
      update: {},
    });
    binomios[b.id] = binomio;
  }

  // --- Jornada publicada, con competición y resultados en todas las bandas -------
  const jornadaPublicada = await prisma.jornada.upsert({
    where: { id: "jornada-publicada-1" },
    create: {
      id: "jornada-publicada-1",
      temporadaId: temporada.id,
      clubId: clubTorrent.id,
      juezId: juezPrincipal.id,
      nombre: "2ª Jornada Nivel III — Torrent",
      fecha: new Date("2026-02-15"),
      lugar: "Polideportivo Municipal, Torrent",
      descripcion: "Segunda jornada de la temporada, Agility Standard Nivel III talla Media.",
      estado: "PUBLICADA",
    },
    update: {},
  });

  const competicionParams = { longitudM: 150, velocidadMs: 3.0, tiempoParadaMesaS: 0, trmFactor: 1.5 };
  const competicion = await prisma.competicion.upsert({
    where: { id: "comp-publicada-1" },
    create: {
      id: "comp-publicada-1",
      jornadaId: jornadaPublicada.id,
      modalidad: "AGILITY_STANDARD",
      nivel: "NIVEL_III",
      talla: "MEDIA",
      manga: 1,
      juezId: juezPrincipal.id,
      ...competicionParams,
    },
    update: {},
  });

  const regla = {
    modalidad: "AGILITY_STANDARD" as const,
    penalizacionFalta: 5,
    penalizacionRehuse: 5,
    penalizacionPorSegundo: 1,
    penalizacionEliminacion: 50,
    penalizacionNoPresentado: 75,
    rehusesParaEliminar: 3,
    trmFactorMin: 1.5,
    trmFactorMax: 2.0,
    bandasCalificacion: BANDAS_CALIFICACION_OFICIALES,
  };

  // Datos crudos elegidos a mano para cubrir las 6 calificaciones oficiales
  // (ver /docs, sección de reglamento): TRS = 150/3.0 = 50s.
  const resultadosSeed: {
    binomioId: string;
    dorsal: number;
    faltas: number;
    rehuses: number;
    tiempoS: number;
    eliminadoManual?: boolean;
  }[] = [
    { binomioId: "bin-1", dorsal: 1, faltas: 0, rehuses: 0, tiempoS: 50 }, // Excelente (0)
    { binomioId: "bin-2", dorsal: 2, faltas: 1, rehuses: 0, tiempoS: 53 }, // Muy Bueno (8)
    { binomioId: "bin-3", dorsal: 3, faltas: 2, rehuses: 0, tiempoS: 52 }, // Bueno (12)
    { binomioId: "bin-4", dorsal: 4, faltas: 3, rehuses: 0, tiempoS: 53 }, // Suficiente (18)
    { binomioId: "bin-5", dorsal: 5, faltas: 6, rehuses: 0, tiempoS: 50 }, // No Calificado (30)
    { binomioId: "bin-6", dorsal: 6, faltas: 0, rehuses: 3, tiempoS: 55 }, // Eliminado (3er rehúse)
  ];

  for (const r of resultadosSeed) {
    const calculado = calcularResultado(
      "AGILITY_STANDARD",
      {
        faltas: r.faltas,
        rehuses: r.rehuses,
        tiempoS: r.tiempoS,
        eliminadoManual: r.eliminadoManual ?? false,
        noPresentado: false,
      },
      competicionParams,
      regla
    );

    await prisma.resultado.upsert({
      where: { competicionId_binomioId: { competicionId: competicion.id, binomioId: r.binomioId } },
      create: {
        competicionId: competicion.id,
        binomioId: r.binomioId,
        dorsal: r.dorsal,
        tiempoS: r.tiempoS,
        faltas: r.faltas,
        rehuses: r.rehuses,
        eliminado: calculado.eliminado,
        motivoEliminacion: calculado.motivoEliminacion,
        penalizacionTiempo: calculado.penalizacionTiempo,
        penalizacionTotal: calculado.penalizacionTotal,
        calificacion: calculado.calificacion,
        publicado: true,
      },
      update: {},
    });
  }

  // --- Jornada en borrador (próxima, sin publicar) --------------------------------
  await prisma.jornada.upsert({
    where: { id: "jornada-borrador-1" },
    create: {
      id: "jornada-borrador-1",
      temporadaId: temporada.id,
      clubId: clubValencia.id,
      juezId: juezPrincipal.id,
      nombre: "3ª Jornada Nivel II/III — Valencia",
      fecha: new Date("2026-04-19"),
      lugar: "Ciudad Deportiva, Valencia",
      estado: "BORRADOR",
    },
    update: {},
  });

  // --- Clasificaciones de temporada (estructura vacía, lista para recalcular) -----
  for (const nivel of ["NIVEL_II", "NIVEL_III", "PERFORMANCE"] as const) {
    for (const categoria of ["MINI", "MEDIA", "MAXI", "LARGE"] as const) {
      await prisma.clasificacionTemporada.upsert({
        where: { temporadaId_nivel_categoria: { temporadaId: temporada.id, nivel, categoria } },
        create: { temporadaId: temporada.id, nivel, categoria },
        update: {},
      });
    }
  }

  // --- Galería de ejemplo (imágenes de relleno, sustituir por fotos reales) -------
  const galeria = await prisma.galeria.upsert({
    where: { id: "galeria-1" },
    create: {
      id: "galeria-1",
      jornadaId: jornadaPublicada.id,
      titulo: "Fotos — 2ª Jornada Nivel III",
      fecha: jornadaPublicada.fecha,
      descripcion: "Imágenes de ejemplo (placeholder) — sustituir por fotos reales de la jornada.",
    },
    update: {},
  });
  for (let i = 1; i <= 3; i++) {
    await prisma.foto.upsert({
      where: { id: `foto-${i}` },
      create: {
        id: `foto-${i}`,
        galeriaId: galeria.id,
        url: `https://picsum.photos/seed/adacv-${i}/800/600`,
        orden: i,
      },
      update: {},
    });
  }

  // --- Sponsors, noticias y documentos de ejemplo ---------------------------------
  await prisma.sponsor.upsert({
    where: { id: "sponsor-1" },
    create: { id: "sponsor-1", nombre: "Pienso Sano", logoUrl: "https://picsum.photos/seed/sponsor1/200/80", nivel: "Oro", orden: 1 },
    update: {},
  });
  await prisma.sponsor.upsert({
    where: { id: "sponsor-2" },
    create: { id: "sponsor-2", nombre: "Clínica Veterinaria Torrent", logoUrl: "https://picsum.photos/seed/sponsor2/200/80", nivel: "Plata", orden: 2 },
    update: {},
  });

  await prisma.noticia.upsert({
    where: { slug: "abierta-inscripcion-3a-jornada" },
    create: {
      slug: "abierta-inscripcion-3a-jornada",
      titulo: "Abierta la inscripción para la 3ª Jornada",
      resumen: "Ya puedes inscribir a tu binomio para la próxima jornada en Valencia.",
      contenido: "Ya puedes inscribir a tu binomio para la próxima jornada en Valencia. El plazo de inscripción cierra una semana antes de la prueba.",
      autor: "Secretaría ADACV",
    },
    update: {},
  });

  await prisma.documento.upsert({
    where: { id: "doc-reglamento-2025" },
    create: {
      id: "doc-reglamento-2025",
      titulo: "Reglamento de Agility ADACV (agosto 2025)",
      categoria: "reglamento",
      url: "/documentos/ReglamentoADACV2025.pdf",
    },
    update: {},
  });

  console.log("Listo. Usuario de backoffice:");
  console.log(`  Email: ${email}`);
  console.log(`  Contraseña: ${passwordPlano}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
