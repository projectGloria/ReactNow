import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import ledger from './vite-plugin-ledger.js'

export default defineConfig({
  plugins: [react(), ledger({ dir: 'journal' })],
  server: { port: 5173 },
})
