-- ============================================================================
-- ESQUEMA COMPLETO — pegalo en Supabase → SQL Editor → New query → Run
-- Se puede ejecutar más de una vez sin romper nada.
-- ============================================================================

-- ---------- 1. Tablas ----------

-- Ajustes sueltos (clave/valor): nombre, fecha de inicio, frases, mensajes del quiz...
create table if not exists public.site_settings (
  key   text primary key,
  value text not null
);

-- Hitos de "Nuestra historia"
create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  happened_on date not null,
  title       text not null,
  body        text,
  photo_path  text,              -- ruta dentro del bucket "media", ej: historia/primera-cita.jpg
  photo_alt   text,
  sort_order  int  not null default 0
);

-- Fotos de la galería
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,    -- foto comprimida, ej: fotos/2026-04-17_001.jpg
  thumb_path   text,             -- miniatura, ej: fotos/thumbs/2026-04-17_001.jpg
  taken_at     timestamptz,      -- fecha de captura (EXIF)
  caption      text,             -- pie de foto (opcional)
  album        text,             -- ej: Viajes, Salidas, Cumpleaños
  tags         text[] not null default '{}',
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
create index if not exists photos_taken_at_idx on public.photos (taken_at);

-- Videos: guardados en el bucket (source='storage') o enlaces (source='link')
create table if not exists public.videos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  recorded_on  date,
  source       text not null default 'storage' check (source in ('storage', 'link')),
  storage_path text,             -- si source='storage', ej: videos/cumple.mp4
  thumb_path   text,             -- miniatura opcional, ej: videos/thumbs/cumple.jpg
  external_url text,             -- si source='link' (YouTube / Vimeo no listado)
  sort_order   int not null default 0,
  constraint videos_source_ok check (
    (source = 'storage' and storage_path is not null) or
    (source = 'link'    and external_url is not null)
  )
);

-- Recuerdos (tarjetas que se voltean)
create table if not exists public.memories (
  id          uuid primary key default gen_random_uuid(),
  happened_on date,
  title       text not null,
  body        text not null,
  photo_path  text,
  photo_alt   text,
  sort_order  int not null default 0
);

-- Mis palabras para vos: kind = 'frase' | 'amo' | 'razon'
create table if not exists public.words (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'frase' check (kind in ('frase', 'amo', 'razon')),
  body       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- La carta (se muestra la más reciente con published = true)
create table if not exists public.letters (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  body       text not null,      -- separá los párrafos con una línea en blanco
  signature  text,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Preguntas del quiz (options es un array JSON; correct_index empieza en 0)
create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  options       jsonb not null,  -- ["Opción A","Opción B","Opción C"]
  correct_index int  not null default 0,
  feedback      text,            -- se muestra después de responder
  sort_order    int  not null default 0,
  constraint quiz_options_array check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  constraint quiz_correct_in_range check (correct_index >= 0 and correct_index < jsonb_array_length(options))
);

-- ---------- 2. Row Level Security: SOLO lectura y SOLO usuarios con sesión ----------
-- Con RLS activado y sin políticas de insert/update/delete, nadie puede escribir desde la web.
-- Vos cargás todo desde el panel de Supabase o con el script (service_role se saltea RLS).

do $$
declare t text;
begin
  foreach t in array array['site_settings','milestones','photos','videos','memories','words','letters','quiz_questions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo lectura con sesion" on public.%I', t);
    execute format('create policy "solo lectura con sesion" on public.%I for select to authenticated using (true)', t);
    -- El rol anónimo (sin sesión) no tiene ningún permiso sobre las tablas
    execute format('revoke all on public.%I from anon', t);
    -- Los usuarios con sesión solo pueden leer
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- 3. Storage: bucket PRIVADO "media" ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)          -- 50 MB por archivo (tope del plan gratuito)
on conflict (id) do update set public = false;

-- Solo usuarios con sesión pueden leer (y por lo tanto pedir URLs firmadas) los archivos del bucket.
-- No hay políticas de insert/update/delete: desde la web nadie puede subir ni borrar.
drop policy if exists "media: lectura con sesion" on storage.objects;
create policy "media: lectura con sesion"
  on storage.objects for select to authenticated
  using (bucket_id = 'media');
