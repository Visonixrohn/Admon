# Configuración de Emails para Recordatorios de Cobro

## Pasos para configurar el sistema de envío de correos

### 1. Ejecutar SQL para agregar columna de email a clientes

```sql
-- Agregar columna de email a la tabla clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
```

**Ubicación:** `sql/clientes_email_column.sql`

### 2. Ejecutar SQL para agregar columna de último recordatorio

```sql
-- Agregar columna para rastrear cuándo se envió el último recordatorio
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS ultimo_recordatorio_cobro TIMESTAMP;

-- Crear índice para filtrado rápido
CREATE INDEX IF NOT EXISTS idx_suscripciones_ultimo_recordatorio
ON suscripciones(ultimo_recordatorio_cobro);
```

**Ubicación:** `sql/recordatorio_cobro_column.sql`

### 3. Actualizar emails de clientes en Supabase

Ve a tu dashboard de Supabase y agrega los correos electrónicos a cada cliente en la tabla `clientes`.

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# URL del Web App de Google Apps Script
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxJYfBUs_NLj70YgH05vXE36QYvmR5Rtabgrmdw4h0MQd0oripfrmueoT5jXZvL_5m7OQ/exec

# API Secret Key (debe coincidir con la configurada en Google Apps Script)
VITE_GOOGLE_SCRIPT_API_KEY=tu-clave-secreta-aqui-12345
```

**IMPORTANTE:**

- Cambia `tu-clave-secreta-aqui-12345` por una clave secreta fuerte
- Esta misma clave debe estar configurada en el Google Apps Script en la constante `API_SECRET_KEY`
- El archivo `.env.local` NO debe subirse a Git (ya está en .gitignore)

### 5. Verificar Google Apps Script

Tu Google Apps Script ya está desplegado en:
https://script.google.com/macros/s/AKfycbxJYfBUs_NLj70YgH05vXE36QYvmR5Rtabgrmdw4h0MQd0oripfrmueoT5jXZvL_5m7OQ/exec

Asegúrate de que:

1. El script tiene permisos de Gmail API
2. La constante `API_SECRET_KEY` está configurada con la misma clave que pusiste en `.env.local`
3. El `FROM_EMAIL` es tu correo de Gmail autorizado
4. El script está desplegado como "Web App" con acceso "Anyone"

### 6. Probar el envío

1. Ve a la página de **Suscripciones**
2. Busca una suscripción que tenga **2 o más días de atraso**
3. Verifica que el cliente tenga un email configurado
4. Haz clic en el botón **"Recordatorio"**
5. El sistema enviará el email y marcará la fecha de envío

**Reglas anti-spam:**

- Solo se puede enviar **1 recordatorio por día** por suscripción
- El botón se reemplaza por "Enviado hoy" después del primer envío
- El recordatorio solo aparece si hay **2 o más días de atraso**
- Solo se muestra para suscripciones **activas**

## Actualización del Google Apps Script

Si necesitas actualizar el script para manejar errores de email faltante, agrega esta validación:

```javascript
function enviarRecordatorioCobro(datos) {
  try {
    // Validar que el email existe
    if (!datos.clienteEmail || datos.clienteEmail.trim() === "") {
      return {
        success: false,
        error: "Email del cliente no configurado",
      };
    }

    // Resto del código de envío...
    const mensaje = generarHTMLCorreo(datos);
    GmailApp.sendEmail(datos.clienteEmail, asunto, "", {
      htmlBody: mensaje,
      name: "Visonix - Gestión de Cobros",
    });

    return {
      success: true,
      mensaje: "Recordatorio enviado correctamente",
    };
  } catch (error) {
    Logger.log("Error enviando recordatorio: " + error.toString());
    return {
      success: false,
      error: error.toString(),
    };
  }
}
```

## Estructura del email enviado

El email incluye:

- **Encabezado con gradiente** (marca Visonix)
- **Saludo personalizado** con nombre del cliente
- **Tabla de información del pago:**
  - Proyecto
  - Monto mensual
  - Fecha de vencimiento
  - Días de atraso
- **Botón de contacto** para WhatsApp o email
- **Footer de la empresa** con información de contacto

## Troubleshooting

### No se envía el email

1. Verifica que las variables de entorno estén bien configuradas
2. Revisa que el cliente tenga email en la base de datos
3. Comprueba que la API_KEY coincida entre frontend y Google Script
4. Verifica en los logs del Google Apps Script si hay errores

### El botón no aparece

1. Verifica que la suscripción tenga al menos 2 días de atraso
2. Comprueba que la suscripción esté activa (`is_active = true`)
3. Revisa que `proxima_fecha_de_pago` esté configurada

### Dice "Enviado hoy" pero no llegó

1. Revisa la tabla `suscripciones.ultimo_recordatorio_cobro` en Supabase
2. Si hay una fecha de hoy pero no se envió, actualiza manualmente:
   ```sql
   UPDATE suscripciones
   SET ultimo_recordatorio_cobro = NULL
   WHERE id = 'id-de-la-suscripcion';
   ```

## Seguridad

- La API_KEY protege el endpoint de accesos no autorizados
- El modo `no-cors` en el fetch previene problemas de CORS
- Los emails solo se envían si hay >= 2 días de atraso
- Solo se permite 1 envío por día por suscripción
