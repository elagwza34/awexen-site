-- Rich case-study content for public portfolio detail pages.

alter table public.portfolio_projects
  add column if not exists challenge_ar text not null default '',
  add column if not exists challenge_en text not null default '',
  add column if not exists solution_ar text not null default '',
  add column if not exists solution_en text not null default '',
  add column if not exists results_ar text not null default '',
  add column if not exists results_en text not null default '';

notify pgrst, 'reload schema';
