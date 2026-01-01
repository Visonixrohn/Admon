# Sistema de Recordatorios de Cobro por Email

## Resumen

Se ha implementado un sistema completo para enviar recordatorios de pago por correo electrónico a clientes con suscripciones atrasadas. El sistema incluye protección anti-spam (solo 1 envío por día) y validaciones de seguridad.

## Archivos Creados

### 1. SQL - Columna de Email en Clientes

**Archivo:** `sql/clientes_email_column.sql`

Agrega la columna `email` a la tabla `clientes` para almacenar los correos electrónicos.

```sql
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
```

### 2. SQL - Columna de Último Recordatorio

**Archivo:** `sql/recordatorio_cobro_column.sql`

Agrega la columna `ultimo_recordatorio_cobro` a la tabla `suscripciones` para rastrear cuándo se envió el último recordatorio.

```sql
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS ultimo_recordatorio_cobro TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_suscripciones_ultimo_recordatorio ON suscripciones(ultimo_recordatorio_cobro);
```

### 3. Google Apps Script

**Archivo:** `google-scripts/recordatorio-cobro.gs`

Script completo de Google Apps Script que:

- Recibe solicitudes POST desde el frontend
- Valida la API Key para seguridad
- Envía correos electrónicos HTML con Gmail API
- Incluye template HTML responsive con diseño profesional
- Maneja errores y logs

**Características del email:**

- Encabezado con gradiente personalizado
- Saludo personalizado con nombre del cliente
- Tabla con información del pago (proyecto, monto, fecha vencimiento, días atraso)
- Botón de contacto
- Footer corporativo

### 4. Documentación de Configuración

**Archivo:** `CONFIGURACION_EMAIL.md`

Guía paso a paso para configurar el sistema completo:

- Ejecución de SQL
- Configuración de variables de entorno
- Despliegue del Google Apps Script
- Troubleshooting

### 5. Variables de Entorno

**Archivo:** `.env.example`

Template para las variables de entorno necesarias:

- `VITE_GOOGLE_SCRIPT_URL`: URL del Web App de Google Apps Script
- `VITE_GOOGLE_SCRIPT_API_KEY`: Clave secreta para autenticación

## Archivos Modificados

### 1. Frontend - Página de Suscripciones

**Archivo:** `client/src/pages/subscriptions.tsx`

**Cambios principales:**

- Agregado estado `enviandoRecordatorio` para UI durante el envío
- Agregado estado `clientsEmailMap` para cargar emails de clientes
- Modificada función `loadMeta()` para incluir emails en la consulta
- Agregada función `enviarRecordatorioCobro()` con toda la lógica de validación y envío
- Actualizada interfaz `SubscriptionWithClient` con campos `clientEmail` y `ultimo_recordatorio_cobro`
- Modificada columna "Acción" por "Recordatorio" en la tabla
- Agregado botón "Recordatorio" con lógica condicional:
  - Solo aparece si >= 2 días de atraso
  - Solo en suscripciones activas
  - Se reemplaza por texto "Enviado hoy" si ya se envió hoy
  - Muestra spinner "Enviando..." durante el envío

**Lógica de validación:**

```typescript
// Validar que tenga email
if (!suscripcion.clientEmail) { ... }

// Calcular días de atraso
const diasAtraso = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

// Solo enviar si >= 2 días de atraso
if (diasAtraso < 2) { ... }

// Verificar si ya se envió hoy
if (ultimoRecordatorio.getTime() === today.getTime()) { ... }
```

**Integración con Google Script:**

```typescript
const response = await fetch(scriptUrl, {
  method: "POST",
  mode: "no-cors",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    apiKey,
    clienteEmail,
    clienteNombre,
    proyectoNombre,
    mensualidad,
    diasAtraso,
    fechaVencimiento,
  }),
});

// Actualizar fecha de último recordatorio en DB
await supabase
  .from("suscripciones")
  .update({ ultimo_recordatorio_cobro: new Date().toISOString() })
  .eq("id", suscripcion.id);
```

### 2. Google Apps Script - Validación de Email

**Archivo:** `google-scripts/recordatorio-cobro.gs`

Agregada validación para manejar casos donde el cliente no tiene email:

```javascript
// Validar que el email existe
if (!clienteEmail || clienteEmail.trim() === "") {
  Logger.log("Error: Email del cliente no proporcionado");
  return {
    success: false,
    error: "Email del cliente no configurado",
  };
}
```

## Flujo de Funcionamiento

### 1. Usuario abre página de Suscripciones

- Se cargan las suscripciones desde Supabase
- Se cargan los nombres y emails de los clientes
- Se cargan los nombres de los proyectos

### 2. Sistema evalúa cada suscripción

Para cada suscripción activa:

- Calcula días de atraso: `hoy - próxima_fecha_de_pago`
- Verifica si >= 2 días de atraso
- Verifica si ya se envió recordatorio hoy
- Muestra botón o texto según corresponda

### 3. Usuario hace clic en "Recordatorio"

1. **Validación local:**

   - Email configurado ✓
   - Fecha de pago configurada ✓
   - > = 2 días de atraso ✓
   - No enviado hoy ✓

2. **Envío al Google Apps Script:**

   - Fetch POST con datos del cliente y pago
   - Modo `no-cors` para evitar problemas de CORS
   - Incluye API Key para autenticación

3. **Google Script procesa:**

   - Valida API Key
   - Valida email del cliente
   - Genera HTML del correo
   - Envía email via Gmail API
   - Retorna resultado

4. **Actualización en DB:**

   - Guarda timestamp actual en `ultimo_recordatorio_cobro`
   - Invalida queries de React Query
   - Actualiza UI automáticamente

5. **Feedback al usuario:**
   - Toast con mensaje de éxito/error
   - El botón desaparece y muestra "Enviado hoy"

## Protecciones y Validaciones

### Frontend

- ✅ Validar que el cliente tenga email
- ✅ Validar que la suscripción tenga fecha de próximo pago
- ✅ Validar que tenga al menos 2 días de atraso
- ✅ Validar que no se haya enviado hoy
- ✅ Validar que las variables de entorno estén configuradas
- ✅ Deshabilitar botón durante el envío
- ✅ Mostrar estado "Enviando..." con spinner

### Backend (Google Apps Script)

- ✅ Validar API Key en cada request
- ✅ Validar que el email no esté vacío
- ✅ Manejo de errores con try-catch
- ✅ Logging de todas las operaciones
- ✅ Validación de estructura de datos recibidos

### Base de Datos

- ✅ Índice en `clientes.email` para búsquedas rápidas
- ✅ Índice en `suscripciones.ultimo_recordatorio_cobro` para filtrado
- ✅ Tipo `TIMESTAMP` para registro preciso de fecha/hora

## Reglas de Negocio

1. **Solo suscripciones activas:** `is_active = true`
2. **Mínimo 2 días de atraso:** `(hoy - proxima_fecha_de_pago) >= 2 días`
3. **Máximo 1 envío por día:** Verifica `ultimo_recordatorio_cobro`
4. **Email obligatorio:** No envía si el cliente no tiene email

## Configuración Requerida

### Paso 1: Ejecutar SQL en Supabase

```bash
# Agregar columna email a clientes
psql < sql/clientes_email_column.sql

# Agregar columna ultimo_recordatorio_cobro a suscripciones
psql < sql/recordatorio_cobro_column.sql
```

### Paso 2: Agregar Emails a Clientes

En el dashboard de Supabase, actualizar la tabla `clientes` con los emails correspondientes.

### Paso 3: Crear archivo `.env.local`

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxJYfBUs_NLj70YgH05vXE36QYvmR5Rtabgrmdw4h0MQd0oripfrmueoT5jXZvL_5m7OQ/exec
VITE_GOOGLE_SCRIPT_API_KEY=tu-clave-secreta-aqui
```

### Paso 4: Configurar Google Apps Script

1. El script ya está desplegado en la URL proporcionada
2. Actualizar la constante `API_SECRET_KEY` con la misma clave que pusiste en `.env.local`
3. Verificar permisos de Gmail API

### Paso 5: Build y Deploy

```bash
npm run build
git add .
git commit -m "feat: Sistema de recordatorios de cobro por email"
git push origin main
```

## Testing

### Casos de prueba

1. ✅ Suscripción con 1 día de atraso → No debe mostrar botón
2. ✅ Suscripción con 2 días de atraso → Debe mostrar botón
3. ✅ Enviar recordatorio → Debe llegar email y actualizar DB
4. ✅ Intentar enviar de nuevo el mismo día → Debe mostrar "Enviado hoy"
5. ✅ Cliente sin email → Debe mostrar error
6. ✅ Suscripción pausada → No debe mostrar botón

## Próximas Mejoras (Opcional)

1. **Historial de envíos:** Crear tabla para registrar todos los envíos
2. **Templates personalizables:** Permitir editar el template desde el admin
3. **Automatización:** Cron job para enviar recordatorios automáticamente
4. **Múltiples recordatorios:** Escalar recordatorios (2 días, 5 días, 7 días)
5. **Canal adicional:** Agregar envío por WhatsApp además de email
6. **Dashboard de cobranza:** Vista especializada para gestión de cobros

## Soporte

Si tienes problemas, revisa:

1. **CONFIGURACION_EMAIL.md** - Guía completa de setup
2. **Logs de Google Apps Script** - Para errores del backend
3. **Console del navegador** - Para errores del frontend
4. **Tabla suscripciones** - Para verificar que `ultimo_recordatorio_cobro` se actualiza

## Autor

Implementación completada para Visonix - Panel de Administración
