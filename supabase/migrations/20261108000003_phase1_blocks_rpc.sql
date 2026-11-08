-- Blocked accounts list for Settings (profiles are not directly readable across users).
create or replace function public.my_blocked_users()
returns table (user_id uuid, username text, display_name text, avatar_path text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_path, b.created_at
  from blocks b join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke execute on function public.my_blocked_users() from public, anon;
grant execute on function public.my_blocked_users() to authenticated;
