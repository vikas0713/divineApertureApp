-- Grant table privileges to the Supabase roles.
--
-- 001_initial_schema.sql creates every table but never grants on them, so
-- PostgREST requests fail with 42501 "permission denied" before RLS is ever
-- evaluated. Hosted projects created through the dashboard inherit these
-- grants from Supabase's default privileges; tables created by a migration
-- do not.
--
-- These grants are deliberately coarse. Row Level Security, enabled on every
-- table in 001, is what actually restricts access.

grant usage on schema public to anon, authenticated, service_role;

-- Per-table loop, not `grant all on all tables in schema public`.
-- The blanket form is silently ineffective under `supabase db reset`:
-- verified in-migration that it leaves SELECT/INSERT/UPDATE/DELETE ungranted
-- while a per-table grant on the very same connection succeeds.
do $$
declare
  target record;
begin
  for target in select tablename from pg_tables where schemaname = 'public' loop
    execute format(
      'grant all on public.%I to anon, authenticated, service_role',
      target.tablename
    );
  end loop;

  for target in select sequencename from pg_sequences where schemaname = 'public' loop
    execute format(
      'grant all on sequence public.%I to anon, authenticated, service_role',
      target.sequencename
    );
  end loop;
end $$;

-- Anything a later migration adds inherits the same treatment.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- promote_to_superadmin stays server-side only.
revoke execute on function public.promote_to_superadmin(text) from anon, authenticated;

do $$
begin
  assert has_table_privilege('service_role', 'public.events', 'SELECT'),
    'service_role must be able to read public.events';
  assert has_table_privilege('authenticated', 'public.photos', 'SELECT'),
    'authenticated must be able to read public.photos';
end $$;
