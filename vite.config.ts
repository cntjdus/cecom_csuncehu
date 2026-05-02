import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/index.tsx'
    }),
    pages()
  ],
  build: {
    outDir: 'dist'
  }
})