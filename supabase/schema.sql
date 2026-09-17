-- Le 119 — table des demandes de devis / projet
-- À exécuter dans le SQL Editor du projet Supabase (curpwqvxsojzgwagwvox)

create table if not exists public.demandes_devis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Informations de contact
  prenom text not null,
  nom text not null,
  email text not null,
  telephone text not null,

  -- Détails de l'événement
  date_evenement date,
  type_evenement text not null,
  nb_adultes integer,
  nb_enfants integer,
  nb_bebes integer,
  moment text,

  -- Options
  hebergement boolean not null default false,
  dj boolean not null default false,
  chef_cuisine boolean not null default false,

  -- Champs libres
  autre_prestataire text,
  message text,

  -- Page d'origine du formulaire (ex. /index.html, /conseils/decoration-salle-mariage.html)
  -- ou, pour les demandes importees depuis une messagerie, un repere du type "email:1001salles"
  source_page text,

  -- Origine de la demande : 'site' (formulaire du site, valeur par defaut) ou un identifiant
  -- de plateforme partenaire ('1001salles', 'mariages.net') pour les demandes importees
  -- automatiquement depuis Gmail. Sert a desactiver l'email de remerciement pour ces dernieres
  -- (voir supabase/functions/send-devis-thankyou), la plateforme d'origine ayant deja envoye
  -- son propre accuse de reception.
  lead_source text not null default 'site',

  -- Identifiant du message source (ex. "gmail:<id>") pour les demandes importees depuis une
  -- messagerie : evite de creer un doublon si le meme email est retraite (voir
  -- scripts/leads/parse-lead-email.mjs). Nul pour les demandes soumises via le formulaire.
  source_message_id text
);

create unique index if not exists demandes_devis_source_message_id_key
  on public.demandes_devis (source_message_id)
  where source_message_id is not null;

alter table public.demandes_devis enable row level security;

-- Le formulaire public peut uniquement insérer une nouvelle demande,
-- jamais lire, modifier ou supprimer les demandes existantes.
create policy "Autoriser l'insertion publique de demandes"
  on public.demandes_devis
  for insert
  to anon
  with check (true);

-- Le 119 — vues de page anonymes (analytics interne)
-- Pas de cookies, pas d'IP stockée, pas d'identifiant qui suit un visiteur
-- d'une page à l'autre : chaque vue est un événement indépendant.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  page_path text not null,
  referrer text,
  user_agent text,

  -- Renseigné a posteriori par le script de suivi quand le visiteur quitte la page.
  duration_seconds integer
);

alter table public.page_views enable row level security;

-- Le script de suivi (js/analytics.js) peut créer une ligne à l'ouverture de la page...
create policy "Autoriser l'insertion publique des vues de page"
  on public.page_views
  for insert
  to anon
  with check (true);

-- ...puis la compléter avec la durée passée, mais uniquement sur une ligne
-- récente (moins d'1h) pour limiter les abus sur d'anciennes lignes.
create policy "Autoriser la mise a jour publique des vues recentes"
  on public.page_views
  for update
  to anon
  using (created_at > now() - interval '1 hour')
  with check (created_at > now() - interval '1 hour');

-- Lecture réservée aux admins connectés (back-office).
create policy "Lecture des vues de page reservee aux admins connectes"
  on public.page_views
  for select
  to authenticated
  using (true);

-- Le 119 — entonnoir des formulaires (ouverture / debut de saisie / envoi)
-- Chaque etape est un evenement independant ; le tableau de bord calcule le
-- rebond (open sans start) et l'abandon (start sans submit) par soustraction.

create table if not exists public.form_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  form_name text not null,
  event_type text not null check (event_type in ('open', 'start', 'submit')),
  page_path text
);

alter table public.form_events enable row level security;

create policy "Autoriser l'insertion publique des evenements de formulaire"
  on public.form_events
  for insert
  to anon
  with check (true);

create policy "Lecture des evenements de formulaire reservee aux admins connectes"
  on public.form_events
  for select
  to authenticated
  using (true);

-- Le 119 — emails transactionnels editables depuis le back-office (bo/emails.html).
-- html_content ne contient QUE le fragment de contenu editable (pas la mise en page
-- avec logo/pied de page, qui reste fixe cote code, voir supabase/functions/send-devis-thankyou).
-- Champs de fusion disponibles dans subject/html_content : {{prenom}}, {{type_evenement}},
-- {{date_evenement}}, {{options_block}}, {{message_block}} — voir le code d'envoi pour la liste
-- exacte selon l'email. is_active permet de mettre un email en pause sans le supprimer.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  slug text not null unique,
  name text not null,
  business_rule text,
  subject text not null,
  html_content text not null,
  is_active boolean not null default true
);

alter table public.email_templates enable row level security;

create policy "Gestion des emails reservee aux admins connectes"
  on public.email_templates
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row
  execute function public.set_updated_at();
