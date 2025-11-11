import { defineConfig } from 'vite'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const freeBundlerEntry = require.resolve('@etherspot/free-bundler')
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@etherspot/free-bundler': freeBundlerEntry,
    },
  },
})

