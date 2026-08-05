import path from "path"
import { readFileSync } from "fs"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isTauri = process.env.TAURI_ENV_TARGET_TRIPLE !== undefined

// Single source of truth para la versión: tauri.conf.json
const tauriConf = JSON.parse(readFileSync(path.resolve(__dirname, "src-tauri/tauri.conf.json"), "utf-8"))
const appVersion = tauriConf.version

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
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
})
