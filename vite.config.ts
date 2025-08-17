import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-interceptor',
      configureServer(server) {
        // CLI API endpoints - use /cli prefix to avoid conflicts with TMDB proxy
        server.middlewares.use('/cli', (req, res, next) => {
          const url = new URL(req.url || '', 'http://localhost');
          const path = url.pathname.replace('/cli', '');
          
          if (path === '/search' && req.method === 'GET') {
            const query = url.searchParams.get('q');
            if (!query) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
              return;
            }
            console.log(`[CLI] Search request: "${query}"`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: `Search for "${query}" - integration pending` }));
          } else if (path === '/add' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              console.log(`[CLI] Add request: ${body}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'received', message: 'Add integration pending' }));
            });
          } else if (path.startsWith('/remove/') && req.method === 'DELETE') {
            const id = path.replace('/remove/', '');
            console.log(`[CLI] Remove request: ${id}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'received', id, message: 'Remove integration pending' }));
          } else if (path === '/grid' && req.method === 'GET') {
            console.log(`[CLI] Grid state request`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Grid state integration pending' }));
          } else {
            next();
          }
        });

        server.middlewares.use('/api/log', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const logData = JSON.parse(body);
                const timestamp = new Date().toISOString();
                const level = logData.level || 'INFO';
                const context = logData.context || 'Unknown';
                const action = logData.action ? `[${logData.action}]` : '';
                
                console.log(`${timestamp} [${level}] ${action} [${context}] ${logData.message}`);
                if (logData.query) console.log(`  Query: "${logData.query}"`);
                if (logData.resultsCount !== undefined) console.log(`  Results: ${logData.resultsCount}`);
                if (logData.gridCount !== undefined) console.log(`  Grid Count: ${logData.gridCount}`);
                if (logData.movie) console.log(`  Movie: ${logData.movie.title} (${logData.movie.year})`);
              } catch (e) {
                console.log('[MALFORMED LOG]', body);
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'logged' }));
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://api.themoviedb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[PROXY REQUEST]', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[PROXY RESPONSE]', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})