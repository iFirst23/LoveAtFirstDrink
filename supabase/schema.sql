-- ============================================================
-- #JFLoveAtFirstDrink — Social Wall schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists social_posts (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null check (platform in ('instagram','tiktok','facebook','other')),
  platform_post_id text,                         -- external id, for de-dup (nullable: manual links may not have one)
  original_url    text not null,
  username        text,                          -- @handle, optional
  caption         text,
  media_type      text not null default 'embed' check (media_type in ('image','video','embed')),
  thumbnail_url   text,
  media_url       text,
  source          text not null check (source in ('instagram_auto','manual_submission')),
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_pinned       boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),   -- row created in our db
  discovered_at   timestamptz,                            -- when auto-discovery found it (null for manual)
  approved_at     timestamptz
);

-- de-dup: same platform + same external post id can't be inserted twice (only when we have an id)
create unique index if not exists social_posts_platform_post_uniq
  on social_posts (platform, platform_post_id)
  where platform_post_id is not null;

-- fast reads for the wall (approved, newest/pinned first) and admin queue (by status)
create index if not exists social_posts_status_idx on social_posts (status, is_pinned desc, created_at desc);
create index if not exists social_posts_platform_idx on social_posts (platform);

alter table social_posts enable row level security;

-- Public (anon key) can read ONLY approved posts — this is what /social and /live query directly.
drop policy if exists "public can read approved posts" on social_posts;
create policy "public can read approved posts"
  on social_posts for select
  using (status = 'approved');

-- Public (anon key) can submit a new post, but ONLY as a pending manual submission,
-- and cannot set is_pinned/status/approved_at themselves — enforced by the check below
-- (Postgres RLS can't easily restrict *columns* on insert, so we double-enforce the
-- important bits in application code too: the /social submit form only ever sends
-- platform/original_url/username/caption/media_type, never status).
drop policy if exists "public can submit pending posts" on social_posts;
create policy "public can submit pending posts"
  on social_posts for insert
  with check (
    status = 'pending'
    and source = 'manual_submission'
    and is_pinned = false
  );

-- No anon UPDATE or DELETE policy exists at all → anon key can never approve/reject/pin/
-- unpublish/delete. Those actions only happen server-side via the service_role key,
-- which bypasses RLS entirely and is used exclusively inside /api/admin/*.js (Vercel
-- serverless functions), never shipped to the browser.

-- Turn on Realtime for this table so /live can subscribe to changes without polling.
-- (In Supabase dashboard: Database → Replication → toggle "social_posts" on for the
-- supabase_realtime publication. The line below does the same thing via SQL.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'social_posts'
  ) then
    alter publication supabase_realtime add table social_posts;
  end if;
end $$;
