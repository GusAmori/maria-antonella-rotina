-- Maria Antonella - Rotina em Familia
-- Supabase/PostgreSQL schema v2.0.0
-- Execute este arquivo no SQL Editor de um projeto Supabase NOVO.
-- Recomendacao: nao misture os dados deste app com o banco da clinica.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  role text not null default 'responsavel' check (role in ('mae','pai','responsavel')),
  username text,
  photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and username <> '';

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique check (char_length(invite_code) between 6 and 12),
  baby_name text not null default 'Maria Antonella' check (char_length(baby_name) between 1 and 120),
  baby_birth_date date,
  baby_photo text not null default 'assets/anime-baby.jpg',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index if not exists family_members_user_idx on public.family_members(user_id);

create table if not exists public.family_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category text not null check (category in ('mamadeira','refeicao','rejeicao','consulta','vacina','remedio','banho','observacao')),
  happened_at timestamptz not null,
  fields jsonb not null default '{}'::jsonb,
  notes text,
  author_id uuid not null references public.profiles(user_id) on delete restrict,
  author_name text not null,
  author_role text not null check (author_role in ('mae','pai','responsavel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_entries_family_time_idx
  on public.family_entries(family_id, happened_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists families_touch_updated_at on public.families;
create trigger families_touch_updated_at
before update on public.families
for each row execute function public.touch_updated_at();

drop trigger if exists entries_touch_updated_at on public.family_entries;
create trigger entries_touch_updated_at
before update on public.family_entries
for each row execute function public.touch_updated_at();

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_family_with(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members me
    join public.family_members other_member
      on other_member.family_id = me.family_id
    where me.user_id = auth.uid()
      and other_member.user_id = p_other_user_id
  );
$$;

create or replace function public.join_family_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'PROFILE_REQUIRED';
  end if;

  select f.id into v_family_id
  from public.families f
  where upper(f.invite_code) = upper(trim(p_code))
  limit 1;

  if v_family_id is null then
    raise exception 'INVALID_FAMILY_CODE';
  end if;

  insert into public.family_members (family_id, user_id)
  values (v_family_id, auth.uid())
  on conflict (family_id, user_id) do nothing;

  return v_family_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_entries enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (user_id = auth.uid() or public.shares_family_with(user_id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists families_select on public.families;
create policy families_select on public.families
for select to authenticated
using (created_by = auth.uid() or public.is_family_member(id));

drop policy if exists families_insert on public.families;
create policy families_insert on public.families
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists families_update on public.families;
create policy families_update on public.families
for update to authenticated
using (public.is_family_member(id))
with check (public.is_family_member(id));

drop policy if exists families_delete on public.families;
create policy families_delete on public.families
for delete to authenticated
using (created_by = auth.uid());

drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists family_members_insert_creator on public.family_members;
create policy family_members_insert_creator on public.family_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.families f
    where f.id = family_id and f.created_by = auth.uid()
  )
);

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members
for delete to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.families f
    where f.id = family_id and f.created_by = auth.uid()
  )
);

drop policy if exists family_entries_select on public.family_entries;
create policy family_entries_select on public.family_entries
for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists family_entries_insert on public.family_entries;
create policy family_entries_insert on public.family_entries
for insert to authenticated
with check (
  public.is_family_member(family_id)
  and author_id = auth.uid()
);

drop policy if exists family_entries_update on public.family_entries;
create policy family_entries_update on public.family_entries
for update to authenticated
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists family_entries_delete on public.family_entries;
create policy family_entries_delete on public.family_entries
for delete to authenticated
using (public.is_family_member(family_id));

revoke all on public.profiles, public.families, public.family_members, public.family_entries from anon;
revoke all on public.profiles, public.families, public.family_members, public.family_entries from authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.family_entries to authenticated;

revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.shares_family_with(uuid) from public;
revoke all on function public.join_family_by_code(text) from public;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.shares_family_with(uuid) to authenticated;
grant execute on function public.join_family_by_code(text) to authenticated;

alter table public.families replica identity full;
alter table public.family_members replica identity full;
alter table public.family_entries replica identity full;
alter table public.profiles replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='families') then
      execute 'alter publication supabase_realtime add table public.families';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='family_members') then
      execute 'alter publication supabase_realtime add table public.family_members';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='family_entries') then
      execute 'alter publication supabase_realtime add table public.family_entries';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
      execute 'alter publication supabase_realtime add table public.profiles';
    end if;
  end if;
end $$;

commit;
