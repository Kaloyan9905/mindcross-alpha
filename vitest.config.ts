import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// ESM has no __dirname — derive it from import.meta.url.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Make DATABASE_URL (and the rest of .env.local) available to the test
// process. The app's lazy env() helper reads straight from process.env, so
// loading these before Vitest spawns its workers is enough.
loadEnv({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  resolve: {
    alias: {
      // The app uses the "@/..." path alias (tsconfig paths). Vitest does not
      // read tsconfig paths by default, so resolve it manually here — no extra
      // package needed.
      "@": path.resolve(__dirname, "src"),
      // `server-only` is not a real installed package; Next.js aliases it at
      // build time to a no-op. The admin module imports it, so map it to
      // Next's compiled empty stub so a plain Node test run can import it.
      "server-only": path.resolve(
        __dirname,
        "node_modules/next/dist/compiled/server-only/empty.js",
      ),
      // `next` has no package "exports" map, so a bare `next/server` /
      // `next/navigation` import (used by next-auth and the identity/admin
      // server helpers) does not get a `.js` appended by Vitest's resolver.
      // Point them at the real files — this is a resolution fix, not a mock.
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
      "next/navigation": path.resolve(
        __dirname,
        "node_modules/next/navigation.js",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests hit a real Postgres instance — give them generous headroom.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // next-auth's `lib/env.js` does a bare `import "next/server"`. `next` ships
    // no package "exports" map, so Node's native ESM loader (used for
    // externalized deps) cannot resolve it without the `.js`. Inlining
    // next-auth / @auth routes those imports through Vitest's transform
    // pipeline where the `next/server` resolve alias above applies. This is
    // purely a resolution workaround — no application code is mocked.
    server: {
      deps: {
        inline: [/next-auth/, /@auth\//],
      },
    },
    // Pass the loaded env explicitly too, so it survives into worker threads.
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://mindcross:mindcross_dev@localhost:5432/mindcross",
      AUTH_SECRET: process.env.AUTH_SECRET ?? "test-secret-at-least-16-chars",
      NODE_ENV: "test",
    },
  },
});
