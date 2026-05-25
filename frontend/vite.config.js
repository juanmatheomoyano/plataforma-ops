import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isTauri = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Tauri expects a fixed port and no proxy (talks directly to backend via network)
  server: {
    port: 5173,
    strictPort: true,
  },
  // Smaller sourcemaps for desktop bundle; full for dev
  build: {
    sourcemap: !isTauri,
  },
  // Expose env vars to the app
  envPrefix: ["VITE_"],
})
