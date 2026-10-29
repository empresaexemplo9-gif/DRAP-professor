import { NextResponse } from "next/server";
import { assertOrgManager, organizationReport } from "@/lib/enterprise-server";
import { csvRow, progressPercent, ASSIGNMENT_STATUS_LABEL } from "@/lib/enterprise";

const date = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let viewer;
  try {
    viewer = await assertOrgManager(id);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const report = await organizationReport(viewer.tenant.id, id);
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const lines = [csvRow(["Curso", "Nível", "Colaborador", "E-mail", "Equipe", "Situação", "Assuntos concluídos", "Total de assuntos", "Progresso (%)", "Ativado em", "Última atividade", "Concluir até"])];
  for (const pool of report.pools) {
    for (const l of pool.learners) {
      if (l.status === "REVOGADO") continue;
      lines.push(csvRow([
        pool.module.title,
        pool.module.level.label,
        l.name,
        l.email,
        l.team,
        ASSIGNMENT_STATUS_LABEL[l.status].label,
        l.completedTopics,
        l.totalTopics,
        progressPercent(l),
        date(l.activatedAt),
        date(l.lastActivity),
        date(pool.dueAt),
      ]));
    }
  }
  const slug = report.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "empresa";
  // BOM para o Excel reconhecer UTF-8.
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
