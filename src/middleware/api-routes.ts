import type { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import logger from './logger';
import {
  generateSlug,
  loadShareStore,
  loadSlugWords,
  persistShareStore,
  validateAndCanonicalizeSharePayload,
} from './share';
import { getReactClient } from './websocket';

type NextFunction = (error?: unknown) => void;

const getTmdbKey = (env: Record<string, string>) =>
  env.TMDB_API_KEY || process.env.TMDB_API_KEY;

export const createApiMiddleware = (env: Record<string, string>) => {
  const gridState: Record<string, unknown>[] = [];
  const shareStore = loadShareStore();
  const slugWords = loadSlugWords();
  const isContinuousIntegration = process.env.CI === 'true';
  const privateGamesDatabaseKey =
    env.GAMESDB_PRIVATE_KEY || process.env.GAMESDB_PRIVATE_KEY || '';
  const publicGamesDatabaseKey =
    env.GAMESDB_PUBLIC_KEY || process.env.GAMESDB_PUBLIC_KEY || '';
  const gamesDatabaseKey = isContinuousIntegration
    ? publicGamesDatabaseKey
    : privateGamesDatabaseKey || publicGamesDatabaseKey;

  return (req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
    const url = new URL(req.url || '', 'http://localhost');
    // When mounted at specific paths like /api/games, req.url is relative
    // When mounted at /api, req.url includes /gamesdb, /games, etc.
    let path = url.pathname;
    if (path.startsWith('/api/')) {
      path = path.replace(/^\/api/, '');
    }
    const shouldLog = !path.startsWith('/coverart/') && path !== '/openlibrary';
    if (shouldLog) {
      logger.info(
        {
          method: req.method,
          url: req.url,
          path,
        },
        'API request',
      );
    }

    if (path === '/search' && req.method === 'GET') {
      const query = url.searchParams.get('q');
      const mediaType = url.searchParams.get('type') || 'movies';
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
        return;
      }

      (async () => {
        try {
          const { getMediaService } = await import('../providers/factory');
          const { getMediaProvider } = await import('../providers');
          const service = getMediaService(
            mediaType as unknown as Parameters<typeof getMediaService>[0],
          );
          const provider = getMediaProvider(
            mediaType as unknown as Parameters<typeof getMediaProvider>[0],
          );
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
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
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
          if (typeof parsed.title !== 'string' || parsed.title.trim() === '') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                error: 'title must be a non-empty string',
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
            title: parsed.title,
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
      res.end(
        JSON.stringify({
          slug,
          payload: record.payload,
          title: typeof record.title === 'string' ? record.title : undefined,
        }),
      );
    } else if (path.startsWith('/tmdb/') && req.method === 'GET') {
      const tmdbKey = getTmdbKey(env);
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
        let responseBody = '';
        tmdbRes.on('data', (chunk) => {
          responseBody += chunk;
        });
        tmdbRes.on('end', () => {
          res.writeHead(tmdbRes.statusCode || 500, {
            'Content-Type': 'application/json',
          });
          res.end(responseBody);
        });
      });

      tmdbReq.on('error', (error) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(error) }));
      });
    } else if (path.startsWith('/openlibrary/') && req.method === 'GET') {
      const targetPath = path.replace('/openlibrary', '');
      const targetUrl = `https://openlibrary.org${targetPath}${url.search}`;
      const openReq = https.get(targetUrl, (openRes) => {
        let responseBody = '';
        openRes.on('data', (chunk) => {
          responseBody += chunk;
        });
        openRes.on('end', () => {
          res.writeHead(openRes.statusCode || 500, {
            'Content-Type': 'application/json',
          });
          res.end(responseBody);
        });
      });

      openReq.on('error', (error) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(error) }));
      });
    } else if (path === '/googlebooks/image' && req.method === 'GET') {
      const volumeId = url.searchParams.get('id');
      const zoomValue = url.searchParams.get('zoom');
      if (!volumeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing volume id' }));
        return;
      }
      const zoom = zoomValue === '1' || zoomValue === '3' ? zoomValue : '2';
      const targetUrl = `https://books.google.com/books/content?id=${encodeURIComponent(
        volumeId,
      )}&printsec=frontcover&img=1&zoom=${zoom}`;

      const requestCover = (requestUrl: string) => {
        const coverReq = https.get(requestUrl, (coverRes) => {
          const statusCode = coverRes.statusCode || 502;
          const location = coverRes.headers.location;
          if (statusCode >= 300 && statusCode < 400 && location) {
            if (!location.startsWith('https://')) {
              res.writeHead(502, { 'Content-Type': 'text/plain' });
              res.end('Invalid redirect');
              return;
            }
            requestCover(location);
            return;
          }
          res.writeHead(statusCode, {
            'Content-Type': coverRes.headers['content-type'] || 'image/jpeg',
          });
          coverRes.pipe(res);
        });
        coverReq.on('error', (_error) => {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        });
      };

      requestCover(targetUrl);
    } else if (path === '/coverart/image' && req.method === 'GET') {
      const coverType = url.searchParams.get('type');
      const coverId = url.searchParams.get('id');
      const sizeValue = url.searchParams.get('size');
      if (coverType !== 'release') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid cover type' }));
        return;
      }
      if (!coverId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing cover id' }));
        return;
      }
      const size = sizeValue === '250' ? '250' : '500';
      const targetUrl = `https://coverartarchive.org/release/${coverId}/front-${size}`;
      const coverReq = https.get(targetUrl, (coverRes) => {
        const statusCode = coverRes.statusCode || 502;
        const location = coverRes.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          res.writeHead(statusCode, { Location: location });
          res.end();
          return;
        }
        res.writeHead(statusCode, {
          'Content-Type': coverRes.headers['content-type'] || 'image/jpeg',
        });
        coverRes.pipe(res);
      });
      coverReq.on('error', (_error) => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      });
    } else if (path === '/coverart/metadata' && req.method === 'GET') {
      const coverType = url.searchParams.get('type');
      const coverId = url.searchParams.get('id');
      if (coverType !== 'release' && coverType !== 'release-group') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid cover type' }));
        return;
      }
      if (!coverId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing cover id' }));
        return;
      }
      const requestMetadata = (targetUrl: string, depth = 0) => {
        if (depth > 2) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cover art metadata unavailable' }));
          return;
        }
        const coverReq = https.get(targetUrl, (coverRes) => {
          const statusCode = coverRes.statusCode || 502;
          const location = coverRes.headers.location;
          if (statusCode >= 300 && statusCode < 400 && location) {
            requestMetadata(new URL(location, targetUrl).toString(), depth + 1);
            return;
          }
          let responseBody = '';
          coverRes.on('data', (chunk) => {
            responseBody += chunk;
          });
          coverRes.on('end', () => {
            const contentType = coverRes.headers['content-type'];
            if (!contentType?.includes('application/json')) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({ error: 'Cover art metadata unavailable' }),
              );
              return;
            }
            res.writeHead(statusCode, {
              'Content-Type': 'application/json',
            });
            res.end(responseBody);
          });
        });
        coverReq.on('error', (_error) => {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        });
      };

      requestMetadata(`https://coverartarchive.org/${coverType}/${coverId}`);
    } else if (path === '/add' && req.method === 'POST') {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const mediaItem = JSON.parse(body);
          gridState.push(mediaItem);
          logger.info(
            {
              itemId: mediaItem.id,
              title: mediaItem.title,
            },
            'API grid item added',
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
      const reactClient = getReactClient();
      if (reactClient) {
        const decodedQuery = decodeURIComponent(query);
        logger.info(
          {
            query: decodedQuery,
          },
          'API add first search result',
        );
        reactClient.send(
          JSON.stringify({
            type: 'ADD_FIRST_RESULT',
            query: decodedQuery,
          }),
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'sent',
            query: decodedQuery,
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
        logger.info(
          {
            itemId: removed.id,
            title: removed.title,
          },
          'API grid item removed',
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'removed', id, item: removed }));
      } else {
        logger.info(
          {
            missingId: id,
            gridItemIds: gridState.map((item) => item.id),
          },
          'API grid remove miss',
        );
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Item not found' }));
      }
    } else if (path === '/grid' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(gridState));
    } else if (path === '/clear' && req.method === 'DELETE') {
      const reactClient = getReactClient();
      if (reactClient) {
        logger.info('API clearing grid via React');
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
      const reactClient = getReactClient();
      if (reactClient) {
        logger.info('API requesting menu state from React');
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
      const reactClient = getReactClient();
      if (reactClient) {
        logger.info('API triggering menu clear action');
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
      const reactClient = getReactClient();
      if (reactClient) {
        logger.info('API requesting debug information from React');
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
      const userAgent = req.headers['user-agent'];
      const deviceType = userAgent?.includes('Mobile') ? 'mobile' : 'desktop';
      logger.info(
        {
          deviceType,
          userAgent,
        },
        'Viewport measurement request',
      );

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
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const v = data.viewport;
          const c = data.container;
          const a = data.analysis;
          const sizeDelta =
            typeof a?.optimalTwoColumn === 'number' &&
            typeof a?.actualPosterWidth === 'number'
              ? a.optimalTwoColumn - a.actualPosterWidth
              : undefined;

          logger.info(
            {
              viewport: v,
              container: c,
              analysis: a,
              sizeDelta,
            },
            'Viewport analysis',
          );
        } catch {
          logger.warn(
            {
              body,
            },
            'Viewport analysis payload invalid',
          );
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'logged' }));
      });
    } else if (path === '/games/search' && req.method === 'GET') {
      if (!gamesDatabaseKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GamesDB API key not configured' }));
        return;
      }
      const query = url.searchParams.get('q');
      const platform = url.searchParams.get('platform');

      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
        return;
      }

      let gamesdbUrl = `https://api.thegamesdb.net/v1/Games/ByGameName?name=${encodeURIComponent(query)}&apikey=${gamesDatabaseKey}`;

      if (platform) {
        gamesdbUrl += `&filter[platform]=${encodeURIComponent(platform)}`;
      }

      https
        .get(gamesdbUrl, (apiRes: IncomingMessage) => {
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
          logger.error(
            {
              err,
            },
            'Games search failed',
          );
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to search games' }));
        });
    } else if (path === '/games/platforms' && req.method === 'GET') {
      if (!gamesDatabaseKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GamesDB API key not configured' }));
        return;
      }
      const gamesdbUrl = `https://api.thegamesdb.net/v1/Platforms?apikey=${gamesDatabaseKey}&page_size=100`;

      https
        .get(gamesdbUrl, (apiRes: IncomingMessage) => {
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
          logger.error(
            {
              err,
            },
            'Platforms request failed',
          );
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch platforms' }));
        });
    } else if (path === '/games/images' && req.method === 'GET') {
      if (!gamesDatabaseKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GamesDB API key not configured' }));
        return;
      }
      const gameId = url.searchParams.get('id');

      if (!gameId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query parameter "id" is required' }));
        return;
      }

      const gamesdbUrl = `https://api.thegamesdb.net/v1/Games/Images?games_id=${gameId}&apikey=${gamesDatabaseKey}`;

      https
        .get(gamesdbUrl, (apiRes: IncomingMessage) => {
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
          logger.error(
            {
              err,
            },
            'Games images request failed',
          );
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch game images' }));
        });
    } else if (path.startsWith('/gamesdb/images/') && req.method === 'GET') {
      const subpath = path.replace('/gamesdb/images/', '');
      if (!subpath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing image path' }));
        return;
      }

      const targetUrl = `https://cdn.thegamesdb.net/images/large/${subpath}`;
      const imageReq = https.get(targetUrl, (imageRes) => {
        res.writeHead(imageRes.statusCode || 502, {
          'Content-Type': imageRes.headers['content-type'] || 'image/jpeg',
        });
        imageRes.pipe(res);
      });

      imageReq.on('error', (error) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(error) }));
      });
    } else if (path.startsWith('/gamesdb')) {
      if (!gamesDatabaseKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'GamesDB API key not configured' }));
        return;
      }
      const gamesdbPrefix = '/gamesdb';
      const subpath = path.slice(gamesdbPrefix.length) || '/';
      const params = new URLSearchParams(url.search);
      params.set('apikey', gamesDatabaseKey);

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
          logger.error(
            {
              err,
            },
            'GamesDB proxy request failed',
          );
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to fetch from GamesDB' }));
        });
    } else {
      next();
    }
  };
};
