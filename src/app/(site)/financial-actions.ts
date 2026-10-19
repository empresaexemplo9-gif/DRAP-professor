"use server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { saveFinancialNotebook } from "@/lib/courses/financial-practice";

export type NotebookState = { ok?: boolean; error?: string; message?: string };
export async function saveFinancialNotebookAction(_: NotebookState, form: FormData): Promise<NotebookState> {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled || viewer.needsConsent)
    return { error: "Entre com uma conta ativa e revise os termos para salvar seu caderno." };
  const topicId = String(form.get("topicId") ?? "");
  const answers = Object.fromEntries(
    [...form.entries()].filter(([key]) => key.startsWith("answer.")).map(([key, value]) => [key.slice(7), value]),
  );
  const result = await withTenant(viewer.tenant.id, (tx) =>
    saveFinancialNotebook(tx, viewer.tenant.id, viewer.user.id, topicId, answers),
  );
  return result.ok
    ? { ok: true, message: "Rascunho salvo na sua conta. Você pode continuar em outro acesso." }
    : result;
}
