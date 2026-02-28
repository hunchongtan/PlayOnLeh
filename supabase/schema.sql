-- Enable UUID generation
create extension if not exists pgcrypto;
create extension if not exists vector;

-- Optional enum for known games
do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_key') then
    create type game_key as enum ('uno', 'uno-flip', 'mahjong');
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'game_key' and e.enumlabel = 'uno-flip'
  ) then
    alter type game_key add value 'uno-flip';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'game_key' and e.enumlabel = 'mahjong'
  ) then
    alter type game_key add value 'mahjong';
  end if;
end$$;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  game_id game_key not null default 'uno',
  house_rules_mode text not null default 'standard' check (house_rules_mode in ('standard','custom')),
  house_rules_json jsonb not null default '{}'::jsonb,
  house_rules_summary text not null default '',
  title text,
  title_source text not null default 'default' check (title_source in ('default', 'ai', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sessions add column if not exists house_rules_mode text;
alter table sessions add column if not exists house_rules_json jsonb default '{}'::jsonb;
alter table sessions add column if not exists house_rules_summary text;
alter table sessions alter column house_rules_mode set default 'standard';
update sessions set house_rules_mode = 'standard' where house_rules_mode is null;
alter table sessions alter column house_rules_mode set not null;
alter table sessions drop constraint if exists sessions_house_rules_mode_check;
alter table sessions add constraint sessions_house_rules_mode_check check (house_rules_mode in ('standard', 'custom'));
alter table sessions alter column house_rules_json set default '{}'::jsonb;
update sessions set house_rules_json = '{}'::jsonb where house_rules_json is null;
alter table sessions alter column house_rules_json set not null;
alter table sessions alter column house_rules_summary set default 'Standard rules';
update sessions set house_rules_summary = 'Standard rules' where house_rules_summary is null or btrim(house_rules_summary) = '';
alter table sessions alter column house_rules_summary set not null;
alter table sessions add column if not exists title_source text;
alter table sessions alter column title_source set default 'default';
update sessions set title_source = 'default' where title_source is null or btrim(title_source) = '';
alter table sessions alter column title_source set not null;
alter table sessions drop constraint if exists sessions_title_source_check;
alter table sessions add constraint sessions_title_source_check check (title_source in ('default', 'ai', 'user'));

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  image_url text,
  image_mime text,
  model text,
  prompt_tokens int,
  completion_tokens int,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  game_id game_key not null default 'uno',
  sentiment text not null check (sentiment in ('up','down')),
  reason text check (reason in ('incorrect_ruling','missing_information','unclear_explanation','other')),
  details text,
  created_at timestamptz not null default now()
);

create table if not exists games (
  id game_key primary key,
  name text not null,
  description text not null,
  storage_bucket text,
  cover_object_path text,
  rules_pdf_object_path text
);

create table if not exists rules_chunks (
  id uuid primary key default gen_random_uuid(),
  game_id game_key not null,
  variant_id text,
  source_url text not null,
  source_title text,
  page_start int,
  chunk_index int not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

insert into games (id, name, description, storage_bucket, cover_object_path, rules_pdf_object_path)
values
  ('uno', 'Uno', 'Classic shedding card game', 'Uno', 'uno-pic.jpg', 'uno-rules.pdf'),
  ('uno-flip', 'Uno Flip', 'Dual-sided Uno variant with Light and Dark sides.', 'Uno-flip', 'uno-flip-pic.jpg', 'uno-flip-rules.pdf'),
  ('mahjong', 'Mahjong', 'Tile-based strategy game with regional variants.', 'Mahjong', 'mahjong-pic.jpg', 'mahjong-rules.pdf')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  storage_bucket = excluded.storage_bucket,
  cover_object_path = excluded.cover_object_path,
  rules_pdf_object_path = excluded.rules_pdf_object_path;

create index if not exists idx_messages_session_created on messages(session_id, created_at);
create index if not exists idx_feedback_session_created on feedback(session_id, created_at);
create index if not exists idx_sessions_updated on sessions(updated_at desc);
create index if not exists idx_rules_chunks_game_chunk on rules_chunks(game_id, chunk_index);
create index if not exists idx_rules_chunks_embedding on rules_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create unique index if not exists idx_rules_chunks_unique_variant
  on rules_chunks (game_id, coalesce(variant_id, ''), source_url, chunk_index);

create or replace function match_rules_chunks(
  query_embedding vector(1536),
  match_game_id game_key,
  match_variant_id text default null,
  match_count int default 4
)
returns table (
  id uuid,
  game_id game_key,
  variant_id text,
  source_url text,
  source_title text,
  page_start int,
  chunk_index int,
  content text,
  similarity float
)
language sql
as $$
  select
    rc.id,
    rc.game_id,
    rc.variant_id,
    rc.source_url,
    rc.source_title,
    rc.page_start,
    rc.chunk_index,
    rc.content,
    1 - (rc.embedding <=> query_embedding) as similarity
  from rules_chunks rc
  where rc.game_id = match_game_id
    and rc.variant_id is not distinct from match_variant_id
  order by rc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sessions_updated_at on sessions;
create trigger trg_sessions_updated_at
before update on sessions
for each row execute function set_updated_at();
