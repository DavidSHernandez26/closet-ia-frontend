import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Usamos el manifest.json existente en /public
      manifest: false,
      workbox: {
        // Precachea todos los assets generados por Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Rutas de navegación → siempre sirve index.html (SPA)
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Imágenes de Supabase Storage: CacheFirst 24h
            urlPattern: /^https:\/\/lhvwexbejhdqtbprypmk\.supabase\.co\//,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            // Clima: NetworkFirst con fallback de 30 min
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "weather-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 30,
              },
            },
          },
          {
            // API del backend: NetworkFirst con caché de 5 min
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    "process.env": process.env,
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  resolve: {
    conditions: ["production"],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          axios: ["axios"],
        },
      },
    },
  },
});
