-- ==========================================
--  SISTEMA DE RESERVAS — Sincronización compartida
--  Pega este script en Supabase → SQL Editor → Run
-- ==========================================

-- Tabla con una sola fila (id = 1) que guarda todo el estado compartido:
-- reservas, usuarios y notificaciones en JSON.
create table if not exists public.app_state (
  id integer primary key default 1,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint app_state_single_row check (id = 1)
);

alter table public.app_state enable row level security;

-- Políticas abiertas para la demo (usa anon key desde el cliente).
-- En un sistema real, restringe estas políticas.
drop policy if exists "app_state select" on public.app_state;
drop policy if exists "app_state insert" on public.app_state;
drop policy if exists "app_state update" on public.app_state;
drop policy if exists "app_state delete" on public.app_state;

create policy "app_state select" on public.app_state for select using (true);
create policy "app_state insert" on public.app_state for insert with check (true);
create policy "app_state update" on public.app_state for update using (true) with check (true);
create policy "app_state delete" on public.app_state for delete using (true);

-- Habilita Realtime para que un cambio en un móvil se vea al instante en otro.
-- Si Realtime no está disponible en tu plan, la app usa polling cada 3 segundos.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_state'
    ) then
      alter publication supabase_realtime add table public.app_state;
    end if;
  end if;
end $$;

-- Fila inicial (si ya hay datos, no se toca).
insert into public.app_state (id, payload, updated_at)
values (1, '{}'::jsonb, now())
on conflict (id) do nothing;
