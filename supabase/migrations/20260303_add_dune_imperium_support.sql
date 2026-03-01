alter table games add column if not exists storage_bucket text;
alter table games add column if not exists cover_object_path text;
alter table games add column if not exists rules_pdf_object_path text;

insert into games (id, name, description, storage_bucket, cover_object_path, rules_pdf_object_path)
values
  (
    'dune-imperium',
    'Dune: Imperium',
    'Strategic deck-building and worker placement game set in the Dune universe.',
    'Dune',
    'dune-pic.jpg',
    'dune-rules.pdf'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  storage_bucket = excluded.storage_bucket,
  cover_object_path = excluded.cover_object_path,
  rules_pdf_object_path = excluded.rules_pdf_object_path;
