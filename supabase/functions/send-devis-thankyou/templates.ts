// Le 119 — contenu des emails de remerciement (voir index.ts pour le declenchement).
//
// Deux versions selon ce que le prospect a rempli dans le formulaire :
//   Version A : uniquement les champs obligatoires (pas de message, aucune option cochee)
//   Version B : un message libre et/ou au moins une option (hebergement/DJ/chef/autre prestataire)
//
// Pour changer le texte, modifiez les fonctions buildVersionA / buildVersionB
// ci-dessous puis redeployez : `supabase functions deploy send-devis-thankyou`.

const SITE_URL = "https://new119.vercel.app";
const LOGO_URL = `${SITE_URL}/images/icons/logo-119-white.png`;
const PHONE_DISPLAY = "06 47 98 28 29";
const PHONE_HREF = "+33647982829";
const ADDRESS = "119 rue de Famars, 59300 Valenciennes";

const COLOR_ACCENT = "#FD612E";
const COLOR_DARK = "#001018";
const COLOR_FOOTER = "#001E26";
const COLOR_TEXT = "#111111";
const COLOR_MUTED = "#5B5B5B";
const COLOR_BG = "#F8F9F9";

type DevisRecord = Record<string, unknown>;

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));

function formatDateFr(iso: unknown): string {
  const value = asString(iso);
  if (!value) return "votre date d'événement";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function optionsList(record: DevisRecord): string[] {
  const options: string[] = [];
  if (record.hebergement) options.push("Hébergement");
  if (record.dj) options.push("DJ");
  if (record.chef_cuisine) options.push("Chef de cuisine");
  if (record.autre_prestataire) options.push(escapeHtml(record.autre_prestataire));
  return options;
}

function hasDetails(record: DevisRecord): boolean {
  return Boolean(asString(record.message).trim()) || optionsList(record).length > 0;
}

/* Mise en page commune (tableaux + CSS inline pour compatibilite email). */
function layout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Le 119</title>
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR_BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
<tr><td style="background:${COLOR_DARK};padding:28px 32px;text-align:center;">
<img src="${LOGO_URL}" alt="Le 119" width="130" style="display:block;margin:0 auto;border:0;">
</td></tr>
<tr><td style="padding:36px 32px;color:${COLOR_TEXT};">
${bodyHtml}
</td></tr>
<tr><td style="background:${COLOR_FOOTER};padding:24px 32px;text-align:center;color:rgba(255,255,255,.72);font-size:12px;line-height:1.6;">
Le 119 — ${ADDRESS}<br>
<a href="tel:${PHONE_HREF}" style="color:#FFFFFF;text-decoration:none;">${PHONE_DISPLAY}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const eyebrow = () =>
  `<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${COLOR_ACCENT};font-weight:700;margin:0 0 8px;">Demande de devis</p>`;

function buildVersionA(record: DevisRecord): { subject: string; html: string; text: string } {
  const prenom = escapeHtml(record.prenom);
  const typeEvenement = escapeHtml(record.type_evenement || "événement");
  const dateFr = formatDateFr(record.date_evenement);

  const subject = `Merci pour votre demande, ${record.prenom || ""}`.trim();

  const html = layout(`
${eyebrow()}
<h1 style="font-size:22px;margin:0 0 20px;color:${COLOR_TEXT};">Merci, ${prenom} !</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Nous avons bien reçu votre demande pour votre <strong>${typeEvenement}</strong> du <strong>${dateFr}</strong>. Notre équipe revient vers vous sous 48h ouvrées.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">N'hésitez pas à répondre directement à cet email pour nous en dire plus sur votre projet, ou à nous appeler au <a href="tel:${PHONE_HREF}" style="color:${COLOR_ACCENT};text-decoration:none;">${PHONE_DISPLAY}</a>.</p>
<p style="font-size:15px;line-height:1.6;margin:0;color:${COLOR_MUTED};">À très vite,<br>L'équipe du 119</p>
`);

  const text = `Merci, ${record.prenom || ""} !

Nous avons bien reçu votre demande pour votre ${record.type_evenement || "événement"} du ${dateFr}. Notre équipe revient vers vous sous 48h ouvrées.

N'hésitez pas à répondre directement à cet email pour nous en dire plus sur votre projet, ou à nous appeler au ${PHONE_DISPLAY}.

À très vite,
L'équipe du 119`;

  return { subject, html, text };
}

function buildVersionB(record: DevisRecord): { subject: string; html: string; text: string } {
  const prenom = escapeHtml(record.prenom);
  const typeEvenement = escapeHtml(record.type_evenement || "événement");
  const dateFr = formatDateFr(record.date_evenement);
  const options = optionsList(record);
  const message = asString(record.message).trim();

  const subject = `Merci pour votre demande détaillée, ${record.prenom || ""}`.trim();

  const optionsHtml = options.length
    ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Vous nous avez notamment indiqué être intéressé·e par : <strong>${options.join(", ")}</strong>.</p>`
    : "";

  const messageHtml = message
    ? `<div style="background:${COLOR_BG};border-radius:6px;padding:16px;margin:0 0 24px;">
<p style="margin:0;font-style:italic;color:${COLOR_MUTED};font-size:14px;line-height:1.6;">« ${escapeHtml(message)} »</p>
</div>`
    : "";

  const html = layout(`
${eyebrow()}
<h1 style="font-size:22px;margin:0 0 20px;color:${COLOR_TEXT};">Merci pour votre demande, ${prenom} !</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Nous avons bien reçu votre demande pour votre <strong>${typeEvenement}</strong> du <strong>${dateFr}</strong>, ainsi que toutes les précisions que vous nous avez transmises.</p>
${optionsHtml}
${messageHtml}
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;">Notre équipe revient vers vous sous 48h ouvrées pour construire ensemble votre projet. Vous pouvez aussi nous appeler au <a href="tel:${PHONE_HREF}" style="color:${COLOR_ACCENT};text-decoration:none;">${PHONE_DISPLAY}</a>.</p>
<p style="font-size:15px;line-height:1.6;margin:0;color:${COLOR_MUTED};">À très vite,<br>L'équipe du 119</p>
`);

  const textParts = [
    `Merci pour votre demande, ${record.prenom || ""} !`,
    "",
    `Nous avons bien reçu votre demande pour votre ${record.type_evenement || "événement"} du ${dateFr}, ainsi que toutes les précisions que vous nous avez transmises.`,
  ];
  if (options.length) textParts.push("", `Intérêt pour : ${options.join(", ")}.`);
  if (message) textParts.push("", `Votre message : « ${message} »`);
  textParts.push(
    "",
    `Notre équipe revient vers vous sous 48h ouvrées. Vous pouvez aussi nous appeler au ${PHONE_DISPLAY}.`,
    "",
    "À très vite,",
    "L'équipe du 119"
  );

  return { subject, html, text: textParts.join("\n") };
}

export function buildDevisThankYouEmail(record: DevisRecord): { subject: string; html: string; text: string } {
  return hasDetails(record) ? buildVersionB(record) : buildVersionA(record);
}
