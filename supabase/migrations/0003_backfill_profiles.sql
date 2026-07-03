-- supabase/migrations/0003_backfill_profiles.sql
--
-- Migration 0002 added a trigger that auto-creates a profiles row on new
-- auth.users inserts, but existing users (created before the trigger) have
-- no profiles row. Backfill them.

insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data->>'full_name'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
