-- Ejecutá este script una vez en Supabase > SQL Editor.
-- Reemplaza la tabla anterior (ataba los perfiles a auth.users, que la app no utiliza).
create extension if not exists pgcrypto with schema extensions;

drop table if exists public.dreamchaser_player_profiles cascade;
drop table if exists public.dreamchaser_career_sessions cascade;
drop table if exists public.dreamchaser_careers cascade;

create table public.dreamchaser_careers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  last_name_key text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table public.dreamchaser_career_sessions (
  token uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.dreamchaser_careers(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create table public.dreamchaser_player_profiles (
  career_id uuid primary key references public.dreamchaser_careers(id) on delete cascade,
  profile jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dreamchaser_careers enable row level security;
alter table public.dreamchaser_career_sessions enable row level security;
alter table public.dreamchaser_player_profiles enable row level security;
revoke all on public.dreamchaser_careers, public.dreamchaser_career_sessions, public.dreamchaser_player_profiles from anon, authenticated;

create or replace function public.dreamchaser_create_career(
  p_first_name text, p_last_name text, p_last_name_key text, p_password text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_career public.dreamchaser_careers%rowtype;
  v_token uuid;
begin
  if length(trim(p_first_name)) not between 1 and 40
     or length(trim(p_last_name)) not between 1 and 40
     or length(p_password) < 8 then
    raise exception 'INVALID_INPUT';
  end if;
  begin
    insert into public.dreamchaser_careers(first_name, last_name, last_name_key, password_hash)
    values (trim(p_first_name), trim(p_last_name), p_last_name_key, extensions.crypt(p_password, extensions.gen_salt('bf', 12)))
    returning * into v_career;
  exception when unique_violation then
    raise exception 'CAREER_EXISTS';
  end;
  insert into public.dreamchaser_career_sessions(career_id) values (v_career.id) returning token into v_token;
  return jsonb_build_object('id', v_career.id, 'first_name', v_career.first_name, 'last_name', v_career.last_name, 'session_token', v_token);
end;
$$;

create or replace function public.dreamchaser_login_career(p_last_name_key text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_career public.dreamchaser_careers%rowtype;
  v_token uuid;
begin
  select * into v_career from public.dreamchaser_careers where last_name_key = p_last_name_key;
  if not found or extensions.crypt(p_password, v_career.password_hash) <> v_career.password_hash then
    raise exception 'INVALID_CREDENTIALS';
  end if;
  insert into public.dreamchaser_career_sessions(career_id) values (v_career.id) returning token into v_token;
  return jsonb_build_object('id', v_career.id, 'first_name', v_career.first_name, 'last_name', v_career.last_name, 'session_token', v_token);
end;
$$;

create or replace function public.dreamchaser_resume_career(p_session_token uuid)
returns jsonb
language sql security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object('id', c.id, 'first_name', c.first_name, 'last_name', c.last_name)
  from public.dreamchaser_career_sessions s
  join public.dreamchaser_careers c on c.id = s.career_id
  where s.token = p_session_token and s.expires_at > now()
  limit 1;
$$;

create or replace function public.dreamchaser_load_player_profile(p_session_token uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile jsonb;
begin
  if not exists (select 1 from public.dreamchaser_career_sessions where token = p_session_token and expires_at > now()) then
    raise exception 'INVALID_SESSION';
  end if;
  select p.profile into v_profile
  from public.dreamchaser_player_profiles p
  join public.dreamchaser_career_sessions s on s.career_id = p.career_id
  where s.token = p_session_token and s.expires_at > now();
  return v_profile;
end;
$$;

create or replace function public.dreamchaser_save_player_profile(p_session_token uuid, p_profile jsonb)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_career_id uuid;
begin
  select career_id into v_career_id from public.dreamchaser_career_sessions
  where token = p_session_token and expires_at > now();
  if v_career_id is null then raise exception 'INVALID_SESSION'; end if;
  insert into public.dreamchaser_player_profiles(career_id, profile, updated_at)
  values (v_career_id, p_profile, now())
  on conflict (career_id) do update set profile = excluded.profile, updated_at = now();
end;
$$;

create or replace function public.dreamchaser_logout_career(p_session_token uuid)
returns void
language sql security definer
set search_path = pg_catalog, public
as $$
  delete from public.dreamchaser_career_sessions where token = p_session_token;
$$;

revoke all on function public.dreamchaser_create_career(text, text, text, text) from public, anon, authenticated;
revoke all on function public.dreamchaser_login_career(text, text) from public, anon, authenticated;
revoke all on function public.dreamchaser_resume_career(uuid) from public, anon, authenticated;
revoke all on function public.dreamchaser_load_player_profile(uuid) from public, anon, authenticated;
revoke all on function public.dreamchaser_save_player_profile(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.dreamchaser_logout_career(uuid) from public, anon, authenticated;

grant execute on function public.dreamchaser_create_career(text, text, text, text) to anon, authenticated;
grant execute on function public.dreamchaser_login_career(text, text) to anon, authenticated;
grant execute on function public.dreamchaser_resume_career(uuid) to anon, authenticated;
grant execute on function public.dreamchaser_load_player_profile(uuid) to anon, authenticated;
grant execute on function public.dreamchaser_save_player_profile(uuid, jsonb) to anon, authenticated;
grant execute on function public.dreamchaser_logout_career(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
