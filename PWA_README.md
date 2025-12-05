Convertir la app a PWA - Instrucciones rápidas

Resumen
- La app ya incluye un `manifest.webmanifest`, un `sw.js` (service worker) en `client/public` y el registro del SW en `client/src/main.tsx`.
- Esto hace que la app sea instalable (PWA) en navegadores modernos cuando se sirve por HTTPS o desde `localhost`.

Probar en desarrollo
1. Si usas el proxy creado antes (opcional):

```bash
npm run proxy
```

2. Arranca el dev server de Vite:

```bash
npm run dev
```

3. Abrir la app en el navegador en `http://localhost:5173` (o puerto que muestre Vite).
4. Abrir DevTools → Application → Manifest: deberías ver información del manifest y el botón "Install".
5. En DevTools → Application → Service Workers: verifica que `sw.js` esté registrado.
6. Para probar offline, ve a Network → Offline y recarga la página: la shell de la app debería cargarse desde la cache.

Probar la versión build (como en producción)
1. Genera el build:

```bash
npm run build
```

2. Sirve el contenido de `dist/` con un servidor estático (ejemplo con `npx serve`):

```bash
npx serve dist -s -l 5000
```

3. Abre `http://localhost:5000` y comprueba Manifest/Service Worker como antes.

Notas importantes
- Para que una PWA sea instalable en producción, debe servirse por HTTPS.
- Los icons incluidos son placeholders (`/vsr.png`). Para mejor experiencia, añade iconos reales en `client/public/icons/` con tamaños `192x192` y `512x512`, y actualiza `client/public/manifest.webmanifest` si cambian las rutas.
- El service worker actual es simple. Para estrategias de cache más avanzadas o actualizaciones manejadas, considera usar Workbox o `vite-plugin-pwa`.

Recomendaciones rápidas
- En Supabase, añade tus orígenes permitidos (CORS) en Settings → API → Allowed CORS origins.
- Para despliegue en Netlify/Vercel/Cloud Run, asegura HTTPS y sube el contenido `dist/`.

Si quieres, puedo:
- Generar iconos automáticamente (requiere ImageMagick o `sharp`).
- Reemplazar el SW simple por `vite-plugin-pwa` para una integración más robusta.
