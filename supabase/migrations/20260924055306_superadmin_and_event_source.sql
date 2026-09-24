-- Superadmin bootstrap and generic event storage source.
--
-- 001_initial_schema.sql references auth.users(id) from public.profiles but
-- never creates a profile row, so is_superadmin() could never return true.
-- This migration adds the missing trigger, seeds the single studio, and gives
-- events a storage-agnostic source (Google Drive today, Dropbox later).

-- ---------------------------------------------------------------------------
-- Event storage source
-- ---------------------------------------------------------------------------

create type public.storage_type as enum ('google_drive', 'dropbox', 'divine_aperture');

alter table public.events
  add column hero_image_url text,
  add column storage_type public.storage_type not null default 'google_drive',
  add column storage_url text;

comment on column public.events.storage_url is
  'Shared folder URL for the event source. drive_folder_id holds the ID derived from it.';
comment on column public.events.hero_image_url is
  'Cover image URL used before imported photos exist. cover_photo_id takes over afterwards.';

-- ---------------------------------------------------------------------------
-- Profile creation
--
-- public.profiles has RLS enabled and no insert policy, so this must be
-- security definer. Every new user starts as 'client'; promotion is explicit.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any users created before this trigger existed.
insert into public.profiles (id, display_name, avatar_url, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  u.raw_user_meta_data->>'avatar_url',
  'client'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- The single studio
--
-- Fixed UUID so SUPERADMIN_STUDIO_ID needs no lookup after a db reset.
-- ---------------------------------------------------------------------------

insert into public.studios (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Divine Aperture Studio')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Promotion
--
-- Run once by hand after creating the auth user in the Supabase dashboard:
--   select public.promote_to_superadmin('you@example.com');
--
-- The email must match SUPERADMIN_EMAIL in the backend environment. The env
-- var is authoritative for the API; profiles.role is what RLS reads. Keeping
-- them in sync is the caller's responsibility.
-- ---------------------------------------------------------------------------

create or replace function public.promote_to_superadmin(user_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target_id uuid;
  -- Not named studio_id: that would be ambiguous against
  -- studio_members.studio_id inside the insert below.
  target_studio_id constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  select id into target_id from auth.users where lower(email) = lower(user_email);
  if target_id is null then
    raise exception 'No auth user with email %. Create the user in Supabase Auth first.', user_email;
  end if;

  insert into public.profiles (id, display_name, role)
  values (target_id, user_email, 'superadmin')
  on conflict (id) do update set role = 'superadmin';

  insert into public.studio_members (studio_id, user_id, role)
  values (target_studio_id, target_id, 'superadmin')
  on conflict (studio_id, user_id) do update set role = 'superadmin';

  return target_id;
end;
$$;

revoke execute on function public.promote_to_superadmin(text) from anon, authenticated;
