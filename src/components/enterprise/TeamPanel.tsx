import type { OrganizationReport } from "@/lib/enterprise-server";
import { ASSIGNMENT_STATUS_LABEL, canReleaseSeat, progressPercent, seatsUsed, teamGoal } from "@/lib/enterprise";
import { levelPath } from "@/lib/catalog-paths";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, EmptyState, ProgressBar } from "@/components/ui/misc";
import { AssignSeatsForm, RevokeSeatButton } from "./SeatForms";

const date = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Contratos da empresa: vagas, meta da equipe, distribuição e progresso por colaborador. */
export function TeamPanel({ org, team, footer }: { org: OrganizationReport; team?: string; footer?: (pool: OrganizationReport["pools"][number]) => React.ReactNode }) {
  if (org.pools.length === 0) {
    return <EmptyState title="Nenhum contrato de vagas" text="Quando a empresa contratar um curso ou treinamento, as vagas aparecem aqui para distribuir à equipe." />;
  }
  const teams = [...new Set(org.pools.flatMap((p) => p.learners.map((l) => l.team)).filter((t): t is string => Boolean(t)))].sort();
  return (
    <div className="space-y-8">
      {org.pools.map((pool) => {
        const learners = pool.learners.filter((l) => l.status !== "REVOGADO" && (!team || l.team === team));
        const used = seatsUsed(pool.learners);
        const free = Math.max(0, pool.seats - used);
        const goal = teamGoal(learners, pool.goalPercent, pool.dueAt);
        const ended = pool.endsAt != null && pool.endsAt <= new Date();
        const live = pool.status === "ACTIVE" && org.status === "ACTIVE" && !ended;
        return (
          <Card key={pool.id} className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-text-muted">{pool.module.level.label} · {pool.module.segment.name}</p>
                <h3 className="font-display text-xl text-text">{pool.module.title}</h3>
                <p className="mt-1 text-sm text-text-muted">
                  {pool.endsAt ? `Acesso até ${date(pool.endsAt)}` : "Acesso sem prazo final"}
                  {pool.dueAt && ` · Concluir até ${date(pool.dueAt)}`}
                  {` · Meta: ${pool.goalPercent}% da equipe concluindo`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!live && <Badge tone="danger">{pool.status === "CANCELED" ? "Contrato cancelado" : org.status !== "ACTIVE" ? "Empresa suspensa" : "Vigência encerrada"}</Badge>}
                {goal.reached && <Badge tone="success">Meta atingida</Badge>}
                {goal.overdue && <Badge tone="warning">Prazo vencido</Badge>}
                <ButtonLink href={levelPath(pool.module.level.slug, pool.module.segment.slug, pool.module.slug)} variant="ghost" size="sm">Ver curso</ButtonLink>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Vagas em uso", `${used} de ${pool.seats}`],
                ["Colaboradores ativos", String(goal.active)],
                ["Concluíram", `${goal.completed} (${goal.completionPercent}%)`],
                ["Progresso médio", `${goal.averageProgress}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border border-border bg-bg p-3">
                  <dt className="text-xs uppercase tracking-wide text-text-muted">{k}</dt>
                  <dd className="mt-1 font-medium text-text">{v}</dd>
                </div>
              ))}
            </dl>
            <ProgressBar value={goal.completionPercent} label={`Conclusão da equipe (meta ${pool.goalPercent}%)`} />

            <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
              <div className="min-w-0">
                {learners.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border-strong p-6 text-center text-sm text-text-muted">Nenhum colaborador{team ? " nesta equipe" : ""} ainda. Atribua as vagas ao lado.</p>
                ) : (
                  <DataTable head={["Colaborador", "Equipe", "Situação", "Progresso", "Última atividade", ""]} caption={`Equipe em ${pool.module.title}`}>
                    {learners.map((l) => {
                      const s = ASSIGNMENT_STATUS_LABEL[l.status];
                      return (
                        <tr key={l.id}>
                          <td className="min-w-48">
                            <span className="block font-medium text-text">{l.name ?? "—"}</span>
                            <span className="block text-xs text-text-muted">{l.email}</span>
                          </td>
                          <td className="whitespace-nowrap text-text-muted">{l.team ?? "—"}</td>
                          <td><Badge tone={s.tone}>{s.label}</Badge></td>
                          <td className="min-w-40">{l.status === "ATIVO" ? <ProgressBar value={progressPercent(l)} label={`${l.completedTopics}/${l.totalTopics}`} /> : <span className="text-text-muted">—</span>}</td>
                          <td className="whitespace-nowrap text-text-muted">{l.lastActivity ? date(l.lastActivity) : "—"}</td>
                          <td>{live && canReleaseSeat(l) && <RevokeSeatButton assignmentId={l.id} email={l.email} />}</td>
                        </tr>
                      );
                    })}
                  </DataTable>
                )}
              </div>
              <div>
                {live ? (
                  <>
                    <h4 className="mb-3 font-medium text-text">Atribuir vagas</h4>
                    <AssignSeatsForm poolId={pool.id} free={free} teams={teams} />
                  </>
                ) : (
                  <p className="text-sm text-text-muted">Este contrato não aceita novas atribuições.</p>
                )}
              </div>
            </div>
            {footer?.(pool)}
          </Card>
        );
      })}
    </div>
  );
}
