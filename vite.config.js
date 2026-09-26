import { defineConfig } from 'vite'

export default defineConfig({
  // Served from the Worker root, so asset URLs must be absolute from "/".
  // A sub-path here makes /assets/*.js 404 into the SPA HTML fallback and the
  // app fails to boot in the browser.
  base: '/',
  // An explicit (possibly empty) plugins array is required so Wrangler can
  // detect and safely rewrite this config during `wrangler deploy` setup.
  plugins: [],
  build: {
    rollupOptions: {
      external: /^https?:\/\//
    }
  }
})
