# Funcionalidad de Contratos PDF - Documentación de Implementación

## 📋 Resumen

Se ha implementado la funcionalidad completa para gestionar contratos PDF en el sistema, permitiendo:

- ✅ Subir contratos firmados en formato PDF
- ✅ Visualizar contratos existentes
- ✅ Eliminar y actualizar contratos
- ✅ Integración en múltiples secciones: Ventas de Proyectos, Contratos Activos y Suscripciones

---

## 🗄️ Cambios en Base de Datos

### SQL para agregar columnas

Se debe ejecutar el archivo: [`sql/venta_contrato_column.sql`](sql/venta_contrato_column.sql)

Este script agrega la columna `contrato_url` a tres tablas:

- ✅ `venta`
- ✅ `contratos`
- ✅ `suscripciones`

**Ejecutar en Supabase SQL Editor:**

```sql
-- Agregar columna a la tabla venta
ALTER TABLE venta ADD COLUMN contrato_url TEXT;

-- Agregar columna a la tabla contratos
ALTER TABLE contratos ADD COLUMN contrato_url TEXT;

-- Agregar columna a la tabla suscripciones
ALTER TABLE suscripciones ADD COLUMN contrato_url TEXT;
```

---

## 🪣 Configuración del Bucket en Supabase

### Pasos para crear el bucket

Consulta el archivo: [`CONTRATOS_BUCKET_SETUP.md`](CONTRATOS_BUCKET_SETUP.md)

**Resumen rápido:**

1. **Crear bucket en Supabase Storage:**

   - Nombre: `contratos-firmados`
   - Tipo: **PRIVADO** (no público)
   - Tamaño máximo: 10 MB
   - Tipo permitido: `application/pdf`

2. **Configurar políticas RLS (Row Level Security):**

   - **INSERT**: Permitir a usuarios autenticados subir contratos
   - **SELECT**: Permitir a usuarios autenticados ver contratos
   - **UPDATE**: Permitir a usuarios autenticados actualizar contratos
   - **DELETE**: Permitir a usuarios autenticados eliminar contratos

3. **Aplicar políticas desde SQL Editor:**

```sql
-- Política para subir contratos
CREATE POLICY "Usuarios autenticados pueden subir contratos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos-firmados');

-- Política para ver contratos
CREATE POLICY "Usuarios autenticados pueden ver contratos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contratos-firmados');

-- Política para actualizar contratos
CREATE POLICY "Usuarios autenticados pueden actualizar contratos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'contratos-firmados')
WITH CHECK (bucket_id = 'contratos-firmados');

-- Política para eliminar contratos
CREATE POLICY "Usuarios autenticados pueden eliminar contratos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos-firmados');
```

---

## 🎨 Componentes Creados

### 1. `ContratoDialog`

**Archivo:** [`client/src/components/contrato-dialog.tsx`](client/src/components/contrato-dialog.tsx)

Modal para:

- Subir contratos PDF (máximo 10 MB)
- Visualizar contratos existentes en nueva pestaña
- Eliminar contratos
- Reemplazar contratos existentes

**Props:**

```typescript
interface ContratoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventaId?: string;
  contratoId?: string;
  suscripcionId?: string;
  contratoUrl?: string | null;
  onContratoUpdated?: () => void;
  tableName?: "venta" | "contratos" | "suscripciones";
}
```

### 2. `ContratoButton`

**Archivo:** [`client/src/components/contrato-button.tsx`](client/src/components/contrato-button.tsx)

Botón/Ícono para acceder al diálogo de contratos.

**Variantes:**

- **icon**: Muestra un ícono (usado en tablas)
  - 📄 Verde si tiene contrato
  - ⬆️ Gris si no tiene contrato
- **button**: Muestra un botón con texto completo

**Props:**

```typescript
interface ContratoButtonProps {
  ventaId?: string;
  contratoId?: string;
  suscripcionId?: string;
  contratoUrl?: string | null;
  onContratoUpdated?: () => void;
  variant?: "icon" | "button";
  tableName?: "venta" | "contratos" | "suscripciones";
}
```

---

## 📍 Integración en Páginas

### 1. Ventas de Proyectos

**Archivo:** [`client/src/pages/proyecto-ventas.tsx`](client/src/pages/proyecto-ventas.tsx)

- ✅ Agregado campo `contrato_url` al tipo `VentaRow`
- ✅ Importado componente `ContratoButton`
- ✅ Agregado botón de contrato en cada fila de la tabla
- ✅ Configurado con `tableName="venta"`

**Ubicación del botón:** Esquina superior derecha de cada card de venta

### 2. Contratos Activos

**Archivo:** [`client/src/pages/contratos-activos.tsx`](client/src/pages/contratos-activos.tsx)

- ✅ Importado componente `ContratoButton`
- ✅ Agregado campo `contrato_url` al mapeo de datos
- ✅ Agregado botón de contrato en `ContractCard`
- ✅ Configurado con `tableName="contratos"`

**Ubicación del botón:** Al lado del badge de estado en cada card

### 3. Suscripciones

**Archivo:** [`client/src/pages/subscriptions.tsx`](client/src/pages/subscriptions.tsx)

- ✅ Importado componente `ContratoButton`
- ✅ Agregado campo `contrato_url` a `SubscriptionWithClient`
- ✅ Agregado columna "Contrato" en la tabla
- ✅ Agregado botón de contrato en cada fila
- ✅ Agregado botón en el card de detalle
- ✅ Configurado con `tableName="suscripciones"`

**Ubicaciones:**

- **En tabla:** Nueva columna "Contrato" con ícono
- **En card de detalle:** Botón en la sección superior junto al menú

---

## 🎯 Flujo de Usuario

### Si NO hay contrato registrado:

1. Usuario ve ícono de "Subir" (⬆️) en gris
2. Al hacer clic, se abre el modal
3. Usuario selecciona archivo PDF (máx 10 MB)
4. El archivo se sube automáticamente
5. Se actualiza la URL en la base de datos
6. El ícono cambia a verde (📄)

### Si YA hay contrato registrado:

1. Usuario ve ícono verde (📄)
2. Al hacer clic, se abre el modal con opciones:
   - **Ver Contrato**: Abre el PDF en nueva pestaña
   - **Reemplazar**: Permite subir un nuevo archivo (elimina el anterior)
   - **Eliminar**: Elimina el contrato y limpia la URL

---

## 🔒 Seguridad

- ✅ **Bucket privado**: Solo usuarios autenticados pueden acceder
- ✅ **URLs firmadas**: Los contratos se visualizan mediante URLs temporales (1 hora)
- ✅ **Validación de tipo**: Solo archivos PDF permitidos
- ✅ **Validación de tamaño**: Máximo 10 MB por archivo
- ✅ **RLS habilitado**: Políticas de seguridad a nivel de fila

---

## 📦 Estructura de Archivos en Storage

```
contratos-firmados/
  ├── {venta-id}-1704067200000.pdf
  ├── {contrato-id}-1704067300000.pdf
  ├── {suscripcion-id}-1704067400000.pdf
  └── ...
```

**Formato del nombre:** `{id}-{timestamp}.pdf`

---

## 🧪 Pruebas Recomendadas

### 1. Prueba de subida

- [ ] Subir un PDF válido (< 10 MB)
- [ ] Intentar subir archivo no-PDF (debe rechazar)
- [ ] Intentar subir archivo > 10 MB (debe rechazar)

### 2. Prueba de visualización

- [ ] Ver contrato en nueva pestaña
- [ ] Verificar que la URL firmada funcione

### 3. Prueba de actualización

- [ ] Reemplazar un contrato existente
- [ ] Verificar que el archivo anterior se elimine

### 4. Prueba de eliminación

- [ ] Eliminar un contrato
- [ ] Verificar que el campo `contrato_url` sea NULL

### 5. Prueba en diferentes secciones

- [ ] Ventas de Proyectos
- [ ] Contratos Activos
- [ ] Suscripciones

---

## 🐛 Solución de Problemas

### Error: "No se pudo subir el contrato"

- Verificar que el bucket `contratos-firmados` exista
- Verificar que las políticas RLS estén configuradas
- Verificar que el usuario esté autenticado

### Error: "No se puede visualizar el contrato"

- Verificar que la URL del contrato sea válida
- Verificar que el archivo exista en Storage
- Verificar permisos de lectura en el bucket

### El ícono no cambia de color

- Verificar que `contrato_url` esté en la query
- Verificar que se llame `onContratoUpdated()` después de subir
- Refrescar la página

---

## 📝 Notas Adicionales

1. **Rendimiento:** Las imágenes se optimizan automáticamente al subir
2. **Caché:** Los contratos se cachean por 1 hora en el navegador
3. **Límites:** Supabase Free Tier: 1 GB de storage, 50 GB de transferencia/mes
4. **Backup:** Considerar exportar los contratos periódicamente

---

## ✅ Checklist de Implementación

- [x] Crear archivo SQL para columnas
- [x] Documentar configuración del bucket
- [x] Crear componente `ContratoDialog`
- [x] Crear componente `ContratoButton`
- [x] Integrar en Ventas de Proyectos
- [x] Integrar en Contratos Activos
- [x] Integrar en Suscripciones
- [x] Documentar funcionalidad completa

---

## 🚀 Próximos Pasos

Para completar la implementación:

1. **Ejecutar SQL en Supabase** → [`sql/venta_contrato_column.sql`](sql/venta_contrato_column.sql)
2. **Configurar bucket** → Seguir [`CONTRATOS_BUCKET_SETUP.md`](CONTRATOS_BUCKET_SETUP.md)
3. **Probar la funcionalidad** en cada sección
4. **Capacitar usuarios** sobre cómo usar la nueva funcionalidad

---

¡Implementación completada! 🎉
