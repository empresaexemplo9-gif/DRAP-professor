import Image from "next/image";
import { THEME_PRESETS } from "@/theme/tokens";
import { Button } from "@/components/ui/Button";
import { applyPresetAction } from "./actions";

/** Galeria de temas prontos: um clique aplica paleta (clara e escura), fontes e modo padrão. */
export function PresetPicker({ active }: { active?: string }) {
  return (
    <section aria-labelledby="temas-prontos" className="space-y-4">
      <div>
        <h2 id="temas-prontos" className="font-display text-2xl text-text">Temas prontos</h2>
        <p className="text-sm text-text-muted">
          Escolha um visual para a plataforma. Cada tema traz versões clara e escura com contraste conferido (WCAG AA). Depois de aplicar, você ainda pode ajustar cores e fontes abaixo.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {THEME_PRESETS.map((p) => {
          const on = p.id === active;
          return (
            <li key={p.id} className={`overflow-hidden rounded-lg border bg-surface ${on ? "border-primary ring-2 ring-focus-ring" : "border-border"}`}>
              <Image src={p.image} alt={`Prévia do tema ${p.name}`} width={960} height={600} className="aspect-[16/10] w-full object-cover" />
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-1" aria-hidden="true">
                  {[p.light.bg, p.light.primary, p.light.accent, p.dark.bg, p.dark.primary].map((c, i) => (
                    <span key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />
                  ))}
                </div>
                <h3 className="font-medium text-text">{p.name}</h3>
                <p className="text-xs text-text-muted">{p.description}</p>
                <form action={applyPresetAction}>
                  <input type="hidden" name="preset" value={p.id} />
                  <Button type="submit" size="sm" variant={on ? "secondary" : "primary"} disabled={on}>
                    {on ? "Tema atual" : "Aplicar tema"}
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
