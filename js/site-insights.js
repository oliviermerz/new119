/* Suivi de fréquentation anonyme et interne (sans cookies, sans IP stockée).
   Écrit dans la table Supabase page_views, visible depuis le back-office (bo/analytics.html). */
(() => {
  "use strict";
  if (location.pathname.startsWith("/bo")) return;
  if (!window.crypto || !crypto.randomUUID) return;

  const SUPABASE_URL = "https://curpwqvxsojzgwagwvox.supabase.co";
  const SUPABASE_KEY = "sb_publishable_rPdju156yStjHFMV8PxBiw_Fk6hSdtg";
  const ENDPOINT = `${SUPABASE_URL}/rest/v1/page_views`;
  const HEADERS = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: "return=minimal",
  };

  const id = crypto.randomUUID();
  const startedAt = performance.now();
  let durationSent = false;

  fetch(ENDPOINT, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      id,
      page_path: location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    }),
    keepalive: true,
  }).catch(() => {});

  const sendDuration = () => {
    if (durationSent) return;
    durationSent = true;
    const duration_seconds = Math.round((performance.now() - startedAt) / 1000);
    fetch(`${ENDPOINT}?id=eq.${id}`, {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({ duration_seconds }),
      keepalive: true,
    }).catch(() => {});
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendDuration();
  });
  window.addEventListener("pagehide", sendDuration);
})();
