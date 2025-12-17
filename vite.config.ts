import crypto from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { type WebSocket, WebSocketServer } from 'ws';

// https://vite.dev/config/
const env = loadEnv('development', process.cwd(), '');

const getTmdbKey = () =>
  env.VITE_TMDB_API_KEY ||
  process.env.VITE_TMDB_API_KEY ||
  process.env.TMDB_API_KEY;

const SLUG_WORDS_PATH = path.join(process.cwd(), 'src', 'lib', 'slugs.json');

type ShareStoreRecord = { payload: string; createdAt: number };
type ShareStore = Record<string, ShareStoreRecord>;

const SHARE_STORE_PATH = path.join(process.cwd(), 'share_store.json');
const MAX_SHARE_PAYLOAD_BYTES = 200_000;
const MAX_SHARE_ITEMS = 24;
const MAX_ALTERNATE_COVERS = 32;

type SharedStateItem = {
  id: string | number;
  type: string;
  title: string;
  subtitle?: string;
  year?: number;
  coverUrl?: string | null;
  coverThumbnailUrl?: string | null;
  source?: string;
  aspectRatio?: number;
};

type SharedStatePayload = {
  gridItems: SharedStateItem[];
  columns: number;
  minRows: number;
  layoutDimension: 'width' | 'height';
};

const loadShareStore = (): ShareStore => {
  if (!fs.existsSync(SHARE_STORE_PATH)) {
    return {};
  }
  const contents = fs.readFileSync(SHARE_STORE_PATH, 'utf-8');
  const parsed = JSON.parse(contents);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Share store file is invalid');
  }
  return parsed as ShareStore;
};

const isAllowedCoverUrl = (value: string): boolean => {
  if (value.startsWith('data:') || value.startsWith('blob:')) {
    return false;
  }

  if (value.startsWith('/api/gamesdb/images/')) {
    return true;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const host = parsed.hostname;
  if (host === 'image.tmdb.org') return true;
  if (host === 'covers.openlibrary.org') return true;
  if (host === 'coverartarchive.org') return true;
  if (host === 'mzstatic.com' || host.endsWith('.mzstatic.com')) return true;

  return false;
};

const validateAndCanonicalizeSharePayload = (payload: string): string => {
  if (Buffer.byteLength(payload, 'utf-8') > MAX_SHARE_PAYLOAD_BYTES) {
    throw new Error('Share payload is too large');
  }

  const parsed = JSON.parse(payload) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Share payload must be a JSON object');
  }

  const raw = parsed as Record<string, unknown>;
  const gridItems = raw.gridItems;
  if (!Array.isArray(gridItems)) {
    throw new Error('Share payload gridItems must be a list');
  }
  if (gridItems.length > MAX_SHARE_ITEMS) {
    throw new Error('Share payload has too many items');
  }

  const columns = raw.columns;
  const minRows = raw.minRows;
  const layoutDimension = raw.layoutDimension;
  if (
    typeof columns !== 'number' ||
    !Number.isInteger(columns) ||
    columns < 1 ||
    columns > 8
  ) {
    throw new Error('Share payload columns is invalid');
  }
  if (
    typeof minRows !== 'number' ||
    !Number.isInteger(minRows) ||
    minRows < 1 ||
    minRows > 12
  ) {
    throw new Error('Share payload minRows is invalid');
  }
  if (layoutDimension !== 'width' && layoutDimension !== 'height') {
    throw new Error('Share payload layoutDimension is invalid');
  }

  const canonicalItems: SharedStateItem[] = [];

  for (const item of gridItems) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Share payload gridItems entries must be objects');
    }
    const rawItem = item as Record<string, unknown>;

    const type = rawItem.type;
    if (type === 'custom') {
      throw new Error('Custom uploads cannot be shared');
    }
    if (typeof type !== 'string' || type.trim() === '') {
      throw new Error('Share payload item type is invalid');
    }

    const id = rawItem.id;
    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new Error('Share payload item id is invalid');
    }

    const title = rawItem.title;
    if (typeof title !== 'string' || title.trim() === '') {
      throw new Error('Share payload item title is invalid');
    }

    const coverUrl = rawItem.coverUrl;
    if (coverUrl != null) {
      if (typeof coverUrl !== 'string' || !isAllowedCoverUrl(coverUrl)) {
        throw new Error('Share payload item coverUrl is not allowed');
      }
    }

    const coverThumbnailUrl = rawItem.coverThumbnailUrl;
    if (coverThumbnailUrl != null) {
      if (
        typeof coverThumbnailUrl !== 'string' ||
        !isAllowedCoverUrl(coverThumbnailUrl)
      ) {
        throw new Error('Share payload item coverThumbnailUrl is not allowed');
      }
    }

    const alternateCoverUrls = rawItem.alternateCoverUrls;
    if (alternateCoverUrls != null) {
      if (!Array.isArray(alternateCoverUrls)) {
        throw new Error('Share payload item alternateCoverUrls is invalid');
      }
      if (alternateCoverUrls.length > MAX_ALTERNATE_COVERS) {
        throw new Error('Share payload item alternateCoverUrls is too large');
      }
      for (const url of alternateCoverUrls) {
        if (typeof url !== 'string' || !isAllowedCoverUrl(url)) {
          throw new Error(
            'Share payload item alternateCoverUrls contains a disallowed URL',
          );
        }
      }
    }

    const subtitle = rawItem.subtitle;
    if (subtitle != null && typeof subtitle !== 'string') {
      throw new Error('Share payload item subtitle is invalid');
    }

    const year = rawItem.year;
    if (year != null && (typeof year !== 'number' || !Number.isInteger(year))) {
      throw new Error('Share payload item year is invalid');
    }

    const source = rawItem.source;
    if (source != null && typeof source !== 'string') {
      throw new Error('Share payload item source is invalid');
    }

    const aspectRatio = rawItem.aspectRatio;
    if (aspectRatio != null && typeof aspectRatio !== 'number') {
      throw new Error('Share payload item aspectRatio is invalid');
    }

    canonicalItems.push({
      id,
      type,
      title,
      subtitle: subtitle as string | undefined,
      year: year as number | undefined,
      coverUrl: coverUrl as string | null | undefined,
      coverThumbnailUrl: coverThumbnailUrl as string | null | undefined,
      source: source as string | undefined,
      aspectRatio: aspectRatio as number | undefined,
    });
  }

  const canonicalPayload: SharedStatePayload = {
    gridItems: canonicalItems,
    columns,
    minRows,
    layoutDimension,
  };

  return JSON.stringify(canonicalPayload);
};

const loadSlugWords = (): string[] => {
  if (!fs.existsSync(SLUG_WORDS_PATH)) {
    throw new Error('Slug word list is missing');
  }
  const contents = fs.readFileSync(SLUG_WORDS_PATH, 'utf-8');
  const parsed = JSON.parse(contents);
  if (
    !Array.isArray(parsed) ||
    parsed.some((entry) => typeof entry !== 'string')
  ) {
    throw new Error('Slug word list is invalid');
  }
  if (parsed.length < 8) {
    throw new Error('Slug word list is too short');
  }
  return parsed;
};

const persistShareStore = (store: ShareStore): void => {
  fs.writeFileSync(SHARE_STORE_PATH, JSON.stringify(store));
};

const generateSlug = (existing: Set<string>, wordList: string[]): string => {
  for (let i = 0; i < 10; i += 1) {
    const slug = Array.from({ length: 3 })
      .map(() => wordList[crypto.randomInt(0, wordList.length)])
      .join('-');
    if (!existing.has(slug)) {
      return slug;
    }
  }
  throw new Error('Unable to generate unique share slug');
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'log-interceptor',
      configureServer(server) {
        // WebSocket server for CLI ↔ React communication
        const wsPort = Number(
          process.env.VITE_WS_PORT || process.env.WS_PORT || 8080,
        );
        const wss = new WebSocketServer({ port: wsPort });
        let reactClient: WebSocket | null = null;

        // In-memory grid state for API testing
        const gridState: any[] = [];
        const shareStore = loadShareStore();
        const slugWords = loadSlugWords();

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

        // API endpoints for programmatic control
        server.middlewares.use('/api', (req, res, next) => {
          const url = new URL(req.url || '', 'http://localhost');
          const path = url.pathname.replace(/^\/api/, '');
          console.log(`[API] ${req.method} ${url.pathname}`);

          if (path === '/search' && req.method === 'GET') {
            const query = url.searchParams.get('q');
            const mediaType = url.searchParams.get('type') || 'movies';
            if (!query) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ error: 'Query parameter "q" is required' }),
              );
              return;
            }

            (async () => {
              try {
                const { getMediaService } = await import('./src/media/factory');
                const { getMediaProvider } = await import(
                  './src/media/providers'
                );
                const service = getMediaService(mediaType as any);
                const provider = getMediaProvider(mediaType as any);
                const primaryField = provider.searchFields[0]?.id || 'query';
                const results = await service.search({ [primaryField]: query });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(results));
              } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Search failed: ${error}` }));
              }
            })();
          } else if (path === '/share' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                if (
                  !parsed ||
                  typeof parsed !== 'object' ||
                  typeof parsed.payload !== 'string' ||
                  parsed.payload.trim() === ''
                ) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(
                    JSON.stringify({
                      error: 'payload must be a non-empty string',
                    }),
                  );
                  return;
                }

                let canonicalPayload: string;
                try {
                  canonicalPayload = validateAndCanonicalizeSharePayload(
                    parsed.payload,
                  );
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : String(error);
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: message }));
                  return;
                }

                const slug = generateSlug(
                  new Set(Object.keys(shareStore)),
                  slugWords,
                );
                shareStore[slug] = {
                  payload: canonicalPayload,
                  createdAt: Date.now(),
                };
                persistShareStore(shareStore);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ slug, id: slug }));
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : 'Failed to create share';
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: message }));
              }
            });
          } else if (path.startsWith('/share/') && req.method === 'GET') {
            const slug = path.replace('/share/', '');
            const record = shareStore[slug];
            if (!record) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Share not found' }));
              return;
            }
            if (typeof record.payload !== 'string') {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Share payload is invalid' }));
              return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ slug, payload: record.payload }));
          } else if (path.startsWith('/tmdb/') && req.method === 'GET') {
            const tmdbKey = getTmdbKey();
            if (!tmdbKey) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'TMDB API key not configured' }));
              return;
            }

            const params = new URLSearchParams(url.searchParams);
            params.set('api_key', tmdbKey);
            const tmdbPath = path.replace('/tmdb', '');
            const targetUrl = `https://api.themoviedb.org${tmdbPath}?${params.toString()}`;

            const tmdbReq = https.get(targetUrl, (tmdbRes) => {
              let body = '';
              tmdbRes.on('data', (chunk) => {
                body += chunk;
              });
              tmdbRes.on('end', () => {
                res.writeHead(tmdbRes.statusCode || 500, {
                  'Content-Type': 'application/json',
                });
                res.end(body);
              });
            });

            tmdbReq.on('error', (error) => {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(error) }));
            });
          } else if (path === '/add' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const mediaItem = JSON.parse(body);
                gridState.push(mediaItem);
                console.log(
                  `[API] Added item to grid:`,
                  mediaItem.title || mediaItem.id,
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'added', item: mediaItem }));
              } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
              }
            });
          } else if (path.startsWith('/add-first/') && req.method === 'POST') {
            const query = path.replace('/add-first/', '');
            if (reactClient) {
              console.log(`[API] Adding first search result for: "${query}"`);
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
            const index = gridState.findIndex(
              (item) => String(item.id) === String(id),
            );
            if (index >= 0) {
              const removed = gridState.splice(index, 1)[0];
              console.log(
                `[API] Removed item from grid:`,
                removed.title || removed.id,
              );
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'removed', id, item: removed }));
            } else {
              console.log(
                `[API] Remove miss for id ${id}. Grid contains: ${gridState
                  .map((item) => item.id)
                  .join(', ')}`,
              );
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Item not found' }));
            }
          } else if (path === '/grid' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(gridState));
          } else if (path === '/clear' && req.method === 'DELETE') {
            if (reactClient) {
              console.log(`[API] Clearing grid via React`);
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
              console.log(`[API] Requesting menu state from React`);
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
              console.log(`[API] Triggering menu clear action`);
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
              console.log(`[API] Requesting debug information from React`);
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

        server.middlewares.use('/api/games/search', (req, res) => {
          if (req.method === 'GET') {
            const apiKey =
              '46deb66fcbd4eb0d8887e1ac84876fe3b6cacfb956312e5d6e3e37d8ef798728';
            const query = new URL(
              req.url || '',
              'http://localhost',
            ).searchParams.get('q');
            const platform = new URL(
              req.url || '',
              'http://localhost',
            ).searchParams.get('platform');

            if (!query) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ error: 'Query parameter "q" is required' }),
              );
              return;
            }

            let url = `https://api.thegamesdb.net/v1/Games/ByGameName?name=${encodeURIComponent(query)}&apikey=${apiKey}`;

            if (platform) {
              url += `&filter[platform]=${encodeURIComponent(platform)}`;
            }

            https
              .get(url, (apiRes: IncomingMessage) => {
                let data = '';
                apiRes.on('data', (chunk: string) => {
                  data += chunk;
                });
                apiRes.on('end', () => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(data);
                });
              })
              .on('error', (err: Error) => {
                console.error('[GAMES SEARCH ERROR]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to search games' }));
              });
          }
        });

        server.middlewares.use('/api/games/platforms', (req, res) => {
          if (req.method === 'GET') {
            const apiKey =
              '46deb66fcbd4eb0d8887e1ac84876fe3b6cacfb956312e5d6e3e37d8ef798728';
            const url = `https://api.thegamesdb.net/v1/Platforms?apikey=${apiKey}&page_size=100`;

            https
              .get(url, (apiRes: IncomingMessage) => {
                let data = '';
                apiRes.on('data', (chunk: string) => {
                  data += chunk;
                });
                apiRes.on('end', () => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(data);
                });
              })
              .on('error', (err: Error) => {
                console.error('[PLATFORMS ERROR]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to fetch platforms' }));
              });
          }
        });

        server.middlewares.use('/api/games/images', (req, res) => {
          if (req.method === 'GET') {
            const apiKey =
              '46deb66fcbd4eb0d8887e1ac84876fe3b6cacfb956312e5d6e3e37d8ef798728';
            const gameId = new URL(
              req.url || '',
              'http://localhost',
            ).searchParams.get('id');

            if (!gameId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ error: 'Query parameter "id" is required' }),
              );
              return;
            }

            const url = `https://api.thegamesdb.net/v1/Games/Images?games_id=${gameId}&apikey=${apiKey}`;

            https
              .get(url, (apiRes: IncomingMessage) => {
                let data = '';
                apiRes.on('data', (chunk: string) => {
                  data += chunk;
                });
                apiRes.on('end', () => {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(data);
                });
              })
              .on('error', (err: Error) => {
                console.error('[GAMES IMAGES ERROR]', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({ error: 'Failed to fetch game images' }),
                );
              });
          }
        });

        server.middlewares.use('/api/gamesdb', (req, res) => {
          const apiKey =
            '46deb66fcbd4eb0d8887e1ac84876fe3b6cacfb956312e5d6e3e37d8ef798728';
          const url = new URL(req.url || '', 'http://localhost');
          const subpath = url.pathname.replace('/api/gamesdb', '');
          const params = new URLSearchParams(url.search);
          params.append('apikey', apiKey);

          const fullUrl = `https://api.thegamesdb.net${subpath}?${params.toString()}`;

          https
            .get(fullUrl, (apiRes: IncomingMessage) => {
              let data = '';
              apiRes.on('data', (chunk: string) => {
                data += chunk;
              });
              apiRes.on('end', () => {
                res.writeHead(apiRes.statusCode || 200, {
                  'Content-Type': 'application/json',
                });
                res.end(data);
              });
            })
            .on('error', (err: Error) => {
              console.error('[GAMESDB PROXY ERROR]', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ error: 'Failed to fetch from GamesDB' }),
              );
            });
        });
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
