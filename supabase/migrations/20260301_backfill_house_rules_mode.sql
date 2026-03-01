-- Backfill sessions.house_rules_mode for legacy rows.
-- Rule:
-- - custom: non-empty house_rules_json OR non-empty summary that isn't "Standard rules"
-- - standard: everything else

alter table sessions
add column if not exists house_rules_mode text not null default 'standard';

update sessions
set house_rules_mode = case
  when (
    jsonb_typeof(coalesce(house_rules_json, '{}'::jsonb)) = 'object'
    and coalesce(house_rules_json, '{}'::jsonb) <> '{}'::jsonb
  ) then 'custom'
  when (
    nullif(btrim(coalesce(house_rules_summary, '')), '') is not null
    and lower(btrim(coalesce(house_rules_summary, ''))) <> 'standard rules'
  ) then 'custom'
  else 'standard'
end
where house_rules_mode is distinct from case
  when (
    jsonb_typeof(coalesce(house_rules_json, '{}'::jsonb)) = 'object'
    and coalesce(house_rules_json, '{}'::jsonb) <> '{}'::jsonb
  ) then 'custom'
  when (
    nullif(btrim(coalesce(house_rules_summary, '')), '') is not null
    and lower(btrim(coalesce(house_rules_summary, ''))) <> 'standard rules'
  ) then 'custom'
  else 'standard'
end;
