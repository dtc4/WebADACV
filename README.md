# Plataforma Web ADACV

Web pública + backoffice para la gestión de competiciones de agility de
ADACV (Agrupación Deportiva de Agility de la Comunidad Valenciana), sobre
una única base de datos: Temporada → Jornada → Competición → Resultado,
con Clasificación de temporada como concepto separado y reglas de
puntuación configurables (no hardcodeadas) por temporada/modalidad.

Ver `docs/analisis-adacv.md` para el análisis completo del PRD, el
reglamento oficial y el proyecto de referencia que dieron forma a este
modelo de datos.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **PostgreSQL** vía **Prisma**
- Autenticación propia y ligera (sin librerías externas): contraseñas con
  `scrypt` (Node `crypto`) y sesión en cookie firmada con HMAC-SHA256 vía
  Web Crypto — compatible tanto con Route Handlers/Server Actions (Node)
  como con el middleware (Edge Runtime). Ver `src/lib/session.ts` y
  `src/lib/auth.ts`.

## Puesta en marcha

```bash
npm install
cp .env.example .env
# Edita .env: DATABASE_URL (tu PostgreSQL) y SESSION_SECRET
#   (genera uno con: openssl rand -base64 32)

npm run db:push    # crea las tablas a partir de prisma/schema.prisma
npm run db:seed    # datos de ejemplo (temporada, clubes, binomios,
                    # una jornada publicada con resultados en las 6
                    # calificaciones oficiales, clasificaciones vacías…)

npm run dev
```

Abre `http://localhost:3000` para la web pública y
`http://localhost:3000/backoffice/login` para el backoffice. El seed crea
un usuario:

```
Email:      secretaria@adacv.es
Contraseña: adacv2026
```

**Cámbiala en cuanto tengas la app funcionando** (no hay todavía una
pantalla de "cambiar contraseña" — actualiza `passwordHash` directamente
o pide que se añada esa pantalla).

## Estructura

```
prisma/schema.prisma        Modelo de datos completo (ver comentarios inline)
prisma/seed.ts               Datos de ejemplo

src/lib/rules/               Motor de reglas (penalizaciones, TRS/TRM, calificación)
  engine.ts                  Punto de entrada único: calcularResultado(modalidad, ...)
  modalidades/estandar.ts    Agility Standard, Jumping, Steeplechase (implementado)
  modalidades/pendientes.ts  Jumping Relevos, K.O., Dédalo (NO implementado, ver abajo)

src/lib/data/                Lecturas de base de datos
  public.ts                  Solo datos publicados/públicos
  backoffice.ts               Todo (incluye borradores)

src/app/actions/             Server Actions (mutaciones): auth, jornadas, clasificaciones
src/app/(public)/            Web pública (grupo de rutas, sin prefijo en la URL)
src/app/backoffice/          Backoffice (protegido por src/middleware.ts)
```

## Motor de reglas: qué está implementado y qué no

El motor (`src/lib/rules/engine.ts`) parametriza penalizaciones por
temporada/modalidad en la tabla `ReglaModalidad` (nada de constantes fijas
en el código), y calcula TRS/TRM, penalización y calificación oficial
(bandas Excelente/Muy Bueno/Bueno/Suficiente/No Calificado/Eliminado).

**Implementado:** Agility Standard, Jumping, Performance, Steeplechase
(estas cuatro comparten el motor "estándar": 5 puntos por falta/rehúse, 1
punto por segundo de exceso sobre el TRS, eliminación al superar el TRM o
al enésimo rehúse configurado — Steeplechase desactiva la eliminación por
rehúses, como marca el reglamento).

**Pendiente de definir con secretaría/comité de reglamento antes de
programarlo** (para no arriesgarnos a publicar resultados oficiales
incorrectos con una fórmula adivinada):
- **Jumping Relevos**: penalización en segundos por equipo, sin
  eliminación por rehúses/errores.
- **K.O.**: eliminación directa por rondas (bracket) — necesita además un
  modelo de datos de "ronda"/"cruce" que todavía no existe.
- **Dédalo/Laberinto**: puntuación por 3 zonas con reglas propias
  (aditivas/multiplicativas).

El backoffice permite crear competiciones de estas 3 modalidades (para no
bloquear la carga de datos), pero al intentar guardar un resultado el
motor lanza un error explicando que esa modalidad todavía no tiene
fórmula — es intencional.

## Otras limitaciones conocidas del MVP actual

- **Ascensos/descensos de fin de temporada** (25% mejor/peor de cada
  nivel, mínimo 5 pruebas, tope de 500 puntos de penalización) no están
  automatizados todavía — es una acción de fin de temporada pendiente de
  construir.
- **Puntos de clasificación de temporada** = suma de la penalización de
  todos los resultados publicados del binomio en ese nivel/categoría. Es
  la lectura más directa del reglamento (que fija un tope de "penalización
  final ≤ 500" para poder ascender), pero no hay una fórmula de "puntos de
  temporada" explícita en el reglamento disponible — **confirmar con
  ADACV** antes de tomarla como criterio oficial.
- No hay todavía backoffice para gestionar Clubes/Jueces/Guías/Perros
  directamente (se gestionan vía `prisma/seed.ts` o Prisma Studio por
  ahora) ni para editar `ReglaModalidad` desde la UI (se crea en el seed).
- Las imágenes de galería/sponsors del seed son placeholders
  (`picsum.photos`) — sustitúyelas por fotos reales.
- Sin cuentas de deportista, importación CSV ni pagos/inscripción online
  (fuera del MVP según el PRD, sección "funcionalidades futuras").
- Páginas públicas construidas: Inicio, Calendario, ficha de Jornada
  (con resultados y enlace a galería), Clasificaciones, Galería y
  Noticias. Todavía faltan las páginas públicas de **Clubes**, **Jueces**
  y **Documentación** (reglamentos/formularios) — los datos y las
  funciones de lectura ya existen en `src/lib/data/public.ts`
  (`getClubesActivos`, `getJueces`, `getDocumentos`), solo falta construir
  esas tres páginas con el mismo patrón que las demás.

## Comandos útiles

```bash
npm run db:studio   # explorador visual de la base de datos (Prisma Studio)
npm run db:migrate  # crear una migración con nombre (en vez de db:push)
npm run lint
npm run build
```
