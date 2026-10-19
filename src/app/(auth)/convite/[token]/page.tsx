import Link from "next/link";
import { withTenant } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { getViewer } from "@/lib/session";
import { sha256 } from "@/lib/crypto";
import { ROLE_LABELS } from "@/lib/rbac";
import { Alert } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await getTenant();
  const invite = await withTenant(tenant.id, (tx) => tx.invitation.findUnique({ where: { tokenHash: sha256(token) } }));
  const valid = invite && invite.tenantId === tenant.id && !invite.acceptedAt && invite.expiresAt > new Date();
  if (!valid) {
    return (
      <>
        <h1 className="font-display text-3xl text-text">Convite</h1>
        <div className="mt-6"><Alert tone="danger">Este convite é inválido, expirou ou já foi usado.</Alert></div>
      </>
    );
  }
  const viewer = await getViewer();
  const roles = invite.roles.map((r) => ROLE_LABELS[r]).join(", ");
  return (
    <>
      <h1 className="font-display text-3xl text-text">Você foi convidado</h1>
      <p className="mt-2 text-text-muted">
        Convite para <strong className="text-text">{tenant.name}</strong> como <strong className="text-text">{roles}</strong>, para o e-mail{" "}
        <strong className="text-text">{invite.email}</strong>.
      </p>
      <div className="mt-6 space-y-3">
        {viewer ? (
          viewer.user.email.toLowerCase() === invite.email.toLowerCase() ? (
            <AcceptInviteForm token={token} />
          ) : (
            <Alert tone="warning">Você está conectado como {viewer.user.email}. Saia e entre com {invite.email} para aceitar.</Alert>
          )
        ) : (
          <>
            <ButtonLink href={`/cadastro?convite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`} className="w-full">
              Criar conta e aceitar
            </ButtonLink>
            <p className="text-center text-sm text-text-muted">
              Já tem conta? <Link href={`/entrar?convite=${encodeURIComponent(token)}`}>Entrar</Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
