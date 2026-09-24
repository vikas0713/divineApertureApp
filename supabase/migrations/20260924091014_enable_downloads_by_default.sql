-- Client downloads are on by default.
--
-- 001 created this column defaulting to false. In practice a delivered gallery
-- is expected to be downloadable, and the studio turns it off per event rather
-- than turning it on every time.

alter table public.events
  alter column original_downloads_enabled set default true;

-- Bring existing events in line with the new default.
update public.events set original_downloads_enabled = true;

comment on column public.events.original_downloads_enabled is
  'Whether clients may download from this gallery. The download serves a high-resolution rendered JPEG, not the camera original: real folders are largely RAW and HEIF which most clients cannot open, and originals run to several GB per shoot. Kept under the original 001 column name.';
