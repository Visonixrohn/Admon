-- Agregar columna dirección a la tabla clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS direccion TEXT;

COMMENT ON COLUMN clientes.direccion IS 'Dirección física del cliente';
