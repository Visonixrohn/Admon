-- Agregar columna de email/correo a la tabla clientes
ALTER TABLE clientes 
ADD COLUMN email TEXT;

-- Agregar comentario descriptivo
COMMENT ON COLUMN clientes.email IS 'Correo electrónico del cliente para notificaciones';

-- Crear índice para búsquedas rápidas por email
CREATE INDEX idx_clientes_email ON clientes(email);

-- Opcional: Si quieres que el email sea único (descomentar si lo necesitas)
-- ALTER TABLE clientes ADD CONSTRAINT clientes_email_unique UNIQUE (email);
