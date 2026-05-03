import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), wasm(), topLevelAwait()],
    define: {
      global: 'globalThis',
      'process.env': JSON.stringify(env)
    },
    resolve: {
      alias: {
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      include: ['buffer'],
      // ✅ ADDED: Exclude problematic dependencies from optimization
      exclude: ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/identity']
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // ✅ ADDED: Allow external connections for Render
      allowedHosts: [
        'at-frontend.onrender.com',
        'atticusmini.com',
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
      ],
      // ✅ ADDED: Headers for WebAssembly
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4943',
          changeOrigin: true
        }
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0', // ✅ ADDED: Allow external connections for Render
      allowedHosts: [
        'at-frontend.onrender.com',
        'atticusmini.com',
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
      ],
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // ✅ ADDED: Target ES2020 to avoid asm.js issues
      target: 'es2020',
      // ✅ ADDED: Force cache busting with timestamp
      rollupOptions: {
        input: {
          main: './index.html',
          admin: './admin.html'
        },
        output: {
          manualChunks: {
            'dfinity': ['@dfinity/auth-client', '@dfinity/agent', '@dfinity/principal', '@dfinity/identity']
          },
          // ✅ FIXED: Use stable naming for production builds
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      // ✅ ADDED: Force sourcemap generation for debugging
      sourcemap: true,
      // ✅ ADDED: Use esbuild minification (default)
      minify: 'esbuild'
    }
  }
})
