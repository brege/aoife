import { type WebSocket, WebSocketServer } from 'ws';

let reactClient: WebSocket | null = null;
type GlobalWithWebSocketServer = typeof globalThis & {
  __aoifeWebSocketServer?: WebSocketServer;
};
const globalScope = globalThis as GlobalWithWebSocketServer;

export const getReactClient = (): WebSocket | null => reactClient;

export const setupWebSocket = (): void => {
  if (globalScope.__aoifeWebSocketServer) {
    return;
  }
  const wsPort = Number(
    process.env.VITE_WS_PORT || process.env.WS_PORT || 8080,
  );
  const wss = new WebSocketServer({ port: wsPort });
  globalScope.__aoifeWebSocketServer = wss;

  wss.on('error', (error) => {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (errorCode === 'EADDRINUSE') {
      console.warn(`[WS] Port ${wsPort} already in use`);
      globalScope.__aoifeWebSocketServer = undefined;
      return;
    }
    console.error('[WS] Server error', error);
  });

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
};
