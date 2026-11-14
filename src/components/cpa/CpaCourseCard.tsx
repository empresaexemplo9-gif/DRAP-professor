import { withTenant } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/misc";

/** Bloco da página do curso Preparatório CPA no catálogo: acesso ao ambiente próprio e cobertura do programa. */
export async function CpaCourseCard({ tenantId, enrolled }: { tenantId: string; enrolled: boolean }) {
  const { leaves, covered, lessons } = await withTenant(tenantId, async (tx) => {
    const leaves = await tx.cpaSyllabusItem.count({ where: { tenantId, leaf: true } });
    const covered = await tx.cpaSyllabusItem.count({ where: { tenantId, leaf: true, lessons: { some: {} }, questions: { some: {} } } });
    const lessons = await tx.cpaLesson.count({ where: { tenantId, status: "PUBLICADO" } });
    return { leaves, covered, lessons };
  });
  const pct = leaves ? (covered / leaves) * 100 : 0;
  return (
    <Card variant="featured">
      <h2 className="font-display text-xl text-text">Preparatório para a prova oficial da CPA</h2>
      <p className="mt-2 text-sm text-text-muted">
        Curso individual com ambiente próprio: aulas, apostila, exercícios, simulados cronometrados, revisões e casos de atendimento.
        Não emite certificado: a certificação CPA é obtida somente na prova oficial da ANBIMA.
      </p>
      <div className="mt-4">
        <ProgressBar value={pct} label={`Programa oficial coberto: ${covered} de ${leaves} microtemas · ${lessons} aulas publicadas`} />
        {pct < 100 && <p className="mt-2 text-xs text-text-muted">Conteúdo em implantação: novas aulas são publicadas por capítulo.</p>}
      </div>
      {enrolled && (
        <div className="mt-4">
          <ButtonLink href="/cpa">Entrar no preparatório</ButtonLink>
        </div>
      )}
    </Card>
  );
}
