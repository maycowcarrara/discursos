import { readFileSync } from 'node:fs'
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

type PackageMetadata = {
  version: string
}

const packageMetadata = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as PackageMetadata
const appVersion = packageMetadata.version

function appVersionPlugin(): Plugin {
  const versionPayload = `${JSON.stringify({ version: appVersion })}\n`

  return {
    name: 'app-version',
    configureServer(server) {
      server.middlewares.use('/version.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(versionPayload)
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: versionPayload,
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-firebase-auth',
              test: /node_modules[\\/](?:@firebase[\\/](?:app|auth|component|logger|util)|firebase[\\/](?:app|auth))/,
              maxSize: 450 * 1024,
              priority: 40,
            },
            {
              name: 'vendor-firebase-firestore',
              test: /node_modules[\\/](?:@firebase[\\/](?:firestore|webchannel-wrapper)|firebase[\\/]firestore)/,
              maxSize: 450 * 1024,
              priority: 35,
            },
            {
              name: 'vendor-react',
              test: /node_modules[\\/](?:react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-query',
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
          ],
        },
        strictExecutionOrder: true,
      },
    },
  },
  plugins: [react(), tailwindcss(), appVersionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
