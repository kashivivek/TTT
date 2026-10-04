-- Written against the live schema (checked 2026-10-03). Safe to re-run.
-- Runs in one transaction: if anything fails, nothing is applied.
begin;

-- ---------------------------------------------------------------------------
-- 1. Close the open door: this policy let anyone with the public anon key
--    read, edit and delete every user's watch history.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow all access" on public.watch_history;

-- ---------------------------------------------------------------------------
-- 2. watch_history: remove duplicate episode rows, then enforce uniqueness.
--    The app upserts on (user_id, tmdb_id, season_number, episode_number); without
--    this index those upserts fail. Keeps the row with an emotion, else the earliest.
--    Movie rows (null season/episode) are untouched, so rewatches are kept.
-- ---------------------------------------------------------------------------
delete from public.watch_history w
using (
  select id,
         row_number() over (
           partition by user_id, tmdb_id, season_number, episode_number
           order by (emotion is not null) desc, watched_at asc, id asc
         ) as rn
  from public.watch_history
  where season_number is not null and episode_number is not null
) d
where w.id = d.id and d.rn > 1;

create unique index if not exists watch_history_episode_uniq
  on public.watch_history (user_id, tmdb_id, season_number, episode_number);
-- Every app query filters by user; there was no index on user_id for 600k+ rows.
create index if not exists watch_history_user_watched_idx on public.watch_history (user_id, watched_at desc);
create index if not exists tracked_shows_user_idx on public.tracked_shows (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 3. New columns / tables
-- ---------------------------------------------------------------------------
alter table public.user_comments add column if not exists is_spoiler boolean not null default false;
create index if not exists user_comments_title_idx on public.user_comments (tmdb_id, media_type, created_at desc);

create table if not exists public.account_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  reason text,
  comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  updated_at timestamptz not null default now()
);

create table if not exists public.comment_reactions (
  comment_id uuid not null references public.user_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'love', 'funny', 'downvote')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.user_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text,
  auth text,
  last_payload jsonb,
  created_at timestamptz not null default now()
);

-- Profile row for every user, seeded from the display name they chose.
create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(new.raw_user_meta_data->>'display_name', 40), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, display_name)
select id, nullif(left(raw_user_meta_data->>'display_name', 40), '')
from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security. Before this, RLS was OFF on most tables, so anyone with
--    the public anon key could read/edit ratings, comments, favorites,
--    preferences, lists, and feedback (including emails).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tracked_shows','watch_history','user_ratings','user_emotions','user_favorites',
    'user_badges','user_preferences','notification_preferences','push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Custom lists (not used by the app yet): owner writes, public lists readable.
alter table public.custom_lists enable row level security;
drop policy if exists "lists own" on public.custom_lists;
create policy "lists own" on public.custom_lists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "lists public read" on public.custom_lists;
create policy "lists public read" on public.custom_lists for select using (is_public);

alter table public.list_items enable row level security;
drop policy if exists "list items own" on public.list_items;
create policy "list items own" on public.list_items for all to authenticated
  using (exists (select 1 from public.custom_lists l where l.id = list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.custom_lists l where l.id = list_id and l.user_id = (select auth.uid())));
drop policy if exists "list items public read" on public.list_items;
create policy "list items public read" on public.list_items for select
  using (exists (select 1 from public.custom_lists l where l.id = list_id and l.is_public));

-- Comments: public read, owner write.
alter table public.user_comments enable row level security;
drop policy if exists "comments readable" on public.user_comments;
create policy "comments readable" on public.user_comments for select using (true);
drop policy if exists "comments insert own" on public.user_comments;
create policy "comments insert own" on public.user_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and char_length(comment_text) <= 2000);
drop policy if exists "comments update own" on public.user_comments;
create policy "comments update own" on public.user_comments for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "comments delete own" on public.user_comments;
create policy "comments delete own" on public.user_comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Profiles: public read, owner write.
alter table public.profiles enable row level security;
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles write own" on public.profiles;
create policy "profiles write own" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Reactions: public read, owner write.
alter table public.comment_reactions enable row level security;
drop policy if exists "reactions readable" on public.comment_reactions;
create policy "reactions readable" on public.comment_reactions for select using (true);
drop policy if exists "reactions write own" on public.comment_reactions;
create policy "reactions write own" on public.comment_reactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Reports: insert-only for the reporter; review them in the Supabase dashboard.
alter table public.comment_reports enable row level security;
drop policy if exists "reports insert own" on public.comment_reports;
create policy "reports insert own" on public.comment_reports for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Feedback: anyone may submit, nobody may read through the API.
alter table public.site_feedback enable row level security;
drop policy if exists "feedback insert" on public.site_feedback;
create policy "feedback insert" on public.site_feedback for insert with check (true);

-- Account deletions: service role only (no policies).
alter table public.account_deletions enable row level security;

commit;
