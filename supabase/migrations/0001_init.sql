-- supabase/migrations/0001_init.sql

create table jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  company      text not null,
  role         text not null,
  url          text,
  description  text,
  status       text not null default 'saved' check (status in ('saved','applied','interview','offer','rejected')),
  salary_range text,
  location     text,
  tags         text[] not null default '{}',
  notes        text,
  applied_at   timestamptz,
  last_updated timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

alter table jobs enable row level security;

create policy "Users can select their own jobs"
  on jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own jobs"
  on jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own jobs"
  on jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own jobs"
  on jobs for delete
  using (auth.uid() = user_id);

create index jobs_user_id_idx on jobs (user_id);
create index jobs_status_idx on jobs (status);
