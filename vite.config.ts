import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { setupWebSocket } from './src/middleware/websocket';
import { createApiMiddleware } from './src/middleware/api-routes';

const env = loadEnv('development', process.cwd(), '');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        setupWebSocket();
        server.middlewares.use('/api', createApiMiddleware(env));
      },
    },
  ],
  server: {
    allowedHosts: ['aoife.brege.org'],
    proxy: {
      '/api': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[PROXY REQUEST]', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY RESPONSE]', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
