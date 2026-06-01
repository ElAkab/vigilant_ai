import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import vercel from 'vite-plugin-vercel/vite'
import { getVercelEntries } from 'vite-plugin-vercel'

// https://vite.dev/config/
export default defineConfig(async () => {
  const entries = await getVercelEntries('endpoints/api', {
    destination: 'api',
  })

  return {
    plugins: [
      react(),
      tailwindcss(),
      vercel({
        entries,
        rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8788',
          changeOrigin: true,
        },
      },
    },
  }
})
