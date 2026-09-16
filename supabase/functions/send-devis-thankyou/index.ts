// Le 119 — email de remerciement automatique apres une demande de devis.
//
// Declenchement : un Database Webhook Supabase (Database > Webhooks) sur
// INSERT dans public.demandes_devis appelle cette fonction.
//
// Secrets requis (a definir avec `supabase secrets set`, voir README) :
//   BREVO_API_KEY       cle API transactionnelle Brevo
//   BREVO_SENDER_EMAIL  adresse expediteur, deja authentifiee dans Brevo
//   BREVO_SENDER_NAME   nom affiche comme expediteur
//   WEBHOOK_SECRET      secret partage avec le Database Webhook (anti-abus)
//
// Le texte et le HTML des deux versions d'email (voir templates.ts) sont
// choisis automatiquement selon ce que le prospect a rempli dans le
// formulaire. Pour les modifier, editez templates.ts puis redeployez :
// `supabase functions deploy send-devis-thankyou`.

import { buildDevisThankYouEmail } from "./templates.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: { type?: string; table?: string; record?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = payload.record;
  if (!record || typeof record.email !== "string") {
    return new Response("Missing record.email", { status: 400 });
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "Le 119";

  if (!brevoApiKey || !senderEmail) {
    console.error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL secret");
    return new Response("Server misconfigured", { status: 500 });
  }

  const recipientName = [record.prenom, record.nom].filter(Boolean).join(" ") || undefined;
  const { subject, html, text } = buildDevisThankYouEmail(record);

  const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: record.email, name: recipientName }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!brevoRes.ok) {
    const errorBody = await brevoRes.text();
    console.error("Brevo API error", brevoRes.status, errorBody);
    return new Response("Failed to send email", { status: 502 });
  }

  return new Response("OK", { status: 200 });
});
