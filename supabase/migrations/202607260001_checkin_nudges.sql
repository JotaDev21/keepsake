-- A nudge is intentionally tiny: no free text, no payload that could become a
-- covert message channel. "checkin" only asks the partner to open the mood flow.
update public.nudges
set kind = 'thinking'
where kind not in ('thinking', 'agua', 'checkin');

alter table public.nudges
  drop constraint if exists nudges_kind_check;
alter table public.nudges
  add constraint nudges_kind_check
  check (kind in ('thinking', 'agua', 'checkin'));
