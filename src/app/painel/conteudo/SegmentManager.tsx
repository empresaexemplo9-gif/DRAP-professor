"use client";
import { useActionState, useState } from "react";
import { deleteSegmentAction, saveSegmentAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Alert, DataTable } from "@/components/ui/misc";
import { Modal } from "@/components/ui/Modal";

type Seg = { id: string; name: string; slug: string; description: string; order: number; modules: number };

function SegmentForm({ segment, onDone }: { segment?: Seg; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(async (s, fd) => {
    const r = await saveSegmentAction(s, fd);
    if (r.ok) onDone?.();
    return r;
  }, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {segment && <input type="hidden" name="id" value={segment.id} />}
      <TextField label="Nome" name="name" defaultValue={segment?.name} required error={fe.name} />
      <TextField label="Endereço (slug)" name="slug" defaultValue={segment?.slug} hint="Opcional — gerado a partir do nome." error={fe.slug} />
      <TextAreaField label="Descrição" name="description" defaultValue={segment?.description} error={fe.description} />
      <TextField label="Ordem" name="order" type="number" min={0} defaultValue={segment?.order ?? 0} error={fe.order} />
      <Button type="submit" loading={pending}>{segment ? "Salvar" : "Criar segmento"}</Button>
    </form>
  );
}

export function SegmentManager({ segments }: { segments: Seg[] }) {
  const [editing, setEditing] = useState<Seg | null>(null);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        {segments.length === 0 ? (
          <p className="text-text-muted">Nenhum segmento cadastrado.</p>
        ) : (
          <DataTable head={["Segmento", "Endereço", "Módulos", "Ações"]} caption="Segmentos">
            {segments.map((s) => (
              <tr key={s.id}>
                <td className="font-medium text-text">{s.name}</td>
                <td className="text-text-muted">/{s.slug}</td>
                <td className="text-text-muted">{s.modules}</td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>Editar</Button>
                    {s.modules === 0 && (
                      <form action={deleteSegmentAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button size="sm" variant="danger" type="submit">Excluir</Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </div>
      <section aria-labelledby="novo-seg" className="rounded-lg border border-border bg-surface p-5">
        <h2 id="novo-seg" className="mb-4 font-display text-xl text-text">Novo segmento</h2>
        <SegmentForm />
      </section>
      <Modal title="Editar segmento" open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <SegmentForm key={editing.id} segment={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
