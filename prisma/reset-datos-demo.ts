/**
 * Borra TODOS los datos de ejemplo creados por `npm run db:seed`
 * (temporada, jornadas, competiciones, resultados, clasificaciones, clubes,
 * jueces, guías, perros, binomios, noticias, patrocinadores y documentos),
 * para poder empezar a meter datos reales desde un backoffice limpio.
 *
 * NO borra la tabla de usuarios: tu cuenta de secretaría
 * (secretaria@adacv.es) se mantiene intacta para que sigas pudiendo entrar
 * al backoffice después de vaciar la base de datos.
 *
 * Es IRREVERSIBLE. Por eso no hace nada si lo ejecutas sin más: hay que
 * pasarle expresamente la palabra "confirmar".
 *
 *   npx tsx prisma/reset-datos-demo.ts confirmar
 *
 * Usa rutas relativas (no el alias "@/...") a propósito, igual que
 * prisma/seed.ts: este script lo ejecuta `tsx` directamente, fuera del
 * bundler de Next.js.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const confirmado = process.argv.includes("confirmar");
  if (!confirmado) {
    console.log(
      "Esto va a borrar TODOS los datos de ejemplo (temporadas, jornadas, resultados, " +
        "clubes, jueces, guías, perros, binomios, noticias, patrocinadores y documentos). " +
        "Tu usuario de acceso NO se toca.\n\n" +
        "Si estás seguro, vuelve a ejecutar:\n" +
        "  npx tsx prisma/reset-datos-demo.ts confirmar\n"
    );
    return;
  }

  console.log("Borrando datos de ejemplo...");

  // Orden pensado para respetar las relaciones obligatorias del esquema:
  // primero lo que depende de otra tabla, al final lo que no depende de nada.
  const resultado = await prisma.$transaction([
    prisma.resultado.deleteMany(),
    prisma.inscripcion.deleteMany(),
    prisma.foto.deleteMany(),
    prisma.clasificacionEntrada.deleteMany(),
    prisma.competicion.deleteMany(),
    prisma.galeria.deleteMany(),
    prisma.clasificacionTemporada.deleteMany(),
    prisma.binomioTemporada.deleteMany(),
    prisma.reglaModalidad.deleteMany(),
    prisma.jornada.deleteMany(),
    prisma.binomio.deleteMany(),
    prisma.temporada.deleteMany(),
    prisma.guia.deleteMany(),
    prisma.perro.deleteMany(),
    prisma.club.deleteMany(),
    prisma.juez.deleteMany(),
    prisma.noticia.deleteMany(),
    prisma.sponsor.deleteMany(),
    prisma.documento.deleteMany(),
  ]);

  const nombres = [
    "resultados",
    "inscripciones",
    "fotos",
    "entradas de clasificación",
    "competiciones",
    "galerías",
    "clasificaciones de temporada",
    "fichas binomio-temporada",
    "reglas de modalidad",
    "jornadas",
    "binomios",
    "temporadas",
    "guías",
    "perros",
    "clubes",
    "jueces",
    "noticias",
    "patrocinadores",
    "documentos",
  ];

  resultado.forEach((r: { count: number }, i: number) => {
    if (r.count > 0) console.log(`  - ${r.count} ${nombres[i]}`);
  });

  const usuarios = await prisma.usuario.count();
  console.log(`\nListo. Tu(s) ${usuarios} usuario(s) de acceso se han conservado.`);
  console.log("El backoffice está vacío y listo para meter datos reales.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
