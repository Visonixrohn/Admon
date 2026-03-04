-- ============================================================
-- MÓDULO DE FACTURACIÓN SAR HN (Honduras)
-- ============================================================

-- ----------------------------------------------------------------
-- 1. DATOS DE FACTURACIÓN (CAI, rangos, emisor)
--    Un solo registro por empresa (upsert sobre id fijo o rtn)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datos_facturacion (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos del emisor
  nombre          TEXT NOT NULL,
  rtn             VARCHAR(14) NOT NULL,          -- 14 dígitos sin guiones
  direccion       TEXT,
  telefono        TEXT,
  email           TEXT,
  sitio_web       TEXT,

  -- Autorización SAR
  cai             VARCHAR(44) NOT NULL,          -- XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX
  rango_inicio    VARCHAR(20) NOT NULL,          -- 000-001-01-00000001 (correlativo inicio)
  rango_fin       VARCHAR(20) NOT NULL,          -- 000-001-01-99999999 (correlativo fin)
  fecha_limite    DATE         NOT NULL,         -- fecha límite de emisión
  numero_orden    TEXT,                          -- No. de orden de compra exenta (opcional)

  -- Control de correlativo
  correlativo_actual  BIGINT NOT NULL DEFAULT 1, -- último número emitido
  prefijo_establecimiento  VARCHAR(3)  DEFAULT '000', -- ej. 000
  prefijo_punto_emision    VARCHAR(3)  DEFAULT '001', -- ej. 001
  prefijo_tipo_doc         VARCHAR(2)  DEFAULT '01',  -- 01 = factura

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 2. CATÁLOGO DE PRODUCTOS / SERVICIOS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos_servicios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          VARCHAR(50),
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  tipo            VARCHAR(10) NOT NULL DEFAULT 'servicio',  -- 'producto' | 'servicio'
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidad_medida   VARCHAR(30)  DEFAULT 'unidad',
  -- Tipo de gravamen SAR HN
  tipo_gravamen   VARCHAR(20)  NOT NULL DEFAULT 'gravado_15',
  -- 'exento'       → exento de ISV
  -- 'exonerado'    → exonerado (requiere constancia)
  -- 'tasa_cero'    → alícuota tasa cero
  -- 'gravado_15'   → ISV 15 %
  -- 'gravado_18'   → ISV 18 % (bebidas alcohólicas, tabaco, etc.)
  activo          BOOLEAN  DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. FACTURAS (cabecera)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Número de factura formato SAR: XXX-XXX-XX-XXXXXXXX
  numero_factura  VARCHAR(20)  NOT NULL UNIQUE,  -- correlativo completo
  cai             VARCHAR(44)  NOT NULL,
  fecha_emision   DATE         NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite    DATE,                          -- fecha límite del CAI vigente

  -- Cliente (receptor)
  cliente_id      UUID,                          -- referencia opcional a tabla clients
  cliente_nombre  TEXT         NOT NULL,
  cliente_rtn     VARCHAR(14),
  cliente_direccion TEXT,
  cliente_email   TEXT,

  -- Totales calculados
  subtotal               NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_exentos        NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_exonerados     NUMERIC(12,2) NOT NULL DEFAULT 0,
  valores_tasa_cero      NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_gravable_15      NUMERIC(12,2) NOT NULL DEFAULT 0,
  isv_15                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_gravable_18      NUMERIC(12,2) NOT NULL DEFAULT 0,
  isv_18                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                  NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- ISR retenido (si aplica)
  isr_retenido           NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Estado
  estado          VARCHAR(20)  NOT NULL DEFAULT 'emitida',
  -- 'emitida' | 'anulada' | 'pagada'

  -- Campos auxiliares SAR
  no_orden_exenta         TEXT,
  no_constancia_exonerado TEXT,
  no_registro_sag         TEXT,

  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 4. DETALLE DE FACTURAS (líneas)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_facturas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id      UUID         NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  linea           INTEGER      NOT NULL DEFAULT 1,

  -- Producto o servicio
  producto_id     UUID,                          -- referencia opcional a productos_servicios
  descripcion     TEXT         NOT NULL,
  cantidad        NUMERIC(12,4) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento       NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Tipo de gravamen SAR HN
  tipo_gravamen   VARCHAR(20)  NOT NULL DEFAULT 'gravado_15',

  -- Calculados
  subtotal_linea  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- (cant * precio) - descuento
  isv_linea       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_linea     NUMERIC(12,2) NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 5. ÍNDICES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_facturas_fecha       ON facturas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente     ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado      ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_factura_id   ON detalle_facturas(factura_id);
CREATE INDEX IF NOT EXISTS idx_productos_tipo       ON productos_servicios(tipo);

-- ----------------------------------------------------------------
-- 6. TRIGGER updated_at (reutilizable)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_datos_facturacion_updated_at
  BEFORE UPDATE ON datos_facturacion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_productos_updated_at
  BEFORE UPDATE ON productos_servicios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------
-- Row Level Security (Supabase)
-- ----------------------------------------------------------------
ALTER TABLE datos_facturacion    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_servicios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_facturas     ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (misma lógica que el resto de la app)
CREATE POLICY "allow_all_datos_facturacion"   ON datos_facturacion    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_productos_servicios" ON productos_servicios  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_facturas"            ON facturas             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_detalle_facturas"    ON detalle_facturas     FOR ALL USING (true) WITH CHECK (true);
