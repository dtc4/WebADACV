import { notFound } from "next/navigation";
import {
  getJornadaConTodo,
  getBinomiosActivos,
  getInscripcionesJornada,
  getBinomiosNoInscritosEnJornada,
} from "@/lib/data/backoffice";
import { getClubesActivos, getJueces } from "@/lib/data/public";
import { JornadaWizard } from "./jornada-wizard";

export default async function JornadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [jornada, binomios, clubes, jueces] = await Promise.all([
    getJornadaConTodo(id),
    getBinomiosActivos(),
    getClubesActivos(),
    getJueces(),
  ]);

  if (!jornada) notFound();

  const [inscripciones, noInscritos] = await Promise.all([
    getInscripcionesJornada(id),
    getBinomiosNoInscritosEnJornada(id),
  ]);

  return (
    <JornadaWizard
      jornada={jornada}
      binomios={binomios}
      inscripciones={inscripciones}
      noInscritos={noInscritos}
      clubes={clubes}
      jueces={jueces}
    />
  );
}
