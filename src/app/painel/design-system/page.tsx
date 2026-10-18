import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { OVERRIDABLE_COLORS, COLOR_LABELS, typeScale, radii } from "@/theme/tokens";
import { Alert, DataTable, EmptyState, LinkTabs, PageHeader, ProgressBar } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DocumentView } from "@/content-blocks/BlockRenderer";
import { SAMPLE_DOCUMENT } from "@/content-blocks/sample";
import { DemoControls } from "./DemoControls";

export const metadata: Metadata = { title: "Design system" };

const TEXT: Record<keyof typeof typeScale, string> = { xs: "text-xs", sm: "text-sm", base: "text-base", lg: "text-lg", xl: "text-xl", "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl" };

const SWATCH: Record<string, string> = {
  bg: "bg-bg", surface: "bg-surface", "surface-raised": "bg-surface-raised", border: "bg-border", text: "bg-text", "text-muted": "bg-text-muted",
  primary: "bg-primary", "primary-strong": "bg-primary-strong", "primary-text": "bg-primary-text", accent: "bg-accent", "accent-text": "bg-accent-text",
};

export default async function DesignSystemPage() {
  await requirePermission("theme:manage");
  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Referência viva" title="Design system" description="Todos os tokens e componentes, renderizados com o tema atual. Alterne claro/escuro no menu para conferir os dois modos." />

      <section aria-labelledby="cores" className="space-y-4">
        <h2 id="cores" className="font-display text-2xl">Cores</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {OVERRIDABLE_COLORS.map((k) => (
            <li key={k} className="overflow-hidden rounded-lg border border-border">
              <div className={`h-16 ${SWATCH[k]}`} />
              <div className="bg-surface p-3 text-sm">
                <p className="text-text">{COLOR_LABELS[k]}</p>
                <p className="font-mono text-xs text-text-muted">--drap-{k}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tipo" className="space-y-4">
        <h2 id="tipo" className="font-display text-2xl">Tipografia</h2>
        <Card className="space-y-3">
          {(Object.keys(typeScale) as (keyof typeof typeScale)[]).reverse().map((k) => (
            <p key={k} className={`${TEXT[k]} ${["4xl", "3xl", "2xl", "xl"].includes(k) ? "font-display" : ""}`}>
              <span className="mr-3 font-mono text-xs text-text-muted">{k}</span>Capacitação que transforma
            </p>
          ))}
        </Card>
        <p className="text-sm text-text-muted">Raios: {Object.entries(radii).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
      </section>

      <section aria-labelledby="botoes" className="space-y-4">
        <h2 id="botoes" className="font-display text-2xl">Botões e selos</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="gold">Dourado</Button>
          <Button variant="danger">Perigo</Button>
          <Button loading>Carregando</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutro</Badge><Badge tone="primary">Primário</Badge><Badge tone="gold">Certificado</Badge>
          <Badge tone="success">Concluído</Badge><Badge tone="warning">Em revisão</Badge><Badge tone="danger">Arquivado</Badge>
        </div>
      </section>

      <section aria-labelledby="comp" className="space-y-4">
        <h2 id="comp" className="font-display text-2xl">Componentes</h2>
        <LinkTabs current="a" items={[{ key: "a", label: "Aba ativa", href: "#" }, { key: "b", label: "Outra aba", href: "#" }, { key: "c", label: "Mais uma", href: "#" }]} />
        <div className="grid gap-4 md:grid-cols-3">
          <Card><h3 className="font-display text-xl">Card padrão</h3><p className="mt-2 text-sm text-text-muted">Superfície com borda sutil.</p></Card>
          <Card variant="interactive"><h3 className="font-display text-xl">Card interativo</h3><p className="mt-2 text-sm text-text-muted">Brilho índigo ao passar o mouse.</p></Card>
          <Card variant="featured"><h3 className="font-display text-xl">Card destaque</h3><p className="mt-2 text-sm text-text-muted">Borda dourada.</p></Card>
        </div>
        <Card className="space-y-4"><ProgressBar value={35} label="Progresso" /><ProgressBar value={100} label="Concluído" /></Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info">Informação.</Alert><Alert tone="success">Sucesso.</Alert><Alert tone="warning">Atenção.</Alert><Alert tone="danger">Erro.</Alert>
        </div>
        <DataTable head={["Aluno", "Módulo", "Nota"]} caption="Exemplo de tabela">
          <tr><td>Maria Silva</td><td>Gestão de safra</td><td className="tabular-nums">9,5</td></tr>
          <tr><td>João Souza</td><td>Fluxo de caixa</td><td className="tabular-nums">8,0</td></tr>
        </DataTable>
        <DemoControls />
        <EmptyState title="Estado vazio" text="Mensagem amigável quando ainda não há dados." />
      </section>

      <section aria-labelledby="blocos" className="space-y-4">
        <h2 id="blocos" className="font-display text-2xl">Conteúdo em blocos</h2>
        <Card><DocumentView doc={SAMPLE_DOCUMENT} /></Card>
      </section>
    </div>
  );
}
