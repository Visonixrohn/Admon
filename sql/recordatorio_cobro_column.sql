-- Agregar columna para registrar el último recordatorio de cobro enviado
ALTER TABLE suscripciones 
ADD COLUMN ultimo_recordatorio_cobro TIMESTAMP WITH TIME ZONE;

-- Agregar comentario descriptivo a la columna
COMMENT ON COLUMN suscripciones.ultimo_recordatorio_cobro IS 'Fecha y hora del último recordatorio de cobro enviado al cliente';

-- Crear índice para mejorar consultas de suscripciones con recordatorios pendientes
CREATE INDEX idx_suscripciones_ultimo_recordatorio ON suscripciones(ultimo_recordatorio_cobro, proxima_fecha_de_pago) 
WHERE is_active = true;
