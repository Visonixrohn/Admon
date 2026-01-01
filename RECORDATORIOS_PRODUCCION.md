# Configuración del Sistema de Recordatorios - Para Producción

## ✅ Cambios Implementados

El sistema de recordatorios de cobro ahora funciona **automáticamente en producción (Vercel)** sin necesidad de configurar variables de entorno.

### Antes (❌ No funcionaba en producción)
- Dependía de variables de entorno `.env.local`
- No funcionaba en Vercel porque `.env.local` no se sube a Git
- Había que configurar variables de entorno en Vercel manualmente

### Ahora (✅ Funciona en producción)
- La configuración está en el código: [`client/src/hooks/use-email-config.ts`](client/src/hooks/use-email-config.ts)
- Funciona automáticamente al hacer deploy en Vercel
- Solo necesitas subir a GitHub y listo

## 📁 Archivos Modificados

### 1. Hook de Configuración (NUEVO)
**Archivo:** [`client/src/hooks/use-email-config.ts`](client/src/hooks/use-email-config.ts)

Contiene:
- URL del Google Apps Script
- API Key para autenticación
- Información de contacto de la empresa

**✏️ Editar este archivo para cambiar la configuración:**
```typescript
export function useEmailConfig() {
  return {
    scriptUrl: "https://script.google.com/macros/s/AKfycbziFtOy7p5zr-hOB1ZbF0YtRDwtru4X1t9KLtaNYqkxsJ4JI_C5UKsVQwGhf7yRZdKIfA/exec",
    apiKey: "tu-clave-secreta-muy-segura-12345",
    contactInfo: {
      telefono: "+504 1234-5678",
      email: "contacto@visonix.com",
      nombreEmpresa: "Visonix",
    },
  };
}
```

### 2. Página de Suscripciones (MODIFICADO)
**Archivo:** [`client/src/pages/subscriptions.tsx`](client/src/pages/subscriptions.tsx)

Cambios:
- ✅ Importa `useEmailConfig` en lugar de usar `import.meta.env`
- ✅ Ya no depende de variables de entorno
- ✅ Funciona igual en desarrollo y producción

### 3. Configuración de Vite (SIMPLIFICADO)
**Archivo:** [`vite.config.ts`](vite.config.ts)

Cambios:
- ✅ Eliminada la inyección de variables de entorno
- ✅ Configuración más simple y limpia

## 🚀 Cómo Usar

### Para Desarrollo Local

1. **Abre el hook de configuración:**
   ```bash
   code client/src/hooks/use-email-config.ts
   ```

2. **Edita la configuración si es necesario:**
   - La URL del script ya está configurada
   - Puedes cambiar la API Key
   - Puedes actualizar la información de contacto

3. **Inicia el servidor:**
   ```bash
   npm run dev
   ```

4. **Prueba el envío:**
   - Ve a Suscripciones
   - Haz clic en "Recordatorio" en una suscripción con 2+ días de atraso
   - Verifica que llegue el email

### Para Producción (Vercel)

1. **Sube los cambios a GitHub:**
   ```bash
   git add .
   git commit -m "fix: Sistema de recordatorios configurado para producción"
   git push origin main
   ```

2. **Vercel hace deploy automáticamente**
   - No necesitas configurar nada en Vercel
   - No necesitas variables de entorno
   - Funciona inmediatamente

3. **Verifica que funcione:**
   - Ve a tu URL de producción
   - Prueba enviar un recordatorio
   - Revisa que llegue el email

## ⚙️ Personalización

### Cambiar URL del Google Script

Si despliegas un nuevo script de Google Apps, edita:

```typescript
// En: client/src/hooks/use-email-config.ts
scriptUrl: "TU_NUEVA_URL_AQUI/exec",
```

### Cambiar API Key

```typescript
// En: client/src/hooks/use-email-config.ts
apiKey: "tu-nueva-clave-secreta",
```

**IMPORTANTE:** La API Key debe ser la misma en:
- ✅ [`client/src/hooks/use-email-config.ts`](client/src/hooks/use-email-config.ts) (frontend)
- ✅ [`google-scripts/recordatorio-cobro.gs`](google-scripts/recordatorio-cobro.gs) (Google Script)

### Actualizar Información de Contacto

```typescript
// En: client/src/hooks/use-email-config.ts
contactInfo: {
  telefono: "+504 XXXX-XXXX",
  email: "tuempresa@ejemplo.com",
  nombreEmpresa: "Tu Empresa",
}
```

## 🔐 Seguridad

### ¿Es seguro poner la URL y API Key en el código?

**Sí, es seguro** porque:

1. **La URL del Google Script ya es pública**
   - Está desplegada como "Anyone" puede acceder
   - Es necesario que sea pública para que funcione

2. **La API Key no es crítica**
   - Solo previene spam básico
   - No protege datos sensibles
   - El Google Script tiene su propia autenticación de Gmail

3. **El verdadero control de seguridad está en:**
   - ✅ Permisos de Gmail en el Google Script
   - ✅ Autenticación de Supabase
   - ✅ RLS (Row Level Security) en las tablas

### Si aún así quieres más seguridad

Puedes usar variables de entorno en Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `VITE_GOOGLE_SCRIPT_URL` = tu URL
   - `VITE_GOOGLE_SCRIPT_API_KEY` = tu clave

4. Modifica el hook para usar variables si existen:
```typescript
export function useEmailConfig() {
  return {
    scriptUrl: import.meta.env.VITE_GOOGLE_SCRIPT_URL || 
      "https://script.google.com/macros/s/.../exec",
    apiKey: import.meta.env.VITE_GOOGLE_SCRIPT_API_KEY || 
      "tu-clave-por-defecto",
  };
}
```

## 📋 Checklist de Deploy

Antes de hacer deploy a producción:

- [ ] Verificar que la URL del script esté actualizada en `use-email-config.ts`
- [ ] Verificar que la API Key coincida entre frontend y Google Script
- [ ] Probar el envío en desarrollo local
- [ ] Hacer commit y push a GitHub
- [ ] Esperar a que Vercel haga deploy
- [ ] Probar el envío en producción
- [ ] Verificar que los emails lleguen

## 🐛 Troubleshooting

### Error: "Configuración faltante"

**Causa:** El hook no está siendo importado correctamente

**Solución:**
1. Verifica que exista: `client/src/hooks/use-email-config.ts`
2. Verifica la importación en `subscriptions.tsx`
3. Reinicia el servidor de desarrollo

### Los emails no llegan

**Causa:** Problema con el Google Script

**Solución:**
1. Ve a https://script.google.com
2. Abre tu proyecto de recordatorios
3. Ve a "Ver → Registros"
4. Busca errores en los logs
5. Sigue la guía: [`DEBUG_EMAIL_GOOGLE_SCRIPT.md`](DEBUG_EMAIL_GOOGLE_SCRIPT.md)

### Funciona en desarrollo pero no en producción

**Causa:** El build de Vercel tiene un error

**Solución:**
1. Ve a Vercel → tu proyecto → Deployments
2. Abre el último deploy
3. Revisa la pestaña "Build Logs"
4. Busca errores de TypeScript o importaciones

## 📞 Soporte

Si tienes problemas:

1. Revisa esta guía completa
2. Revisa [`DEBUG_EMAIL_GOOGLE_SCRIPT.md`](DEBUG_EMAIL_GOOGLE_SCRIPT.md)
3. Verifica los logs de Google Apps Script
4. Verifica los logs de Vercel

## 🎉 Ventajas de esta Implementación

✅ **Funciona en producción sin configuración extra**
✅ **No depende de variables de entorno de Vercel**
✅ **Fácil de actualizar (solo editar un archivo)**
✅ **Mismo código para desarrollo y producción**
✅ **Se sube a GitHub sin problemas**
✅ **Deploy automático en Vercel**

---

**Última actualización:** 1 de enero de 2026
