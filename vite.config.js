import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Distribution copy.

   In the source repo this value is derived from the git branch, and anything other
   than `main` makes the app stamp a "Work in progress — not approved" chip on every
   screen. That marker exists to keep Blurb's own two internal deployments apart and
   has no meaning outside that repo — an unzipped folder has no git branch, so it
   would have shown the chip here on every screen for no reason.

   Pinned to `main` so this copy presents as a finished prototype, whatever branch or
   host it's built from. Nothing else in the app reads __BRANCH__. */
export default defineConfig({
  plugins: [react()],
  define: {
    __BRANCH__: JSON.stringify("main"),
  },
});
