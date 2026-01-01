import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer()
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner()
            ),
          ]
        : []),
    ],
    // Definir explícitamente las variables de entorno
    define: {
      'import.meta.env.VITE_GOOGLE_SCRIPT_URL': JSON.stringify(env.VITE_GOOGLE_SCRIPT_URL),
      'import.meta.env.VITE_GOOGLE_SCRIPT_API_KEY': JSON.stringify(env.VITE_GOOGLE_SCRIPT_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: 5174,
      strictPort: true,
      // bind to localhost for local development
      host: "localhost",
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      // HMR configured for non-HTTPS localhost development
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 5174,
      },
    },
  };
});
