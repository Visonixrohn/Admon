-- Tabla de ingresos propios (proyectos internos)
-- Registra ingresos que no provienen de cobros a clientes

create table if not exists p_ingresos (
  id          uuid primary key default gen_random_uuid(),
  monto       numeric(12, 2) not null,
  referencia  text,
  proyecto_id uuid references proyectos(id) on delete set null,
  fecha       date not null default current_date,
  created_at  timestamptz not null default now()
);

-- Índices útiles
create index if not exists p_ingresos_fecha_idx        on p_ingresos (fecha desc);
create index if not exists p_ingresos_proyecto_id_idx  on p_ingresos (proyecto_id);

-- Habilitar RLS (ajusta las políticas según tus necesidades)
alter table p_ingresos enable row level security;

-- Política permisiva para usuarios autenticados (ajusta según tu setup)
create policy "Allow all for authenticated"
  on p_ingresos
  for all
  to authenticated
  using (true)
  with check (true);
