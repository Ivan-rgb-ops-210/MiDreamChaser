-- Ejecutá este script una vez en Supabase > SQL Editor.
-- Cada fila pertenece a un usuario de Supabase Auth y RLS impide ver o cambiar perfiles ajenos.
create table if not exists public.dreamchaser_player_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dreamchaser_player_profiles enable row level security;

drop policy if exists "Users can read their DreamChaser profile" on public.dreamchaser_player_profiles;
create policy "Users can read their DreamChaser profile"
  on public.dreamchaser_player_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their DreamChaser profile" on public.dreamchaser_player_profiles;
create policy "Users can create their DreamChaser profile"
  on public.dreamchaser_player_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their DreamChaser profile" on public.dreamchaser_player_profiles;
create policy "Users can update their DreamChaser profile"
  on public.dreamchaser_player_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.dreamchaser_player_profiles to authenticated;
