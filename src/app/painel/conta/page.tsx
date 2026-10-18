import type { Metadata } from "next";
import { requireViewer } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/Card";
import { TwoFactorPanel } from "./TwoFactorPanel";
import { SessionsPanel } from "./SessionsPanel";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const viewer = await requireViewer();
  const sessions = await prisma.session.findMany({ where: { userId: viewer.user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Minha conta" description={`${viewer.user.name} · ${viewer.user.email}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-xl text-text">Verificação em duas etapas</h2>
          <TwoFactorPanel enabled={Boolean(viewer.user.twoFactorEnabled)} />
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-xl text-text">Sessões ativas</h2>
          <SessionsPanel
            currentId={viewer.sessionId}
            sessions={sessions.map((s) => ({ id: s.id, userAgent: s.userAgent ?? "", ip: s.ipAddress ?? "", createdAt: s.createdAt.toISOString() }))}
          />
        </Card>
      </div>
    </>
  );
}
