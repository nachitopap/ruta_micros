begin;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 1 and 120),
  rut text,
  telefono text,
  creado_en timestamptz not null default now(),
  unique (id, usuario_id)
);

create table if not exists public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  empresa_id uuid not null,
  nombre text not null check (char_length(trim(nombre)) between 1 and 120),
  documento text,
  telefono text,
  correo text,
  creado_en timestamptz not null default now(),
  unique (id, empresa_id, usuario_id),
  foreign key (empresa_id, usuario_id)
    references public.empresas(id, usuario_id) on delete restrict
);

create table if not exists public.micros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  empresa_id uuid not null,
  numero_interno text not null check (char_length(trim(numero_interno)) between 1 and 40),
  patente text not null check (char_length(trim(patente)) between 1 and 20),
  marca_modelo text,
  capacidad integer check (capacidad between 1 and 200),
  creado_en timestamptz not null default now(),
  unique (id, empresa_id, usuario_id),
  unique (usuario_id, patente),
  unique (empresa_id, numero_interno),
  foreign key (empresa_id, usuario_id)
    references public.empresas(id, usuario_id) on delete restrict
);

create table if not exists public.asignaciones_micro (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  empresa_id uuid not null,
  micro_id uuid not null,
  trabajador_id uuid not null,
  ruta_id uuid not null,
  desde date not null default current_date,
  hasta date check (hasta is null or hasta >= desde),
  creado_en timestamptz not null default now(),
  foreign key (micro_id, empresa_id, usuario_id)
    references public.micros(id, empresa_id, usuario_id) on delete restrict,
  foreign key (trabajador_id, empresa_id, usuario_id)
    references public.trabajadores(id, empresa_id, usuario_id) on delete restrict,
  foreign key (ruta_id, usuario_id)
    references public.rutas(id, usuario_id) on delete cascade
);

create index if not exists trabajadores_empresa_nombre_idx
  on public.trabajadores(empresa_id, nombre);
create index if not exists micros_empresa_numero_idx
  on public.micros(empresa_id, numero_interno);
create index if not exists asignaciones_usuario_desde_idx
  on public.asignaciones_micro(usuario_id, desde desc);
create unique index if not exists asignaciones_micro_vigente_idx
  on public.asignaciones_micro(micro_id) where hasta is null;
create unique index if not exists asignaciones_trabajador_vigente_idx
  on public.asignaciones_micro(trabajador_id) where hasta is null;

alter table public.empresas enable row level security;
alter table public.trabajadores enable row level security;
alter table public.micros enable row level security;
alter table public.asignaciones_micro enable row level security;

revoke all on public.empresas, public.trabajadores, public.micros, public.asignaciones_micro from anon, authenticated;
grant select, insert, update, delete on public.empresas, public.trabajadores, public.micros, public.asignaciones_micro to authenticated;

drop policy if exists empresas_propias on public.empresas;
create policy empresas_propias on public.empresas for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

drop policy if exists trabajadores_propios on public.trabajadores;
create policy trabajadores_propios on public.trabajadores for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

drop policy if exists micros_propias on public.micros;
create policy micros_propias on public.micros for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

drop policy if exists asignaciones_propias on public.asignaciones_micro;
create policy asignaciones_propias on public.asignaciones_micro for all to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

commit;