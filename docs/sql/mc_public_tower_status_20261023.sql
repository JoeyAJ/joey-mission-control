-- Applied 2026-10-23 to Supabase project scmvedfqwlhkyvljymjj (migration mc_public_tower_status_20261023).
create or replace function public.mc_public_tower_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value #>> '{}'), '{}'::jsonb)
  from mc_private.tower_state t, jsonb_each(t.value) e
  where t.owner_subject = '6f0ca2ae-83e0-4684-af12-0b37d08182db'::uuid
    and t.state_key = 'ideaDecisions'
    and e.key ~ '^[A-Z][A-Z0-9_]{1,63}$'
    and jsonb_typeof(e.value) = 'string'
    and (e.value #>> '{}') in ('push','paused','done');
$$;
revoke all on function public.mc_public_tower_status() from public;
grant execute on function public.mc_public_tower_status() to anon, authenticated;
