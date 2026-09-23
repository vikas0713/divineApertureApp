create extension if not exists pgcrypto;

create type public.app_role as enum ('superadmin', 'client');
create type public.event_status as enum ('draft', 'published', 'archived');
create type public.plan_type as enum ('free', 'paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.app_role not null default 'client',
  created_at timestamptz not null default now()
);

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.studio_members (
  studio_id uuid not null references public.studios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'client',
  primary key (studio_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references public.studios(id) on delete cascade,
  title text not null,
  subtitle text,
  event_date date,
  location text,
  gallery_slug text not null unique,
  drive_folder_id text,
  cover_photo_id uuid,
  status public.event_status not null default 'draft',
  plan public.plan_type not null default 'free',
  original_downloads_enabled boolean not null default false,
  ads_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  drive_file_id text,
  original_r2_key text,
  display_r2_key text,
  thumbnail_r2_key text,
  filename text not null,
  mime_type text not null,
  byte_size bigint,
  width integer,
  height integer,
  checksum text,
  modified_at timestamptz,
  processing_status text not null default 'pending',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, drive_file_id)
);

alter table public.events add constraint events_cover_photo_fk foreign key (cover_photo_id) references public.photos(id) on delete set null;

create table public.gallery_visitors (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.favorites (
  event_id uuid not null references public.events(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create table public.selections (
  event_id uuid not null references public.events(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create table public.print_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.creator_waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  studio_name text,
  city text,
  country text,
  photography_type text,
  monthly_volume text,
  website_url text,
  message text,
  marketing_consent boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index creator_waitlist_email_lower_idx on public.creator_waitlist (lower(email));

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin');
$$;

alter table public.profiles enable row level security;
alter table public.studios enable row level security;
alter table public.studio_members enable row level security;
alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.gallery_visitors enable row level security;
alter table public.favorites enable row level security;
alter table public.selections enable row level security;
alter table public.print_requests enable row level security;
alter table public.creator_waitlist enable row level security;

create policy "profiles own or superadmin" on public.profiles for select using (id = auth.uid() or public.is_superadmin());
create policy "superadmin manages studios" on public.studios for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "superadmin manages members" on public.studio_members for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "superadmin manages events" on public.events for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "published event by gallery access" on public.events for select using (status = 'published' and exists (select 1 from public.gallery_visitors gv where gv.event_id = events.id and gv.user_id = auth.uid()));
create policy "superadmin manages photos" on public.photos for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy "client sees gallery photos" on public.photos for select using (exists (select 1 from public.gallery_visitors gv where gv.event_id = photos.event_id and gv.user_id = auth.uid()));
create policy "visitor can see own access" on public.gallery_visitors for select using (user_id = auth.uid() or public.is_superadmin());
create policy "visitor access insert" on public.gallery_visitors for insert with check (user_id = auth.uid() or public.is_superadmin());
create policy "clients manage own favorites" on public.favorites for all using (user_id = auth.uid() or public.is_superadmin()) with check (user_id = auth.uid() or public.is_superadmin());
create policy "clients manage own selections" on public.selections for all using (user_id = auth.uid() or public.is_superadmin()) with check (user_id = auth.uid() or public.is_superadmin());
create policy "clients create print requests" on public.print_requests for insert with check (user_id = auth.uid());
create policy "owners read print requests" on public.print_requests for select using (user_id = auth.uid() or public.is_superadmin());
create policy "public can join waitlist" on public.creator_waitlist for insert with check (true);
create policy "superadmin reads waitlist" on public.creator_waitlist for select using (public.is_superadmin());
create policy "superadmin updates waitlist" on public.creator_waitlist for update using (public.is_superadmin()) with check (public.is_superadmin());
