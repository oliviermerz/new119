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
