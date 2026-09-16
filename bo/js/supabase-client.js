/* Client Supabase partagé par toutes les pages du back-office.
   Même projet et même clé publique que le formulaire public (js/main.js) :
   la protection vient de l'authentification + des policies RLS, pas de la clé. */
(() => {
  "use strict";
  const SUPABASE_URL = "https://curpwqvxsojzgwagwvox.supabase.co";
  const SUPABASE_KEY = "sb_publishable_rPdju156yStjHFMV8PxBiw_Fk6hSdtg";

  window.boSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
})();
