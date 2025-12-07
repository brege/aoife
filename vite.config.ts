import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { type WebSocket, WebSocketServer } from 'ws';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-interceptor',
      configureServer(server) {
        // WebSocket server for CLI ↔ React communication
        const wss = new WebSocketServer({ port: 8080 });
        let reactClient: WebSocket | null = null;

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
              res.end(
                JSON.stringify({ error: 'Query parameter "q" is required' }),
              );
              return;
            }

            if (reactClient) {
              console.log(`[CLI] Sending search request to React: "${query}"`);
              reactClient.send(JSON.stringify({ type: 'SEARCH', query }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'sent',
                  query,
                  message: 'Search request sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/add' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const mediaItem = JSON.parse(body);
                if (reactClient) {
                  console.log(
                    `[CLI] Sending add request to React:`,
                    mediaItem.title || mediaItem.id,
                  );
                  reactClient.send(
                    JSON.stringify({ type: 'ADD_MEDIA', media: mediaItem }),
                  );
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'sent', item: mediaItem }));
                } else {
                  res.writeHead(503, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'React app not connected' }));
                }
              } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
          } else if (path.startsWith('/add-first/') && req.method === 'POST') {
            const query = path.replace('/add-first/', '');
            if (reactClient) {
              console.log(`[CLI] Adding first search result for: "${query}"`);
              reactClient.send(
                JSON.stringify({
                  type: 'ADD_FIRST_RESULT',
                  query: decodeURIComponent(query),
                }),
              );
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'sent',
                  query: decodeURIComponent(query),
                }),
              );
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
              res.end(
                JSON.stringify({
                  status: 'requested',
                  message: 'Grid state request sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/clear' && req.method === 'DELETE') {
            if (reactClient) {
              console.log(`[CLI] Clearing grid via React`);
              reactClient.send(JSON.stringify({ type: 'CLEAR_GRID' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'cleared',
                  message: 'Grid clear request sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/menu' && req.method === 'GET') {
            if (reactClient) {
              console.log(`[CLI] Requesting menu state from React`);
              reactClient.send(JSON.stringify({ type: 'GET_MENU_STATE' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'requested',
                  message: 'Menu state request sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/menu/clear' && req.method === 'POST') {
            if (reactClient) {
              console.log(`[CLI] Triggering menu clear action`);
              reactClient.send(JSON.stringify({ type: 'MENU_CLEAR_GRID' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'sent',
                  message: 'Menu clear action sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/debug' && req.method === 'GET') {
            if (reactClient) {
              console.log(`[CLI] Requesting debug information from React`);
              reactClient.send(JSON.stringify({ type: 'GET_DEBUG_INFO' }));
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  status: 'requested',
                  message: 'Debug info request sent to React app',
                }),
              );
            } else {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'React app not connected' }));
            }
          } else if (path === '/viewport' && req.method === 'GET') {
            // Log viewport request to terminal
            console.log(
              `[VIEWPORT] Request from ${req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'} device`,
            );

            // Direct viewport info endpoint - inject script to get measurements
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <script>
                const viewport = {
                  width: window.innerWidth,
                  height: window.innerHeight,
                  devicePixelRatio: window.devicePixelRatio,
                  userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
                };
                const gridContainer = document.querySelector('.grid-container');
                const containerInfo = gridContainer ? {
                  width: gridContainer.getBoundingClientRect().width,
                  height: gridContainer.getBoundingClientRect().height,
                  computedStyle: getComputedStyle(gridContainer).gridTemplateColumns,
                  cssClasses: gridContainer.className
                } : null;
                
                const analysis = {
                  optimalTwoColumn: Math.floor((viewport.width - 32 - 16) / 2),
                  actualPosterWidth: 120, // From logs
                  efficiency: containerInfo ? (containerInfo.width / viewport.width * 100).toFixed(1) + '%' : 'N/A',
                  spacingWaste: viewport.width - (containerInfo ? containerInfo.width : 0)
                };
                
                // Send measurements to server terminal via fetch
                fetch('/cli/log-viewport', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    viewport,
                    container: containerInfo,
                    analysis
                  })
                });
                
                document.body.innerHTML = '<pre>Viewport measurements sent to terminal</pre>';
              </script>
            `);
          } else if (path === '/log-viewport' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const v = data.viewport;
                const c = data.container;
                const a = data.analysis;

                console.log(`[VIEWPORT ANALYSIS] ${v.userAgent.toUpperCase()}`);
                console.log(
                  `  Viewport: ${v.width}x${v.height}px (DPR: ${v.devicePixelRatio})`,
                );
                console.log(
                  `  Container: ${c?.width || 'N/A'}x${c?.height || 'N/A'}px`,
                );
                console.log(`  Grid CSS: ${c?.computedStyle || 'N/A'}`);
                console.log(`  CSS Classes: ${c?.cssClasses || 'N/A'}`);
                console.log(`  Optimal 2-col width: ${a.optimalTwoColumn}px`);
                console.log(`  Actual poster width: ${a.actualPosterWidth}px`);
                console.log(`  Space efficiency: ${a.efficiency}`);
                console.log(`  Wasted space: ${a.spacingWaste}px`);
                console.log(
                  `  PROBLEM: Posters are ${a.optimalTwoColumn - a.actualPosterWidth}px smaller than optimal`,
                );
              } catch {
                console.log('[VIEWPORT ERROR]', body);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'logged' }));
            });
          } else {
            next();
          }
        });

        server.middlewares.use('/api/log', (req, res, next) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const logData = JSON.parse(body);
                const timestamp = new Date().toISOString();
                const level = logData.level || 'INFO';
                const context = logData.context || 'Unknown';
                const action = logData.action ? `[${logData.action}]` : '';

                console.log(
                  `${timestamp} [${level}] ${action} [${context}] ${logData.message}`,
                );
                if (logData.query) console.log(`  Query: "${logData.query}"`);
                if (logData.resultsCount !== undefined)
                  console.log(`  Results: ${logData.resultsCount}`);
                if (logData.gridCount !== undefined)
                  console.log(`  Grid Count: ${logData.gridCount}`);
                if (logData.movie)
                  console.log(
                    `  Movie: ${logData.movie.title} (${logData.movie.year})`,
                  );
              } catch {
                console.log('[MALFORMED LOG]', body);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'logged' }));
            });
          } else {
            next();
          }
        });
      },
    },
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
        },
      },
    },
  },
});
