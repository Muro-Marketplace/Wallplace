-- 142_age_confirmation.sql
--
-- UK compliance audit, 10 September 2026, finding CHI-1.
--
-- The Terms (s.4) and the Artist Agreement (s.1) both say "you must be at
-- least 18". Nothing in signup asked, nothing recorded an answer, and nothing
-- could be produced if a regulator asked how the rule was applied.
--
-- Two separate regimes care, and neither of them works the way the viral
-- "£53,000 per child" claim suggests:
--
--   ICO Children's code (a statutory code under DPA 2018 s.123). It applies to
--   services "likely to be accessed by children", which is not limited to
--   services aimed at them. The ICO takes compliance into account when judging
--   whether the controller met the UK GDPR; there is no separate offence and
--   no per-child tariff.
--
--   Online Safety Act s.36. A children's access assessment is a duty in its
--   own right, and the deliverable is the written record, not the conclusion.
--   See docs/compliance/osa-childrens-access-assessment.md.
--
-- What this column is, precisely: a self-declaration made at signup, recorded
-- next to the terms acceptance it was made alongside. It carries exactly the
-- weight of the row it sits on, and api/terms/accept is candid that a pre-auth
-- assertion about an email address is forgeable. It is a declaration, not a
-- verification. That is the proportionate control for a service with no
-- pornography, no children's product and no feature a child would seek out.
-- Anything stronger, an ID check or facial age estimation, would be
-- disproportionate here and would create a biometric processing problem the
-- platform does not currently have.
--
-- Nullable on purpose. A null means "this acceptance predates the
-- declaration", which is true of every existing row, and must not be confused
-- with a denial.

alter table public.terms_acceptances
  add column if not exists age_confirmed boolean;

comment on column public.terms_acceptances.age_confirmed is
  'Self-declared 18-or-over at signup (CHI-1). NULL means the acceptance predates the declaration, not that the user denied it. A declaration, not a verification.';

notify pgrst, 'reload schema';
