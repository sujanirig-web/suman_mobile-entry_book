import { defineConfig } from 'vite'

export default defineConfig({
  base: '/suman_mobile-entry-book/',
  build: {
    rollupOptions: {
      external: /^https?:\/\//
    }
  }
})
