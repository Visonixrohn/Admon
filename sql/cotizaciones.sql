-- ═══════════════════════════════════════════════════════════════════════════════
-- MÓDULO COTIZACIONES
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Secuencia para número correlativo ────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS cotizacion_seq START 1;

-- ── 2. Tabla principal de cotizaciones ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS cotizaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Número legible: COT-2025-00001
  numero_cotizacion     TEXT NOT NULL UNIQUE,

  -- Fechas
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_validez         DATE,          -- hasta cuándo es válida

  -- Cliente
  cliente_nombre        TEXT NOT NULL,
  cliente_rtn           TEXT,
  cliente_direccion     TEXT,
  cliente_email         TEXT,
  cliente_telefono      TEXT,

  -- Totales financieros (misma estructura que facturas para consistencia)
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_total       NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_exentos       NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_exonerados    NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_tasa_cero     NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_gravable_15     NUMERIC(12,2) NOT NULL DEFAULT 0,
  isv_15                NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_gravable_18     NUMERIC(12,2) NOT NULL DEFAULT 0,
  isv_18                NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Observaciones / condiciones de la cotización
  notas                 TEXT,
  condiciones           TEXT DEFAULT 'Precios en Lempiras. Impuestos incluidos donde aplique.',

  -- Estado: borrador | enviada | aceptada | rechazada | vencida | cancelada
  estado                TEXT NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador','enviada','aceptada','rechazada','vencida','cancelada')),

  -- Auditoría
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Detalle de líneas de cotización ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS detalle_cotizaciones (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id    UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  linea            INTEGER NOT NULL,
  descripcion      TEXT NOT NULL,
  cantidad         NUMERIC(10,4) NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC(12,6) NOT NULL DEFAULT 0,
  descuento        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tipo_gravamen    TEXT NOT NULL DEFAULT 'gravado_15'
                     CHECK (tipo_gravamen IN ('gravado_15','gravado_18','exento','exonerado','tasa_cero')),
  subtotal_linea   NUMERIC(12,2) NOT NULL DEFAULT 0,
  isv_linea        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_linea      NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ── 4. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha    ON cotizaciones(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente  ON cotizaciones(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado   ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_det_cot_cot_id        ON detalle_cotizaciones(cotizacion_id);

-- ── 5. Trigger updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotizaciones_updated_at ON cotizaciones;
CREATE TRIGGER trg_cotizaciones_updated_at
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Función para generar número de cotización ─────────────────────────────
-- Genera: COT-YYYY-00001 usando la secuencia
CREATE OR REPLACE FUNCTION siguiente_numero_cotizacion()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  seq_val BIGINT;
  anio    TEXT;
BEGIN
  seq_val := nextval('cotizacion_seq');
  anio    := to_char(NOW(), 'YYYY');
  RETURN 'COT-' || anio || '-' || lpad(seq_val::TEXT, 5, '0');
END;
$$;

-- ── 7. RLS mínimo (ajusta según tus políticas) ───────────────────────────────
ALTER TABLE cotizaciones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_cotizaciones ENABLE ROW LEVEL SECURITY;

-- Política permisiva para todos los roles autenticados (igual que tus otras tablas)
DROP POLICY IF EXISTS "allow_all_cotizaciones"         ON cotizaciones;
DROP POLICY IF EXISTS "allow_all_detalle_cotizaciones" ON detalle_cotizaciones;

CREATE POLICY "allow_all_cotizaciones"
  ON cotizaciones FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_detalle_cotizaciones"
  ON detalle_cotizaciones FOR ALL
  USING (true) WITH CHECK (true);

-- ── Verificación ─────────────────────────────────────────────────────────────
SELECT 'cotizaciones OK → ' || siguiente_numero_cotizacion() AS resultado;
