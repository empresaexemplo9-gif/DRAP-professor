"use client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

export function DemoControls() {
  return (
    <Card className="grid gap-4 md:grid-cols-2">
      <TextField label="Campo de texto" placeholder="Digite algo" hint="Texto de ajuda." />
      <TextField label="Campo com erro" defaultValue="valor inválido" error="Mensagem de erro associada ao campo." />
      <SelectField label="Seleção" defaultValue="b"><option value="a">Opção A</option><option value="b">Opção B</option></SelectField>
      <TextAreaField label="Área de texto" />
      <CheckboxField label="Caixa de seleção" defaultChecked />
      <div className="flex items-end">
        <Modal title="Modal de exemplo" description="Foco preso no diálogo; Esc fecha." trigger={<Button variant="secondary">Abrir modal</Button>}>
          <p className="text-text-muted">Conteúdo do modal, no tema.</p>
        </Modal>
      </div>
    </Card>
  );
}
