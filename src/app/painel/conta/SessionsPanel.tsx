"use client";
import { useState } from "react";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";
import { Button } from "@/components/ui/Button";

type S = { id: string; userAgent: string; ip: string; createdAt: string };

function device(ua: string) {
  if (!ua) return "Dispositivo desconhecido";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Outro";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${br} · ${os}`;
}

export function SessionsPanel({ sessions, currentId }: { sessions: S[]; currentId: string }) {
  const [list, setList] = useState(sessions);
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-text">{device(s.userAgent)} {s.id === currentId && <span className="text-xs text-success">(esta sessão)</span>}</p>
              <p className="text-xs text-text-muted">{s.ip || "IP não registrado"} · desde {new Date(s.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            {s.id !== currentId && (
              <Button size="sm" variant="ghost" onClick={async () => { await revokeSessionAction(s.id); setList((l) => l.filter((x) => x.id !== s.id)); }}>
                Encerrar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {list.length > 1 && (
        <Button variant="secondary" size="sm" onClick={async () => { await revokeOtherSessionsAction(); setList((l) => l.filter((x) => x.id === currentId)); }}>
          Sair de todos os outros dispositivos
        </Button>
      )}
    </div>
  );
}
