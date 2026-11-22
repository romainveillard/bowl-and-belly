import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss()],
  define: {
    APP_VERSION: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // The trailing slash keeps the client's own /api.ts module out of the proxy.
      "/api/": "http://localhost:3000",
    },
  },
});
