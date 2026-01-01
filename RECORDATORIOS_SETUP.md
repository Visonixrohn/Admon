# Configuración del Sistema de Recordatorios de Cobro

## 📋 Paso 1: Ejecutar SQL en Supabase

1. Ve a tu proyecto de Supabase
2. Abre el **SQL Editor**
3. Ejecuta el archivo: [`sql/recordatorio_cobro_column.sql`](../sql/recordatorio_cobro_column.sql)

```sql
ALTER TABLE suscripciones
ADD COLUMN ultimo_recordatorio_cobro TIMESTAMP WITH TIME ZONE;
```

## 🔧 Paso 2: Configurar Google Apps Script

### 2.1. Crear el Proyecto

1. Ve a [https://script.google.com](https://script.google.com)
2. Haz clic en **"Nuevo proyecto"**
3. Nombra el proyecto: `Recordatorios de Cobro - Visonix`

### 2.2. Pegar el Código

1. Borra el código por defecto
2. Copia todo el contenido de [`google-scripts/recordatorio-cobro.gs`](../google-scripts/recordatorio-cobro.gs)
3. Pégalo en el editor

### 2.3. Configurar Variables

En la sección `CONFIG` del script, edita estos valores:

```javascript
const CONFIG = {
  // Tu email de Gmail (debe ser el que uses en Google Apps Script)
  EMAIL_REMITENTE: "tu-email@gmail.com",

  // Nombre de tu empresa
  NOMBRE_EMPRESA: "Visonix",

  // Información de contacto que aparecerá en el correo
  TELEFONO_EMPRESA: "+504 1234-5678",
  EMAIL_EMPRESA: "contacto@visonix.com",

  // Clave secreta (cámbiala por algo único y seguro)
  API_SECRET_KEY: "tu-clave-secreta-muy-segura-12345",
};
```

### 2.4. Probar el Script (Opcional)

1. En el editor, busca la función `testEnviarCorreo()`
2. Edita los datos de prueba:

```javascript
function testEnviarCorreo() {
  const resultado = enviarRecordatorioCobro(
    "tu-email@gmail.com", // Pon tu email para probar
    "Cliente de Prueba",
    "Proyecto Test",
    5000,
    3,
    "2025-12-28"
  );
  Logger.log(resultado);
}
```

3. Selecciona `testEnviarCorreo` en el menú desplegable
4. Haz clic en **▶ Ejecutar**
5. La primera vez te pedirá permisos:
   - Clic en **"Revisar permisos"**
   - Selecciona tu cuenta
   - Clic en **"Avanzado"** → **"Ir a [nombre del proyecto] (no seguro)"**
   - Clic en **"Permitir"**
6. Verifica que llegue el correo de prueba

### 2.5. Desplegar como Web App

1. En el editor, haz clic en **"Implementar"** → **"Nueva implementación"**
2. Configuración:
   - **Tipo**: Web App
   - **Descripción**: "API de Recordatorios v1"
   - **Ejecutar como**: Mi cuenta (tu email)
   - **Quién tiene acceso**: Cualquiera
3. Clic en **"Implementar"**
4. **IMPORTANTE**: Copia la **URL de la aplicación web** (algo como `https://script.google.com/macros/s/ABC123.../exec`)
5. Guarda esta URL, la necesitarás en el frontend

## 🔐 Paso 3: Guardar Configuración en el Frontend

Crea un archivo de variables de entorno en tu proyecto:

**`.env.local`** (en la raíz del proyecto):

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/TU_URL_AQUI/exec
VITE_GOOGLE_SCRIPT_API_KEY=tu-clave-secreta-muy-segura-12345
```

**IMPORTANTE**: Usa la misma `API_SECRET_KEY` que configuraste en el script de Google.

## 📧 Paso 4: Configurar Gmail (si es necesario)

Si usas autenticación de 2 factores en Gmail:

1. Ve a [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. En "Iniciar sesión en Google", activa **"Verificación en dos pasos"** (si no está activa)
3. Busca **"Contraseñas de aplicaciones"**
4. Genera una contraseña para "Apps Script"
5. Usa esta contraseña si te la solicita

## ✅ Verificación Final

### Checklist:

- [ ] SQL ejecutado en Supabase
- [ ] Proyecto de Google Apps Script creado
- [ ] Variables CONFIG configuradas correctamente
- [ ] Permisos de Gmail otorgados
- [ ] Correo de prueba recibido exitosamente
- [ ] Web App desplegada
- [ ] URL del Web App guardada
- [ ] Variables de entorno configuradas en el frontend

## 🎨 Vista Previa del Correo

El correo que recibirán los clientes incluye:

- ✅ Header con el nombre de tu empresa
- ✅ Saludo personalizado con el nombre del cliente
- ✅ Información detallada del pago:
  - Nombre del proyecto
  - Monto a pagar
  - Fecha de vencimiento
  - Días de atraso (en rojo)
- ✅ Botón para contactar
- ✅ Footer con información de contacto
- ✅ Diseño responsive (se ve bien en móvil)

## 🔄 Actualizar el Script

Si necesitas hacer cambios al script:

1. Edita el código en el editor de Google Apps Script
2. Guarda los cambios (Ctrl+S o Cmd+S)
3. Ve a **"Implementar"** → **"Administrar implementaciones"**
4. Haz clic en el ícono de lápiz ✏️
5. En **"Versión"**, selecciona **"Nueva versión"**
6. Clic en **"Implementar"**

La URL permanecerá igual, solo se actualizará el código.

## 🐛 Solución de Problemas

### El correo no llega

- Verifica que el email del remitente sea correcto
- Revisa la carpeta de spam
- Verifica los logs en Google Apps Script (Ver → Registros)

### Error de permisos

- Vuelve a otorgar permisos desde el menú "Ejecutar" → "testEnviarCorreo"
- Asegúrate de seleccionar "Permitir" en todos los pasos

### Error 401 en el frontend

- Verifica que la `API_SECRET_KEY` sea la misma en Google Script y en las variables de entorno
- Asegúrate de que estás enviando el campo `apiKey` en la petición

### La URL del Web App no funciona

- Asegúrate de que la implementación esté configurada como "Cualquiera" en acceso
- Verifica que copiaste la URL completa (debe terminar en `/exec`)

## 📞 Soporte

Si tienes problemas, revisa:

- Los logs en Google Apps Script: **Ver → Registros**
- La consola del navegador para errores del frontend
- Los errores de red en las DevTools (pestaña Network)
