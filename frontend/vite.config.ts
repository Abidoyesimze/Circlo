import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // The Stellar SDK (lazy-loaded only on pages that touch the contract)
    // is inherently large due to its XDR/crypto dependencies; the routes
    // that matter for first paint (landing page) don't pull it in at all.
    chunkSizeWarningLimit: 1800,
  },
});
