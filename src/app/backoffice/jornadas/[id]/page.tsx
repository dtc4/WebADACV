import { notFound } from "next/navigation";
import { getJornadaConTodo, getBinomiosActivos } from "@/lib/data/backoffice";
import { getClubesActivos, getJueces } from "@/lib/data/public";
import { JornadaWizard } from "./jornada-wizard";

export default async function JornadaPage({ params }: { params: { id: string } }) {
  const [jornada, binomios, clubes, jueces] = await Promise.all([
    getJornadaConTodo(params.id),
    getBinomiosActivos(),
    getClubesActivos(),
    getJueces(),
  ]);

  if (!jornada) notFound();

  return (
    <JornadaWizard
      jornada={jornada}
      binomios={binomios}
      clubes={clubes}
      jueces={jueces}
    />
  );
}
