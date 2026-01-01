# Configuración del Bucket de Contratos en Supabase

## 1. Crear el Bucket en Supabase Storage

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. En el menú lateral, selecciona **Storage**
3. Haz clic en **"Create a new bucket"** o **"New bucket"**
4. Configura el bucket con los siguientes datos:
   - **Name**: `contratos-firmados`
   - **Public**: ❌ **NO** (debe ser privado para proteger los contratos)
   - Haz clic en **"Create bucket"**

## 2. Configurar las Políticas de Seguridad (RLS - Row Level Security)

Después de crear el bucket, debes configurar las políticas para controlar el acceso:

### 2.1. Política para SUBIR archivos (INSERT)

```sql
CREATE POLICY "Usuarios autenticados pueden subir contratos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contratos-firmados'
);
```

### 2.2. Política para LEER archivos (SELECT)

```sql
CREATE POLICY "Usuarios autenticados pueden ver contratos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contratos-firmados'
);
```

### 2.3. Política para ACTUALIZAR archivos (UPDATE)

```sql
CREATE POLICY "Usuarios autenticados pueden actualizar contratos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contratos-firmados'
)
WITH CHECK (
  bucket_id = 'contratos-firmados'
);
```

### 2.4. Política para ELIMINAR archivos (DELETE)

```sql
CREATE POLICY "Usuarios autenticados pueden eliminar contratos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contratos-firmados'
);
```

## 3. Aplicar las Políticas desde la UI de Supabase

1. Ve a **Storage** → **Policies** en tu proyecto de Supabase
2. Selecciona el bucket `contratos-firmados`
3. Haz clic en **"New Policy"**
4. Para cada política:
   - Selecciona el tipo de operación (INSERT, SELECT, UPDATE, DELETE)
   - Elige **"Custom"** o **"For authenticated users"**
   - Pega el código SQL correspondiente
   - Haz clic en **"Review"** y luego **"Save policy"**

## 4. Configurar Límites de Archivo (Opcional pero Recomendado)

En la configuración del bucket, puedes establecer:

- **File size limit**: 10 MB (suficiente para PDFs)
- **Allowed MIME types**: `application/pdf`

## 5. Estructura de Rutas en el Bucket

Los contratos se guardarán con la siguiente estructura:

```
contratos-firmados/
  ├── {venta-id}-{timestamp}.pdf
  ├── {venta-id}-{timestamp}.pdf
  └── ...
```

Ejemplo: `a1b2c3d4-1640995200000.pdf`

## 6. Verificar la Configuración

Para verificar que todo funciona:

1. **Desde SQL Editor en Supabase**:

```sql
-- Verificar que el bucket existe
SELECT * FROM storage.buckets WHERE name = 'contratos-firmados';

-- Verificar las políticas
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

2. **Desde la aplicación**:
   - Intenta subir un contrato desde la UI
   - Verifica que aparece en Storage → contratos-firmados
   - Intenta visualizar el contrato

## 7. Notas Importantes

- ✅ El bucket debe ser **PRIVADO** para proteger información confidencial
- ✅ Solo usuarios autenticados pueden acceder a los contratos
- ✅ Los archivos se nombran con el ID de la venta + timestamp para evitar conflictos
- ✅ Se recomienda limitar el tamaño a 10 MB máximo
- ✅ Solo permitir archivos PDF mediante validación en frontend y configuración del bucket

## 8. URL de Acceso a los Contratos

Una vez subido, la URL del contrato será:

```
https://{tu-proyecto}.supabase.co/storage/v1/object/sign/contratos-firmados/{nombre-archivo}.pdf?token={token-temporal}
```

La aplicación generará automáticamente URLs firmadas temporales para acceder a los archivos de forma segura.
