-- Tablas y vistas para Cuentas por Pagar y Pagos
-- Crea: cuentas_por_pagar, cuentas_por_pagar_pagos, vistas de saldo y resumen

-- Tabla: cuentas_por_pagar
create table if not exists cuentas_por_pagar (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid,
  proveedor     text,
  proyecto_id   uuid references proyectos(id) on delete set null,
  descripcion   text,
  referencia    text,
  monto         numeric(12,2) not null,
  moneda        text default 'COP',
  fecha_emision date default current_date not null,
  fecha_vencimiento date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists cuentas_por_pagar_fecha_venc_idx on cuentas_por_pagar (fecha_vencimiento);
create index if not exists cuentas_por_pagar_proveedor_idx on cuentas_por_pagar (proveedor_id);

-- Tabla: pagos asociados a cuentas por pagar
create table if not exists cuentas_por_pagar_pagos (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references cuentas_por_pagar(id) on delete cascade,
  monto       numeric(12,2) not null,
  fecha       date default current_date not null,
  metodo_pago text,
  referencia  text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists cpp_pagos_cuenta_idx on cuentas_por_pagar_pagos (cuenta_id);
create index if not exists cpp_pagos_fecha_idx on cuentas_por_pagar_pagos (fecha desc);

-- Habilitar RLS y políticas básicas (ajusta según tus reglas)
alter table cuentas_por_pagar enable row level security;
create policy "Allow all for authenticated"
  on cuentas_por_pagar
  for all
  to authenticated
  using (true)
  with check (true);

alter table cuentas_por_pagar_pagos enable row level security;
create policy "Allow all for authenticated - pagos"
  on cuentas_por_pagar_pagos
  for all
  to authenticated
  using (true)
  with check (true);

-- Vista con total pagado y saldo calculado por cuenta
create or replace view cuentas_por_pagar_with_saldo as
select
  cp.*,
  coalesce(p.total_pagado, 0)::numeric(12,2) as total_pagado,
  (cp.monto - coalesce(p.total_pagado, 0))::numeric(12,2) as saldo,
  case
    when cp.monto <= coalesce(p.total_pagado, 0) then 'pagada'
    when coalesce(p.total_pagado,0) > 0 then 'parcial'
    else 'pendiente'
  end as estado_calculado
from cuentas_por_pagar cp
left join (
  select cuenta_id, sum(monto)::numeric(12,2) as total_pagado
  from cuentas_por_pagar_pagos
  group by cuenta_id
) p on p.cuenta_id = cp.id;

-- Vista resumen para dashboard: totales pendientes y contadores
create or replace view dashboard_cuentas_por_pagar_summary as
select
  count(*) filter (where (monto - coalesce(p.total_pagado,0)) > 0) as cuentas_pendientes,
  count(*) filter (where (monto - coalesce(p.total_pagado,0)) <= 0) as cuentas_pagadas,
  sum(monto)::numeric(18,2) as total_monto,
  sum(coalesce(p.total_pagado,0))::numeric(18,2) as total_pagado,
  sum((monto - coalesce(p.total_pagado,0)))::numeric(18,2) as total_saldo_pendiente
from cuentas_por_pagar cp
left join (
  select cuenta_id, sum(monto)::numeric(12,2) as total_pagado
  from cuentas_por_pagar_pagos
  group by cuenta_id
) p on p.cuenta_id = cp.id;

-- Trigger para actualizar updated_at en cuentas_por_pagar
create or replace function trg_update_cuentas_por_pagar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cuentas_por_pagar_set_updated_at on cuentas_por_pagar;
create trigger cuentas_por_pagar_set_updated_at
  before update on cuentas_por_pagar
  for each row execute function trg_update_cuentas_por_pagar_updated_at();

-- Fin
