# Análisis previo — Plataforma Web ADACV
Fecha: 6 septiembre 2026

Documento de referencia consolidado a partir de: PRD v1.0, Reglamento de Agility ADACV (agosto 2025), repositorio GitHub `dtc4/AgilityScore` y la web actual `agilityadacv.es`. Sirve de base para diseñar el modelo de datos, el motor de penalizaciones/clasificaciones y la arquitectura de información de la nueva plataforma.

## 1. Resumen del PRD

Construir una plataforma web (no un simple rediseño) para ADACV con dos caras sobre una única base de datos:

- **Web pública**: moderna, visual, mobile-first, orientada a deporte/comunidad (Home, Calendario, Jornadas, Resultados, Clasificaciones, Clubes, Jueces, Galerías, Noticias, Documentación, Patrocinadores, Contacto).
- **Backoffice**: gestión de Temporadas → Jornadas → Competiciones → Resultados → Clasificaciones, más Clubes, Jueces, Guías, Perros, Binomios, Galerías, Noticias, Documentos, Patrocinadores, Usuarios.

Principios clave: fuente única de datos (una jornada se crea una vez y alimenta todo automáticamente), datos estructurados en vez de PDFs sueltos, reglas deportivas configurables por temporada (no hardcodeadas), resultado ≠ clasificación, patrocinios transversales (no una página aislada), mobile-first, y separación visual clara entre web pública y backoffice.

Roles: Visitante, Deportista (futuro), Secretaría, Editor, Administrador.

MVP definido en la sección 49 del PRD (público + backoffice completos sin cuentas de deportista, sin importación CSV, sin pagos/inscripción online — todo eso queda en "funcionalidades futuras", sección 50).

## 2. Reglamento ADACV (agosto 2025) — reglas relevantes para el modelo de datos

### 2.1 Estructura de una prueba
- Superficie: 20×40 m (recomendado 30×40 m). Recorrido máximo 200 m, máximo 20 obstáculos.
- TRS (Tiempo Recorrido Standard) = longitud del recorrido (m) / velocidad elegida por el juez (m/s), más tiempo de parada en mesa si aplica.
- TRM (Tiempo Recorrido Máximo) = TRS × factor entre 1,5 y 2,0 (nunca más del doble ni menos de 1,5×). *(Coincide con `Competition.TRMFactor` clamped [1.5, 2.0] en AgilityScore — reutilizable directamente.)*

### 2.2 Penalizaciones (motor de puntuación)
- Por tiempo: 1 segundo de exceso sobre TRS = 1 punto (con decimales/centésimas).
- Por falta o rehúse: 5 puntos cada uno (sin límite de faltas).
- Por eliminación: 50 puntos por manga eliminada.
- Empates: 1º por penalización total, 2º por menor nº de faltas+rehúses, 3º recorrido de desempate si persiste.

### 2.3 Calificación/Mención (por manga, según penalización total sin decimales)
| Mención | Penalización |
|---|---|
| Excelente | 0–5 |
| Muy Bueno | 6–10 |
| Bueno | 11–15 |
| Suficiente | 16–25 |
| No Calificado | >25 |
| Eliminado | 50 |

*(AgilityScore usa umbrales ligeramente distintos — 0/≤5/≤10/≤15/resto — a revisar y ajustar a los umbrales oficiales de arriba al parametrizar las reglas.)*

### 2.4 Causas de eliminación (resumen, 24 supuestos en el reglamento)
Sobrepasar TRM; 3er rehúse en el recorrido; orden de obstáculos incorrecto; sentido contrario; saltar por encima/por debajo de obstáculos no correspondientes; abandonar posición del guía sin permiso; incumplir normas de comportamiento (collar, comida, objetos, agresividad); necesidades fisiológicas en el recinto; entre otras. Importante: **no hay un tope fijo de "faltas ≥4" o "rehúses ≥3" universal** como simplifica `ParticipantService.UpdateResultsAsync` en AgilityScore (`Refusals >= 3 || Faults >= 4`) — el reglamento real fija la eliminación en el **3er rehúse total**, no en un nº de faltas. Esto debe corregirse en el motor de reglas nuevo y hacerse configurable por temporada, tal como pide el PRD (sección 4.5).

### 2.5 Niveles, categorías y ascensos/descensos
- Niveles: **Nivel II, Nivel III, Performance** (coincide con el enum `LevelType` de AgilityScore).
- Ascienden a Nivel III el 25% mejor clasificado de Nivel II (mín. 5 pruebas en la temporada, penalización final ≤500 puntos). Descienden el 25% peor de Nivel III.
- Categorías por talla (5 alturas, 4 categorías): Mini 1 (<30cm) y Mini 2 (30–36cm) agrupadas en "Mini"; Media (36–43cm); Maxi (43–51cm); Large (>51cm). *(AgilityScore solo modela 4 tamaños sin distinguir Mini 1/Mini 2 — hay que decidir si el nuevo modelo separa las 5 alturas o las agrupa en 4 categorías como en el reglamento de clasificación.)*

### 2.6 Modalidades de prueba (deben ser configurables, PRD sección 7.3)
- **Agility Standard**: todos los obstáculos homologados.
- **Jumping**: igual sin obstáculos de contacto.
- **Jumping Relevos**: por equipos de 2+, sin eliminación por rehúses/errores, penalización en segundos.
- **K.O.**: dos recorridos idénticos en paralelo, eliminación directa por rondas (bracket).
- **Steeplechase©**: 18–20 obstáculos, un solo contacto (empalizada), rehúses no eliminan (solo pérdida de tiempo).
- **Dédalo/Laberinto**: 3 zonas (entrada, laberinto central, salida) con reglas de puntuación propias muy distintas (tiempo con penalizaciones aditivas/multiplicativas, no el modelo estándar de 5 puntos por falta).

Esto confirma la necesidad del PRD (sección 12, "motor de penalizaciones") de separar **datos de ejecución → reglas → penalizaciones → resultado**, ya que cada modalidad tiene una lógica de cálculo distinta (no todas son "5 puntos por falta + 1 punto/seg").

### 2.7 Programa Performance
Para personas con discapacidad, perros con problemas físicos o perros de 9+ años. Sin saltos dobles/triples, alturas reducidas, TRS más laxo (+5 a +10s, o 2.5–3.5 m/s si no hay referencia). Compite y clasifica de forma independiente (campeón anual por subgrupo: guías discapacitados / perros con discapacidad / perros veteranos).

### 2.8 Pruebas de acceso
Obligatorias para poder competir en ADACV; tienen su propio calendario, tasa (10€), y criterios de "apto/no apto" independientes del reglamento de competición estándar (más permisivos en algunos aspectos, ej. hasta 5 rehúses totales permitidos).

## 3. Repositorio de referencia: `dtc4/AgilityScore`

Aplicación de escritorio WPF (.NET, C#) con SQLite + EF Core. **No es reutilizable como código** en una plataforma web (WPF no es web), pero sí como referencia conceptual, tal como indica el PRD sección 52.

Modelo de dominio (`Models/`): `Season → EventDay → Competition → Participant → Dog/Handler`. Mapea directamente a `Temporada → Jornada → Competición → Resultado → Binomio (Guía+Perro)` del PRD, con la salvedad de que AgilityScore no modela explícitamente "Club" ni "Binomio" como entidades propias (Club es solo un string en `Dog.Club`; no hay tabla `Binomio` — el vínculo guía-perro-club vive implícito en `Participant`).

Puntos a **conservar como idea**:
- `Competition.TRS`/`TRM` calculados dinámicamente a partir de longitud y velocidad (propiedades derivadas, no almacenadas) — coincide con el reglamento y es un patrón limpio a replicar.
- Separación de servicios por entidad (`SeasonService`, `EventDayService`, `CompetitionService`, `ParticipantService`) — buena base conceptual para una API REST/GraphQL con recursos equivalentes.
- `EnsureDefaultCompetitions()`: generación automática de combinaciones Nivel×Tamaño×Modalidad al crear una jornada — útil como patrón de "plantilla de jornada", aunque en el nuevo sistema debe ser configurable (no todas las jornadas tienen todas las combinaciones, PRD sección 7.3).

Puntos a **corregir/no replicar**:
- Motor de penalizaciones hardcodeado en el modelo (`Participant.PenaltyTotal`, constantes `PenaltyPerFault = 5.0` fijas en la clase) — contradice el principio 4.5 del PRD ("reglas configurables por temporada") y no cubre las modalidades especiales (Jumping Relevos, K.O., Steeplechase, Dédalo) que tienen fórmulas de puntuación completamente distintas.
- Regla de eliminación automática `Refusals >= 3 || Faults >= 4` es incorrecta respecto al reglamento real (eliminación es al 3er rehúse, no ligada a un nº fijo de faltas).
- `GradeDisplay` usa umbrales de mención ligeramente distintos a los oficiales (16–25 = Suficiente, >25 = No Calificado; AgilityScore no distingue estos dos tramos).
- No hay concepto de "Club" ni "Juez" ni "Patrocinador" ni "Clasificación de temporada" (solo ranking dentro de una competición puntual) — todo esto debe construirse desde cero según el PRD.

Conclusión: usar como **checklist funcional** de qué campos mínimos necesita un Resultado (dorsal, faltas, rehúses, eliminado, tiempo real, penalización por tiempo, penalización total) — que además coincide exactamente con la sección 11 del PRD — pero diseñar el motor de reglas nuevo, parametrizado por temporada/modalidad, como pide el PRD, en vez de reutilizar la lógica fija de AgilityScore.

## 4. Web actual: `agilityadacv.es`

Estructura actual (WordPress, aparentemente):

```
Inicio
Secretaría
 ├── Junta Directiva
 ├── Elecciones Junta Directiva
 ├── Clubes
 └── Impresos de Solicitudes
Reglamentos
Información
 ├── Qué es el Agility
 ├── Campeonato
 ├── Performance
 └── Enlaces
Pruebas
Competición
 ├── Clasificaciones
 ├── Calendarios
 └── WAC 2017
Jueces
Contacto
Patrocinadores
Antigua Web
```

Contenido predominantemente documental: PDFs (Campeonato 2024, Programa Performance, medidas COVID), galería de imágenes estática, tablas de clasificaciones no dinámicas. Confirma el diagnóstico del PRD (sección 2): la información deportiva vive en documentos, no en datos estructurados, y no hay entidad "Jornada" navegable con resultados/fotos/patrocinadores asociados en un mismo lugar.

Mapa de migración orientativo:
| Web actual | Nueva plataforma |
|---|---|
| Secretaría → Clubes | Entidad **Club** (backoffice + ficha pública) |
| Competición → Calendarios | **Calendario** dinámico por Temporada/Jornada |
| Competición → Clasificaciones (tablas estáticas) | **Clasificaciones** generadas por el motor de reglas |
| Reglamentos (PDF) | Sección **Documentación** (categoría "reglamentos"), se mantiene como PDF por diseño del PRD (4.2) |
| Jueces | Entidad **Juez** con ficha e histórico de jornadas |
| Información → Campeonato / Performance | Contenido editorial + datos estructurados de la modalidad Performance |
| Patrocinadores (página aislada) | Sistema de patrocinadores transversal (PRD secciones 25–26) |

## 5. Implicaciones para el modelo de datos y el motor de reglas

1. El motor de penalizaciones no puede ser una única fórmula: necesita un **selector por modalidad** (Agility/Jumping estándar, Jumping Relevos, K.O., Steeplechase, Dédalo, Performance) cada una con su propio cálculo de tiempo/penalización/eliminación, parametrizado por temporada (PRD 4.5, reglamento sección 17).
2. `Binomio` (Guía+Perro+Club) debe ser una entidad de primer nivel, no un campo implícito, porque el PRD (sección 8) exige historial multi-temporada del binomio.
3. Los ascensos/descensos de nivel (25% mejor/peor, mínimo de pruebas, tope de 500 puntos) son una regla de **fin de temporada** que actúa sobre la Clasificación, separada del cálculo de Resultado por jornada — refuerza la separación Resultado vs. Clasificación del PRD (4.4).
4. Las categorías de talla deben decidirse: 5 alturas (Mini 1/Mini 2/Media/Maxi/Large) como en el reglamento de obstáculos, agrupables en 4 categorías (Mini/Media/Maxi/Large) para clasificación — a confirmar con ADACV si ambos niveles de detalle son necesarios en el MVP.
5. Los criterios de "apto/no apto" de las Pruebas de Acceso son un flujo y un reglamento aparte del de competición — probablemente fuera del alcance del MVP público pero a tener en cuenta en el modelo de reglas configurable.

## 6. Siguientes pasos posibles (a decidir con David)

- (a) Prototipo visual (mockups) de la web pública y el backoffice siguiendo las instrucciones de diseño del PRD (secciones 64–65).
- (b) Documento de arquitectura técnica + esquema de base de datos completo (entidades, relaciones, motor de reglas configurable) antes de tocar UI.
- (c) Empezar directamente por un fragmento funcional (p. ej. Home pública + ficha de Jornada con datos simulados) para validar dirección antes de cubrir todo el alcance.
