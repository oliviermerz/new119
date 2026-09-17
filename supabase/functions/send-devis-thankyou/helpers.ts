// Le 119 — fonctions utilitaires pour la fusion des champs dans les emails
// stockes dans public.email_templates (voir bo/emails.html pour l'edition).

type DevisRecord = Record<string, unknown>;

export const asString = (value: unknown): string => (typeof value === "string" ? value : "");

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] as string));

export function formatDateFr(iso: unknown): string {
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

export function hasDetails(record: DevisRecord): boolean {
  return Boolean(asString(record.message).trim()) || optionsList(record).length > 0;
}

// Champs de fusion disponibles pour les templates 'devis-thankyou-a' / 'devis-thankyou-b'.
export function buildDevisTokens(record: DevisRecord): Record<string, string> {
  const options = optionsList(record);
  const message = asString(record.message).trim();

  return {
    prenom: escapeHtml(record.prenom),
    type_evenement: escapeHtml(record.type_evenement || "événement"),
    date_evenement: escapeHtml(formatDateFr(record.date_evenement)),
    options_block: options.length
      ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Vous nous avez notamment indiqué être intéressé·e par : <strong>${options.join(", ")}</strong>.</p>`
      : "",
    message_block: message
      ? `<div style="background:#F8F9F9;border-radius:6px;padding:16px;margin:0 0 24px;"><p style="margin:0;font-style:italic;color:#5B5B5B;font-size:14px;line-height:1.6;">« ${escapeHtml(message)} »</p></div>`
      : "",
  };
}

export function renderTemplate(str: string, tokens: Record<string, string>): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => tokens[key] ?? "");
}

const SITE_URL = "https://new119.vercel.app";
const LOGO_URL = `${SITE_URL}/images/icons/logo-119-white.png`;
const PHONE_DISPLAY = "06 47 98 28 29";
const PHONE_HREF = "+33647982829";
const ADDRESS = "119 rue de Famars, 59300 Valenciennes";
const COLOR_DARK = "#001018";
const COLOR_FOOTER = "#001E26";
const COLOR_TEXT = "#111111";
const COLOR_BG = "#F8F9F9";

// Mise en page commune (tableaux + CSS inline pour compatibilite email) : fixe cote code,
// seul le contenu entre les balises <td> centrales (html_content en base) est editable
// depuis bo/emails.html. Une copie simplifiee de ce wrapper existe aussi dans
// bo/js/emails.js pour l'apercu dans l'editeur : la mettre a jour si ce layout change.
export function wrapInLayout(bodyHtml: string): string {
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

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
