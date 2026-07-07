-- supabase/migrations/0005_job_insights.sql
-- applied_at already exists (0001). Add source, rejection reason, and a
-- rejected timestamp. Values validated server-side, not via DB constraints.

alter table jobs add column source           text;
alter table jobs add column rejection_reason text;
alter table jobs add column rejected_at      timestamptz;
