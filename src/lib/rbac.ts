import type { Role } from "@prisma/client";

/** Matriz de permissões (docs/ARQUITETURA.md, seção 5). Um único guard usado por páginas e API. */
export const PERMISSIONS = {
  "theme:manage": ["ADMIN"],
  "finance:view": ["ADMIN"],
  "finance:manage": ["ADMIN"],
  "enterprise:manage": ["ADMIN"],
  "users:manage": ["ADMIN"],
  "audit:view": ["ADMIN"],
  "content:manage": ["ADMIN", "PEDAGOGICO"],
  "content:publish": ["ADMIN", "PEDAGOGICO"],
  "library:manage": ["ADMIN", "PEDAGOGICO"],
  "enrollment:manage": ["ADMIN", "PEDAGOGICO"],
  "classes:conduct": ["ADMIN", "PEDAGOGICO", "INSTRUTOR"],
  "forum:moderate": ["ADMIN", "PEDAGOGICO", "INSTRUTOR"],
  "learn:study": ["ADMIN", "PEDAGOGICO", "INSTRUTOR", "ALUNO"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(roles: readonly Role[], permission: Permission): boolean {
  const allowed: readonly Role[] = PERMISSIONS[permission];
  return roles.some((r) => allowed.includes(r));
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  PEDAGOGICO: "Responsável Pedagógico",
  INSTRUTOR: "Instrutor/Mentor",
  ALUNO: "Aluno",
};

export type NavItem = { href: string; label: string; icon: string; permission: Permission };

/** Abas do painel por função (docs/ARQUITETURA.md, seção 5 — "Abas do menu por perfil"). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: "home", permission: "learn:study" },
  { href: "/painel/aprendizado", label: "Meu Aprendizado", icon: "book", permission: "learn:study" },
  { href: "/painel/catalogo", label: "Catálogo", icon: "grid", permission: "learn:study" },
  { href: "/painel/agenda", label: "Agenda", icon: "calendar", permission: "learn:study" },
  { href: "/painel/forum", label: "Fórum", icon: "chat", permission: "learn:study" },
  { href: "/painel/certificados", label: "Certificados", icon: "award", permission: "learn:study" },
  { href: "/painel/conteudo", label: "Conteúdo", icon: "layers", permission: "content:manage" },
  { href: "/painel/matriculas", label: "Matrículas", icon: "ticket", permission: "enrollment:manage" },
  { href: "/painel/empresas", label: "Empresas", icon: "briefcase", permission: "enterprise:manage" },
  { href: "/painel/financeiro", label: "Financeiro", icon: "wallet", permission: "finance:view" },
  { href: "/painel/biblioteca", label: "Biblioteca de Materiais", icon: "folder", permission: "library:manage" },
  { href: "/painel/usuarios", label: "Usuários", icon: "users", permission: "users:manage" },
  { href: "/painel/configuracoes", label: "Configurações e Tema", icon: "settings", permission: "theme:manage" },
];

export function navFor(roles: readonly Role[]): NavItem[] {
  return NAV_ITEMS.filter((i) => can(roles, i.permission));
}
