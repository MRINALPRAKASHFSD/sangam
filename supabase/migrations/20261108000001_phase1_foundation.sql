-- Sangam Phase 1 foundation schema.
-- PRODUCT RULE: no location data of any kind is modelled or stored anywhere in this schema.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ───────────────────────── Enums ─────────────────────────
create type public.age_band as enum ('minor', 'adult');
create type public.app_role as enum ('user', 'moderator', 'admin');
create type public.message_audience as enum ('friends', 'shared_tags', 'nobody');
create type public.tag_status as enum ('active', 'pending', 'banned');
create type public.consent_purpose as enum (
  'core_service', 'interest_discovery', 'personalisation', 'product_analytics', 'marketing', 'parental_consent'
);
create type public.media_kind as enum ('image', 'video');
create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'under_review');
create type public.media_visibility as enum ('private', 'friends', 'public');
create type public.filter_category as enum (
  'face', 'beauty', 'color', 'vintage', 'cinematic', 'artistic', 'funny', 'background', 'text', 'trending', 'community'
);
create type public.filter_kind as enum ('canvas', 'ar');

-- ───────────────────────── Profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  bio text check (char_length(bio) <= 160),
  avatar_path text,
  birth_year smallint,
  age_band public.age_band,
  is_private boolean not null default false,
  role public.app_role not null default 'user',
  points_balance integer not null default 0,
  onboarded_at timestamptz,
  suspended_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  language text not null default 'en' check (language in ('en','hi','bn','ta','te','mr','gu','kn','ml','pa','as','or','ur')),
  low_data_mode boolean not null default false,
  discoverable boolean not null default true,
  allow_messages_from public.message_audience not null default 'shared_tags',
  read_receipts boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger prefs_touch before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- Minor safety: private account, friends-only messages, cannot be loosened by the client.
create or replace function public.enforce_minor_profile()
returns trigger language plpgsql as $$
begin
  if new.age_band = 'minor' then new.is_private = true; end if;
  return new;
end $$;
create trigger profiles_minor_guard before insert or update on public.profiles
  for each row execute function public.enforce_minor_profile();

create or replace function public.enforce_minor_prefs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles p where p.id = new.user_id and p.age_band = 'minor') then
    new.allow_messages_from = 'friends';
  end if;
  return new;
end $$;
create trigger prefs_minor_guard before insert or update on public.user_preferences
  for each row execute function public.enforce_minor_prefs();

-- ───────────────────────── Tags ─────────────────────────
create table public.tag_categories (
  id smallserial primary key,
  slug text not null unique,
  name text not null,
  sort smallint not null default 0
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 40),
  category_id smallint references public.tag_categories (id) on delete set null,
  emoji text,
  created_by uuid references public.profiles (id) on delete set null,
  is_official boolean not null default false,
  status public.tag_status not null default 'pending',
  follower_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index tags_name_trgm on public.tags using gin (name extensions.gin_trgm_ops);
create index tags_category on public.tags (category_id) where status = 'active';

create table public.user_tags (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);
create index user_tags_public_by_tag on public.user_tags (tag_id) where is_public;
create index user_tags_recent on public.user_tags (created_at desc);

create or replace function public.maintain_tag_followers()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.tags set follower_count = follower_count + 1 where id = new.tag_id;
  elsif tg_op = 'DELETE' then
    update public.tags set follower_count = greatest(follower_count - 1, 0) where id = old.tag_id;
  end if;
  return null;
end $$;
create trigger user_tags_count after insert or delete on public.user_tags
  for each row execute function public.maintain_tag_followers();

-- ───────────────────────── Consent ledger (append-only) ─────────────────────────
create table public.consent_records (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose public.consent_purpose not null,
  granted boolean not null,
  policy_version text not null default '2026-11-v1',
  created_at timestamptz not null default now()
);
create index consent_latest on public.consent_records (user_id, purpose, created_at desc);

create or replace function public.has_consent(p_user uuid, p_purpose public.consent_purpose)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select granted from public.consent_records
    where user_id = p_user and purpose = p_purpose
    order by created_at desc, id desc limit 1
  ), false)
$$;

-- ───────────────────────── Blocks ─────────────────────────
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on public.blocks (blocked_id);

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- ───────────────────────── Media ─────────────────────────
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  bucket text not null default 'media' check (bucket = 'media'),
  path text not null unique,
  thumb_path text,
  kind public.media_kind not null,
  mime text not null,
  bytes integer not null check (bytes > 0 and bytes <= 52428800),
  width integer,
  height integer,
  duration_ms integer,
  filter_slug text,
  moderation_status public.moderation_status not null default 'pending',
  visibility public.media_visibility not null default 'private',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (path like owner_id::text || '/%'),
  check (thumb_path is null or thumb_path like owner_id::text || '/%')
);
create index media_owner_recent on public.media_assets (owner_id, created_at desc);

-- ───────────────────────── Filters catalog ─────────────────────────
create table public.filters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category public.filter_category not null,
  kind public.filter_kind not null default 'canvas',
  params jsonb not null default '{}'::jsonb,
  sort smallint not null default 0,
  is_trending boolean not null default false,
  status public.tag_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.tag_categories enable row level security;
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.consent_records enable row level security;
alter table public.blocks enable row level security;
alter table public.media_assets enable row level security;
alter table public.filters enable row level security;

-- Profiles: a user reads only their own row directly. Others are read through privacy-aware RPCs.
create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, bio, avatar_path, is_private) on public.profiles to authenticated;

create policy prefs_self_select on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_self_update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_preferences from anon, authenticated;
grant update (theme, language, low_data_mode, discoverable, allow_messages_from, read_receipts) on public.user_preferences to authenticated;

create policy tag_categories_read on public.tag_categories for select to authenticated using (true);
revoke insert, update, delete on public.tag_categories from anon, authenticated;

create policy tags_read on public.tags for select to authenticated
  using (status = 'active' or created_by = (select auth.uid()));
revoke insert, update, delete on public.tags from anon, authenticated;

create policy user_tags_self_select on public.user_tags for select to authenticated using (user_id = (select auth.uid()));
create policy user_tags_self_insert on public.user_tags for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.tags t where t.id = tag_id and (t.status = 'active' or t.created_by = (select auth.uid())))
  );
create policy user_tags_self_update on public.user_tags for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_tags_self_delete on public.user_tags for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.user_tags from authenticated;
grant update (is_public) on public.user_tags to authenticated;

create policy consent_self_select on public.consent_records for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.consent_records from anon, authenticated;

create policy blocks_self_select on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_self_insert on public.blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy blocks_self_delete on public.blocks for delete to authenticated using (blocker_id = (select auth.uid()));
revoke update on public.blocks from authenticated;

create policy media_self_select on public.media_assets for select to authenticated using (owner_id = (select auth.uid()));
create policy media_self_insert on public.media_assets for insert to authenticated
  with check (owner_id = (select auth.uid()) and visibility = 'private' and moderation_status = 'pending');
create policy media_self_delete on public.media_assets for delete to authenticated using (owner_id = (select auth.uid()));
revoke insert, update on public.media_assets from authenticated;
grant insert (path, thumb_path, kind, mime, bytes, width, height, duration_ms, filter_slug) on public.media_assets to authenticated;

create policy filters_read on public.filters for select to authenticated using (status = 'active');
revoke insert, update, delete on public.filters from anon, authenticated;

revoke all on all tables in schema public from anon;

-- ───────────────────────── RPCs ─────────────────────────
create or replace function public.complete_onboarding(
  p_username text,
  p_display_name text,
  p_birth_year int,
  p_tag_ids uuid[],
  p_public_tag_ids uuid[],
  p_consents jsonb
) returns public.profiles
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_age int := extract(year from now())::int - p_birth_year;
  v_band public.age_band;
  v_purpose public.consent_purpose;
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if exists (select 1 from profiles where id = v_uid and onboarded_at is not null) then
    raise exception 'already onboarded' using errcode = 'P0001';
  end if;
  if p_birth_year is null or p_birth_year < 1900 or v_age < 13 then
    raise exception 'You must be at least 13 years old to use Sangam' using errcode = 'P0001';
  end if;
  v_band := case when v_age < 18 then 'minor' else 'adult' end;

  if coalesce((p_consents ->> 'core_service')::boolean, false) is not true then
    raise exception 'Consent to core service processing is required' using errcode = 'P0001';
  end if;
  if v_band = 'minor' and coalesce((p_consents ->> 'parental_consent')::boolean, false) is not true then
    raise exception 'A parent or guardian must consent for users under 18' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_tag_ids, 1), 0) < 3 then
    raise exception 'Pick at least 3 interests' using errcode = 'P0001';
  end if;

  update profiles set
    username = lower(trim(p_username)),
    display_name = trim(p_display_name),
    birth_year = p_birth_year,
    age_band = v_band,
    is_private = (v_band = 'minor'),
    onboarded_at = now()
  where id = v_uid
  returning * into v_profile;

  if v_band = 'minor' then
    update user_preferences set discoverable = false, allow_messages_from = 'friends' where user_id = v_uid;
  end if;

  insert into user_tags (user_id, tag_id, is_public)
  select v_uid, t.id, t.id = any (coalesce(p_public_tag_ids, '{}'))
  from tags t where t.id = any (p_tag_ids) and (t.status = 'active' or t.created_by = v_uid)
  on conflict (user_id, tag_id) do update set is_public = excluded.is_public;

  foreach v_purpose in array enum_range(null::public.consent_purpose) loop
    if p_consents ? v_purpose::text then
      insert into consent_records (user_id, purpose, granted)
      values (v_uid, v_purpose, (p_consents ->> v_purpose::text)::boolean);
    end if;
  end loop;

  return v_profile;
exception when unique_violation then
  raise exception 'That username is taken' using errcode = 'P0001';
end $$;

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select lower(p_username) ~ '^[a-z0-9_.]{3,20}$'
     and not exists (select 1 from profiles where username = lower(p_username))
$$;

create or replace function public.set_consent(p_purpose public.consent_purpose, p_granted boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_purpose = 'core_service' and not p_granted then
    raise exception 'Core service consent cannot be withdrawn while the account exists. Request account deletion instead.' using errcode = 'P0001';
  end if;
  insert into consent_records (user_id, purpose, granted) values (auth.uid(), p_purpose, p_granted);
end $$;

create or replace function public.my_consents()
returns table (purpose public.consent_purpose, granted boolean, policy_version text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (c.purpose) c.purpose, c.granted, c.policy_version, c.created_at
  from consent_records c where c.user_id = auth.uid()
  order by c.purpose, c.created_at desc, c.id desc
$$;

-- People who share interests with the caller. Only public tags of the other person are ever exposed.
create or replace function public.discover_people(p_tag_id uuid default null, p_limit int default 20, p_offset int default 0)
returns table (
  user_id uuid, username text, display_name text, bio text, avatar_path text,
  shared_tags jsonb, shared_count int
)
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_band public.age_band;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select age_band into v_band from profiles where id = v_uid;
  if v_band is null then return; end if;
  if not has_consent(v_uid, 'interest_discovery') then
    raise exception 'consent_required:interest_discovery' using errcode = 'P0001';
  end if;

  return query
  with mine as (select ut.tag_id from user_tags ut where ut.user_id = v_uid),
  candidates as (
    select p.id, p.username::text, p.display_name, case when p.is_private then null else p.bio end as bio, p.avatar_path
    from profiles p
    join user_preferences up on up.user_id = p.id
    where p.id <> v_uid
      and p.onboarded_at is not null
      and p.suspended_at is null
      and p.deletion_requested_at is null
      and p.age_band = v_band
      and up.discoverable
      and has_consent(p.id, 'interest_discovery')
      and not is_blocked_between(v_uid, p.id)
      and (p_tag_id is null or exists (
        select 1 from user_tags x where x.user_id = p.id and x.tag_id = p_tag_id and x.is_public))
  )
  select c.id, c.username, c.display_name, c.bio, c.avatar_path,
    coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'emoji', t.emoji)
      order by t.follower_count desc) filter (where t.id is not null), '[]'::jsonb),
    count(t.id)::int
  from candidates c
  left join user_tags ut on ut.user_id = c.id and ut.is_public and ut.tag_id in (select tag_id from mine)
  left join tags t on t.id = ut.tag_id and t.status = 'active'
  group by c.id, c.username, c.display_name, c.bio, c.avatar_path
  having p_tag_id is not null or count(t.id) > 0
  order by count(t.id) desc, c.username
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
end $$;

create or replace function public.get_public_profile(p_username text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles;
  v_p public.profiles;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into v_me from profiles where id = v_uid;
  select * into v_p from profiles where username = lower(p_username) and onboarded_at is not null and suspended_at is null;
  if v_p.id is null or v_p.age_band is distinct from v_me.age_band or is_blocked_between(v_uid, v_p.id) then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_p.id,
    'username', v_p.username,
    'display_name', v_p.display_name,
    'avatar_path', v_p.avatar_path,
    'is_private', v_p.is_private,
    'bio', case when v_p.is_private then null else v_p.bio end,
    'public_tags', case when v_p.is_private then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'emoji', t.emoji,
        'shared', exists (select 1 from user_tags m where m.user_id = v_uid and m.tag_id = t.id)))
      from user_tags ut join tags t on t.id = ut.tag_id
      where ut.user_id = v_p.id and ut.is_public and t.status = 'active'), '[]'::jsonb) end
  );
end $$;

create or replace function public.trending_tags(p_limit int default 12)
returns table (id uuid, slug text, name text, emoji text, category_slug text, follower_count int, recent_joins int)
language sql stable security definer set search_path = public, extensions as $$
  select t.id, t.slug::text, t.name, t.emoji, c.slug, t.follower_count,
    (select count(*) from user_tags ut where ut.tag_id = t.id and ut.created_at > now() - interval '7 days')::int as recent
  from tags t left join tag_categories c on c.id = t.category_id
  where t.status = 'active'
  order by (t.follower_count + 3 * (select count(*) from user_tags ut where ut.tag_id = t.id and ut.created_at > now() - interval '7 days')) desc,
    t.is_official desc, t.name
  limit least(greatest(p_limit, 1), 50)
$$;

create or replace function public.create_tag(p_name text, p_category_slug text)
returns public.tags language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_slug text := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  v_tag public.tags;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if (select count(*) from tags where created_by = v_uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You can create up to 5 tags per day' using errcode = 'P0001';
  end if;
  select * into v_tag from tags where slug = v_slug;
  if v_tag.id is not null then
    if v_tag.status = 'banned' then raise exception 'This tag is not allowed' using errcode = 'P0001'; end if;
    return v_tag;
  end if;
  insert into tags (slug, name, category_id, created_by, status)
  values (v_slug, trim(p_name), (select id from tag_categories where slug = p_category_slug), v_uid, 'pending')
  returning * into v_tag;
  return v_tag;
exception when check_violation then
  raise exception 'Tag names must be 2–40 characters using letters and numbers' using errcode = 'P0001';
end $$;

create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'generated_at', now(),
    'notice', 'Sangam never collects location or contact data, so none is included.',
    'profile', (select to_jsonb(p) - 'role' from profiles p where p.id = auth.uid()),
    'preferences', (select to_jsonb(u) from user_preferences u where u.user_id = auth.uid()),
    'interests', coalesce((select jsonb_agg(jsonb_build_object('tag', t.name, 'public', ut.is_public, 'since', ut.created_at))
      from user_tags ut join tags t on t.id = ut.tag_id where ut.user_id = auth.uid()), '[]'),
    'consent_history', coalesce((select jsonb_agg(to_jsonb(c) - 'user_id' order by c.created_at)
      from consent_records c where c.user_id = auth.uid()), '[]'),
    'media', coalesce((select jsonb_agg(to_jsonb(m) - 'owner_id' order by m.created_at)
      from media_assets m where m.owner_id = auth.uid()), '[]'),
    'blocked_user_ids', coalesce((select jsonb_agg(b.blocked_id) from blocks b where b.blocker_id = auth.uid()), '[]')
  )
$$;

create or replace function public.request_account_deletion()
returns timestamptz language sql security definer set search_path = public as $$
  update profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = auth.uid() returning deletion_requested_at
$$;

create or replace function public.cancel_account_deletion()
returns void language sql security definer set search_path = public as $$
  update profiles set deletion_requested_at = null where id = auth.uid()
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.complete_onboarding(text, text, int, uuid[], uuid[], jsonb),
  public.username_available(text),
  public.set_consent(public.consent_purpose, boolean),
  public.my_consents(),
  public.discover_people(uuid, int, int),
  public.get_public_profile(text),
  public.trending_tags(int),
  public.create_tag(text, text),
  public.export_my_data(),
  public.request_account_deletion(),
  public.cancel_account_deletion()
to authenticated;
-- Internal helpers stay callable from policies/RPCs but not from the API.
revoke execute on function public.has_consent(uuid, public.consent_purpose), public.is_blocked_between(uuid, uuid) from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', false, 52428800, array['image/webp','image/jpeg','image/png','video/webm','video/mp4']),
  ('avatars', 'avatars', false, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy media_owner_rw on storage.objects for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Signed-in users can sign avatar URLs (avatars are shown wherever a profile appears).
create policy avatars_read on storage.objects for select to authenticated using (bucket_id = 'avatars');
