import { defineConfig } from 'vite'

export default defineConfig({
  base: '/relife-entry-book/',
  build: {
    rollupOptions: {
      external: /^https?:\/\//
    }
  }
})
