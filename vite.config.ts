import { writeFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import packageJson from "./package.json" with { type: "json" };

/**
 * Writes .br and .gz copies of the built text files, which the server sends
 * to browsers that accept them: without a proxy in front, as on a LAN, nothing
 * else compresses them.
 */
function precompress(): Plugin {
  return {
    name: "precompress",
    apply: "build",
    writeBundle(options, bundle) {
      for (const file of Object.keys(bundle)) {
        if (!/\.(js|css|html|svg|json)$/.test(file)) {
          continue;
        }
        const target = path.join(options.dir ?? "", file);
        const output = bundle[file];
        const source = output?.type === "chunk" ? output.code : output?.source;
        if (source === undefined || source.length < 1024) {
          continue;
        }
        writeFileSync(
          `${target}.br`,
          brotliCompressSync(source, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }),
        );
        writeFileSync(`${target}.gz`, gzipSync(source, { level: 9 }));
      }
    },
  };
}

export default defineConfig({
  root: "src/client",
  plugins: [react(), tailwindcss(), precompress()],
  define: {
    APP_VERSION: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Each chunk is named for what it holds, so its hash changes only with that.
          groups: [
            {
              // The packages the first screen needs.
              name: "vendor",
              test: /node_modules[\\/]/,
              tags: ["$initial"],
            },
            {
              // The app's own code on the first load, in one file rather than a
              // file per module it shares with the screens that load later.
              name: "app",
              test: /src[\\/](client|shared)[\\/]/,
              tags: ["$initial"],
            },
            {
              // Recharts and the packages only it uses, which load with a chart.
              // Named one by one: a catch-all here also took packages the form
              // screens need, so they downloaded every chart too.
              name: "charts",
              test: /node_modules[\\/](recharts|victory-vendor|d3-[^\\/]+|internmap|@reduxjs|redux|redux-thunk|react-redux|reselect|immer|es-toolkit|eventemitter3|decimal\.js-light|tiny-invariant|use-sync-external-store|clsx|@standard-schema)[\\/]/,
            },
            {
              // The other packages only later screens use, such as a switch.
              name: "lazy-vendor",
              test: /node_modules[\\/]/,
            },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      // The trailing slash keeps the client's own /api.ts module out of the proxy.
      "/api/": "http://localhost:3000",
    },
  },
});
