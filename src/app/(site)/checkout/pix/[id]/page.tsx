import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { PixPaymentMonitor } from "@/components/payments/PixPaymentMonitor";
import { Breadcrumb, PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/Card";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function PixCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) redirect("/entrar");
  const { id } = await params;
  const checkout = await withTenant(viewer.tenant.id, (tx) => tx.pixCheckout.findFirst({
    where: { id, userId: viewer.user.id },
    include: { module: { include: { level: true, segment: true } } },
  }));
  if (!checkout) notFound();
  if (checkout.status === "PAID") redirect(`/${checkout.module.level.slug}/${checkout.module.segment.slug}/${checkout.module.slug}`);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb items={[{ href: "/", label: "Início" }, { href: `/${checkout.module.level.slug}/${checkout.module.segment.slug}`, label: checkout.module.segment.name }, { href: `/${checkout.module.level.slug}/${checkout.module.segment.slug}/${checkout.module.slug}`, label: checkout.module.title }, { label: "Pagamento Pix" }]} />
      <PageHeader eyebrow="Matrícula" title="Pague com Pix" description={checkout.module.title} />
      <Card className="grid gap-8 md:grid-cols-[20rem_1fr]">
        <div className="space-y-3 text-center">
          <p className="text-sm text-text-muted">Aponte o aplicativo do seu banco para o QR Code.</p>
          {checkout.pixImageDataUrl ? (
            <Image src={checkout.pixImageDataUrl} alt="QR Code Pix para pagamento do curso" width={320} height={320} unoptimized className="mx-auto rounded-md border border-border bg-white p-2" />
          ) : (
            <p className="rounded-md border border-border p-8 text-sm text-text-muted">O QR Code não está disponível. Volte ao curso para tentar novamente.</p>
          )}
          <p className="font-display text-2xl text-text">{money(checkout.amountCents)}</p>
          <p className="text-xs text-text-muted">O acesso é liberado depois que o Asaas confirmar o pagamento.</p>
        </div>
        <div className="space-y-5">
          {checkout.status === "PENDING" && checkout.pixPayload ? (
            <PixPaymentMonitor checkoutId={checkout.id} payload={checkout.pixPayload} />
          ) : checkout.status === "EXPIRED" ? (
            <p className="rounded-md border border-warning p-4 text-sm text-text">Este Pix expirou. Volte à página do curso para gerar outro.</p>
          ) : checkout.status === "CANCELED" ? (
            <p className="rounded-md border border-danger p-4 text-sm text-text">Esta cobrança foi cancelada pela equipe. Volte à página do curso para gerar um novo Pix ou fale com o suporte.</p>
          ) : checkout.status === "FAILED" ? (
            <p className="rounded-md border border-danger p-4 text-sm text-text">Não foi possível gerar o Pix. Nenhuma matrícula foi liberada. Volte ao curso para tentar novamente.</p>
          ) : (
            <p className="rounded-md border border-warning p-4 text-sm text-text">Estamos preparando o QR Code. Atualize a página em instantes.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
