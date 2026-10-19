import "server-only";

/** Envio de e-mail transacional (Resend). Sem chave configurada, registra no log do servidor. */
export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[e-mail não enviado — RESEND_API_KEY ausente] Para: ${to} | ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error("Falha ao enviar e-mail", res.status, await res.text());
}
