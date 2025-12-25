import { type WebSocket, WebSocketServer } from 'ws';
import logger from './logger';

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
      logger.warn(
        {
          port: wsPort,
        },
        'WebSocket port already in use',
      );
      globalScope.__aoifeWebSocketServer = undefined;
      return;
    }
    logger.error(
      {
        err: error,
      },
      'WebSocket server error',
    );
  });

  wss.on('connection', (ws) => {
    logger.info('WebSocket React client connected');
    reactClient = ws;

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      logger.info(
        {
          messageType: message.type,
        },
        'WebSocket message from React',
      );
    });

    ws.on('close', () => {
      logger.info('WebSocket React client disconnected');
      reactClient = null;
    });
  });
};
