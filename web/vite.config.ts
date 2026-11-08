import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Location APIs are disabled at the HTTP layer as well as in code. Mirror these headers in production hosting.
const securityHeaders = {
  'Permissions-Policy': 'geolocation=(), camera=(self), microphone=(self), interest-cohort=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    headers: securityHeaders,
    host: true,
    allowedHosts: true,
    proxy: {
      '/supabase': { target: process.env.SUPABASE_PROXY_TARGET ?? 'http://127.0.0.1:54321', changeOrigin: true, ws: true, rewrite: (p) => p.replace(/^\/supabase/, '') },
    },
  },
  preview: { headers: securityHeaders, host: true, allowedHosts: true },
})
