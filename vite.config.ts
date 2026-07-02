// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Browser-only packages pulled in by @paddleocr/paddleocr-js. They cannot be
// bundled for the Cloudflare Worker SSR environment (opencv-js reassigns the
// `setImmediate` import, which rolldown rejects). They are only reached
// behind a `typeof window !== "undefined"` guard via dynamic import, so
// keeping them external for SSR is safe — the code path never executes on
// the server.
const BROWSER_ONLY = [
  "@paddleocr/paddleocr-js",
  "@paddleocr/paddleocr-js/viz",
  "@techstark/opencv-js",
  "onnxruntime-web",
];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    ssr: { external: BROWSER_ONLY },
    environments: {
      ssr: { resolve: { external: BROWSER_ONLY } },
      nitro: { resolve: { external: BROWSER_ONLY } },
    },
  },
});
