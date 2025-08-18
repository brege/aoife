import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { WebSocketServer } from 'ws'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-interceptor',
      configureServer(server) {
        // WebSocket server for CLI ↔ React communication
        const wss = new WebSocketServer({ port: 8080 });
        let reactClient: any = null;
        
        wss.on('connection', (ws) => {
          console.log('[WS] React client connected');
          reactClient = ws;
          
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('[WS] Message from React:', message.type);
          });
          
          ws.on('close', () => {
            console.log('[WS] React client disconnected');
            reactClient = null;
          });
        });

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
            
            if (reactClient) {
              console.log(`[CLI] Sending search request to React: "${query}"`);
              reactClient.send(JSON.stringify({ type: 'SEARCH', query }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'sent', query, message: 'Search request sent to React app' }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/add' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const mediaItem = JSON.parse(body);
                if (reactClient) {
                  console.log(`[CLI] Sending add request to React:`, mediaItem.title || mediaItem.id);
                  reactClient.send(JSON.stringify({ type: 'ADD_MEDIA', media: mediaItem }));
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'sent', item: mediaItem }));
                } else {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'React app not connected' }));
                }
              } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
          } else if (path.startsWith('/add-first/') && req.method === 'POST') {
            const query = path.replace('/add-first/', '');
            if (reactClient) {
              console.log(`[CLI] Adding first search result for: "${query}"`);
              reactClient.send(JSON.stringify({ type: 'ADD_FIRST_RESULT', query: decodeURIComponent(query) }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'sent', query: decodeURIComponent(query) }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path.startsWith('/remove/') && req.method === 'DELETE') {
            const id = path.replace('/remove/', '');
            if (reactClient) {
              console.log(`[CLI] Sending remove request to React: ${id}`);
              reactClient.send(JSON.stringify({ type: 'REMOVE_MEDIA', id }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'sent', id }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/grid' && req.method === 'GET') {
            if (reactClient) {
              console.log(`[CLI] Requesting grid state from React`);
              reactClient.send(JSON.stringify({ type: 'GET_GRID_STATE' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'requested', message: 'Grid state request sent to React app' }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/clear' && req.method === 'DELETE') {
            if (reactClient) {
              console.log(`[CLI] Clearing grid via React`);
              reactClient.send(JSON.stringify({ type: 'CLEAR_GRID' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'cleared', message: 'Grid clear request sent to React app' }));
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
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
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
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