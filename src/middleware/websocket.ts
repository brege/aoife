import { type WebSocket, WebSocketServer } from 'ws';

let reactClient: WebSocket | null = null;

export const getReactClient = (): WebSocket | null => reactClient;

export const setupWebSocket = (): void => {
  const wsPort = Number(
    process.env.VITE_WS_PORT || process.env.WS_PORT || 8080,
  );
  const wss = new WebSocketServer({ port: wsPort });

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
