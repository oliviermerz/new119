// Le 119 — email de remerciement automatique apres une demande de devis.
//
// Declenchement : un Database Webhook Supabase (Database > Webhooks) sur
// INSERT dans public.demandes_devis appelle cette fonction.
//
// Le sujet et le HTML sont lus depuis public.email_templates (slug
// 'devis-thankyou-a' / 'devis-thankyou-b' selon buildDevisTokens/hasDetails),
// editables depuis bo/emails.html — pas de redeploiement necessaire pour changer
// le texte. Redeployer n'est necessaire que si cette logique de selection change :
// `supabase functions deploy send-devis-thankyou`.
//
// Secrets requis (a definir avec `supabase secrets set`, voir README) :
//   BREVO_API_KEY       cle API transactionnelle Brevo
//   BREVO_SENDER_EMAIL  adresse expediteur, deja authentifiee dans Brevo
//   BREVO_SENDER_NAME   nom affiche comme expediteur
//   WEBHOOK_SECRET      secret partage avec le Database Webhook (anti-abus)
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectes automatiquement par
// la plateforme Supabase dans chaque fonction, pas besoin de les definir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildDevisTokens, hasDetails, htmlToText, renderTemplate, wrapInLayout } from "./helpers.ts";

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

  // Les demandes importees depuis 1001 Salles / Mariages.net ont deja recu un
  // accuse de reception de la plateforme d'origine : pas de second email.
  if (record.lead_source && record.lead_source !== "site") {
    return new Response("Skipped (lead_source != site)", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const slug = hasDetails(record) ? "devis-thankyou-b" : "devis-thankyou-a";
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("subject, html_content, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (templateError || !template) {
    console.error("Template introuvable", slug, templateError);
    return new Response("Template not found", { status: 500 });
  }
  if (!template.is_active) {
    return new Response("Skipped (template en pause)", { status: 200 });
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "Le 119";

  if (!brevoApiKey || !senderEmail) {
    console.error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL secret");
    return new Response("Server misconfigured", { status: 500 });
  }

  const tokens = buildDevisTokens(record);
  const subject = renderTemplate(template.subject, tokens);
  const html = wrapInLayout(renderTemplate(template.html_content, tokens));
  const text = htmlToText(renderTemplate(template.html_content, tokens));

  const recipientName = [record.prenom, record.nom].filter(Boolean).join(" ") || undefined;

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
