import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 3000, // Para mantener el puerto de CRA
    open: true   // Para que se abra el navegador automáticamente
  }
})
