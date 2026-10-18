import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "./db";
import { sendEmail } from "./email";

const MAX_SESSIONS = Number(process.env.MAX_SESSIONS_PER_USER ?? 3);

function envOrigins(): string[] {
  return [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
    process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ].filter((v): v is string => Boolean(v));
}

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const googleEnabled = Boolean(google);

export const auth = betterAuth({
  appName: "DRAP Professor",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: async () => {
    const tenants = await prisma.tenant.findMany({ select: { domains: true } });
    return [...envOrigins(), ...tenants.flatMap((t) => t.domains.map((d) => `https://${d}`))];
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // Sem provedor de e-mail configurado, a verificação não pode ser exigida.
    requireEmailVerification: Boolean(process.env.RESEND_API_KEY),
    revokeSessionsOnPasswordReset: true,
    password: {
      hash: (password) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      verify: ({ hash: hashed, password }) => verify(hashed, password),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(
        user.email,
        "Redefinição de senha",
        `Olá, ${user.name}.\n\nPara criar uma nova senha, acesse: ${url}\n\nSe você não pediu a redefinição, ignore este e-mail.`,
      );
    },
  },
  emailVerification: {
    sendOnSignUp: Boolean(process.env.RESEND_API_KEY),
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Confirme seu e-mail", `Olá, ${user.name}.\n\nConfirme seu e-mail em: ${url}`);
    },
  },
  socialProviders: google,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Limite de sessões simultâneas: as mais antigas são encerradas.
        after: async (session) => {
          const sessions = await prisma.session.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          });
          const extra = sessions.slice(MAX_SESSIONS).map((s) => s.id);
          if (extra.length) await prisma.session.deleteMany({ where: { id: { in: extra } } });
        },
      },
    },
  },
  // Limite de tentativas (login, cadastro, recuperação). Desligável só para testes automatizados.
  rateLimit: { enabled: process.env.AUTH_RATE_LIMIT !== "off", window: 60, max: 100 },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  plugins: [twoFactor({ issuer: "DRAP Professor" }), nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
