import { useEffect, useRef } from 'react';
import type { MediaItem } from '../media/types';
import logger from './logger';

type CliGridPosition = {
  position: number;
  matrixPosition: string;
  media: {
    id: string | number;
    title: string;
    year?: number;
  };
};

type CliGridState = {
  count: number;
  maxCapacity: number;
  positions: CliGridPosition[];
  emptyPositions: Array<{
    position: number;
    matrixPosition: string;
  }>;
};

type CliMenuOption = {
  name: string;
  type: 'action' | 'feature' | 'info';
  enabled: boolean;
  description: string;
};

type CliMenuSection = {
  name: string;
  options: CliMenuOption[];
};

export type CliMenuState = {
  sections: CliMenuSection[];
  currentGridCount: number;
  maxGridCapacity: number;
};

type CliDebugInfo = Record<string, unknown>;

declare global {
  interface Window {
    gridDebugInfo?: CliDebugInfo;
  }
}

interface CliMessage {
  type:
    | 'SEARCH'
    | 'ADD_MEDIA'
    | 'REMOVE_MEDIA'
    | 'GET_GRID_STATE'
    | 'CLEAR_GRID'
    | 'ADD_FIRST_RESULT'
    | 'GET_MENU_STATE'
    | 'MENU_CLEAR_GRID'
    | 'GET_DEBUG_INFO';
  query?: string;
  mediaType?: string;
  media?: MediaItem;
  id?: string | number;
}

interface CliBridgeProps {
  onSearch: (query: string, mediaType?: string) => Promise<void>;
  onAddMedia: (media: MediaItem) => void;
  onRemoveMedia: (id: string | number) => void;
  onGetGridState: () => CliGridState;
  onClearGrid: () => void;
  onAddFirstResult: (query: string) => Promise<void>;
  onGetMenuState: () => CliMenuState;
  onMenuClearGrid: () => void;
  onGetDebugInfo: () => CliDebugInfo;
}

export function useCliBridge(props: CliBridgeProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const propsRef = useRef(props);

  // Update props ref without triggering reconnection
  propsRef.current = props;

  useEffect(() => {
    // Only connect to CLI bridge in development
    if (!import.meta.env.DEV) {
      return;
    }

    const wsPort = import.meta.env.VITE_WS_PORT ?? '8080';
    // Only connect if not already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Connect to WebSocket server
    try {
      const ws = new WebSocket(`ws://localhost:${wsPort}`);
      wsRef.current = ws;

    ws.onopen = () => {
      logger.info('[CLI-Bridge] Connected to CLI WebSocket server', {
        context: 'useCliBridge',
      });
    };

    ws.onmessage = async (event) => {
      try {
        const message: CliMessage = JSON.parse(event.data);
        logger.info(`[CLI-Bridge] Received command: ${message.type}`, {
          context: 'useCliBridge',
          command: message.type,
        });

        switch (message.type) {
          case 'SEARCH':
            if (message.query) {
              await propsRef.current.onSearch(message.query, message.mediaType);
            }
            break;

          case 'ADD_MEDIA':
            if (message.media) {
              propsRef.current.onAddMedia(message.media);
            }
            break;

          case 'REMOVE_MEDIA':
            if (message.id !== undefined) {
              propsRef.current.onRemoveMedia(message.id);
            }
            break;

          case 'GET_GRID_STATE': {
            const currentState = propsRef.current.onGetGridState();
            logger.info(`[CLI-Bridge] Current grid state received`, {
              context: 'useCliBridge',
              gridState: currentState,
            });
            break;
          }

          case 'CLEAR_GRID':
            propsRef.current.onClearGrid();
            break;

          case 'ADD_FIRST_RESULT':
            if (message.query) {
              await propsRef.current.onAddFirstResult(message.query);
            }
            break;

          case 'GET_MENU_STATE': {
            const menuState = propsRef.current.onGetMenuState();
            logger.info('[CLI-Bridge] Menu state requested', {
              context: 'useCliBridge',
              menuState,
            });
            break;
          }

          case 'MENU_CLEAR_GRID':
            propsRef.current.onMenuClearGrid();
            break;

          case 'GET_DEBUG_INFO': {
            const debugInfo = propsRef.current.onGetDebugInfo();
            logger.info('[CLI-Bridge] Debug info requested', {
              context: 'useCliBridge',
              debugInfo,
            });
            break;
          }
        }
      } catch (error) {
        logger.error('[CLI-Bridge] Failed to process CLI message', {
          context: 'useCliBridge',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    ws.onclose = () => {
      logger.warn('[CLI-Bridge] Disconnected from CLI WebSocket server', {
        context: 'useCliBridge',
      });
    };

      ws.onerror = (error) => {
        logger.error('[CLI-Bridge] WebSocket error', {
          context: 'useCliBridge',
          error: String(error),
        });
      };

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      logger.warn('[CLI-Bridge] WebSocket not available', {
        context: 'useCliBridge',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []); // Empty dependency array to prevent reconnections

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
