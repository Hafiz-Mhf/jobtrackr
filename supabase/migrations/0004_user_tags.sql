create table public.user_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now()
);

create unique index user_tags_user_tag_lower_idx
  on public.user_tags (user_id, lower(tag));

create index user_tags_user_id_idx on public.user_tags (user_id);

alter table public.user_tags enable row level security;

create policy "user_tags_select_own" on public.user_tags
  for select using (auth.uid() = user_id);

create policy "user_tags_insert_own" on public.user_tags
  for insert with check (auth.uid() = user_id);

create policy "user_tags_delete_own" on public.user_tags
  for delete using (auth.uid() = user_id);
