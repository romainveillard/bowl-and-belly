import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: "node", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["src/client/testSetup.ts"],
        },
      },
    ],
  },
});
