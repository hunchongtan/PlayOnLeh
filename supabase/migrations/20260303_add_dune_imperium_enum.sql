do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'game_key' and e.enumlabel = 'dune-imperium'
  ) then
    alter type game_key add value 'dune-imperium';
  end if;
end $$;
