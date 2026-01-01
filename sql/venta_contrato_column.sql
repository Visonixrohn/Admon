-- Agregar columna para almacenar la URL del contrato PDF en la tabla venta
ALTER TABLE venta 
ADD COLUMN contrato_url TEXT;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN venta.contrato_url IS 'URL del contrato PDF almacenado en Supabase Storage';

-- Crear índice para mejorar las consultas que filtren por contratos existentes
CREATE INDEX idx_venta_contrato_url ON venta(contrato_url) WHERE contrato_url IS NOT NULL;

-- También agregar la columna a la tabla contratos
ALTER TABLE contratos 
ADD COLUMN contrato_url TEXT;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN contratos.contrato_url IS 'URL del contrato PDF almacenado en Supabase Storage';

-- Crear índice para mejorar las consultas que filtren por contratos existentes
CREATE INDEX idx_contratos_contrato_url ON contratos(contrato_url) WHERE contrato_url IS NOT NULL;

-- También agregar la columna a la tabla suscripciones
ALTER TABLE suscripciones 
ADD COLUMN contrato_url TEXT;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN suscripciones.contrato_url IS 'URL del contrato PDF almacenado en Supabase Storage';

-- Crear índice para mejorar las consultas que filtren por contratos existentes
CREATE INDEX idx_suscripciones_contrato_url ON suscripciones(contrato_url) WHERE contrato_url IS NOT NULL;
