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
  source_page text
);

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
