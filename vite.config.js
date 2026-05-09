import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Usamos el manifest.json existente en /public
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precachea todos los assets generados por Vite
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Rutas de navegación → siempre sirve index.html (SPA)
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Imágenes de Supabase Storage: CacheFirst 24h
            urlPattern: /^https:\/\/lhvwexbejhdqtbprypmk\.supabase\.co\/storage\/v1\/object\//,
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
        ],
      },
    }),
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    conditions: ["production"],
  },
  build: {
    outDir: "build",
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
