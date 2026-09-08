-- ============================================================
-- MIGRATION: Post-receipt registration questionnaire
-- Run this ONCE in your existing Supabase project's SQL Editor.
-- (SUPABASE_SCHEMA.sql has also been updated with these same
-- changes, so a brand-new project only needs that one file.)
-- ============================================================

alter table public.client_docs
  add column if not exists marital_status text,
  add column if not exists debt_status text,
  add column if not exists criminal_record text,
  add column if not exists questionnaire_submitted_at timestamptz;

create or replace function public.submit_questionnaire(
  p_otp text,
  p_marital_status text,
  p_debt_status text,
  p_criminal_record text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_docs
  set marital_status = p_marital_status,
      debt_status = p_debt_status,
      criminal_record = p_criminal_record,
      questionnaire_submitted_at = now(),
      updated_at = now()
  where otp = trim(p_otp);
  return found;
end;
$$;

revoke all on function public.submit_questionnaire(text,text,text,text) from public;
grant execute on function public.submit_questionnaire(text,text,text,text) to anon, authenticated;
