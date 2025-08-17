import { useEffect, useRef } from 'react';
import { Movie } from '../types/media';
import { MediaServiceFactory } from '../services/media-service-factory';
import logger from '../utils/logger';

interface CliMessage {
  type: 'SEARCH' | 'ADD_MEDIA' | 'REMOVE_MEDIA' | 'GET_GRID_STATE';
  query?: string;
  media?: Movie;
  id?: string | number;
}

interface CliBridgeProps {
  onSearch: (query: string) => Promise<void>;
  onAddMedia: (media: Movie) => void;
  onRemoveMedia: (id: string | number) => void;
  onGetGridState: () => Movie[];
}

export function useCliBridge(props: CliBridgeProps) {
  const { onSearch, onAddMedia, onRemoveMedia, onGetGridState } = props;
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      logger.info('[CLI-Bridge] Connected to CLI WebSocket server', {
        context: 'useCliBridge'
      });
    };

    ws.onmessage = async (event) => {
      try {
        const message: CliMessage = JSON.parse(event.data);
        logger.info(`[CLI-Bridge] Received command: ${message.type}`, {
          context: 'useCliBridge',
          command: message.type
        });

        switch (message.type) {
          case 'SEARCH':
            if (message.query) {
              await onSearch(message.query);
            }
            break;
          
          case 'ADD_MEDIA':
            if (message.media) {
              onAddMedia(message.media);
            }
            break;
          
          case 'REMOVE_MEDIA':
            if (message.id !== undefined) {
              onRemoveMedia(message.id);
            }
            break;
          
          case 'GET_GRID_STATE':
            const currentState = onGetGridState();
            logger.info(`[CLI-Bridge] Current grid state: ${currentState.length} items`, {
              context: 'useCliBridge',
              gridState: currentState.map(item => ({ id: item.id, title: item.title }))
            });
            break;
        }
      } catch (error) {
        logger.error('[CLI-Bridge] Failed to process CLI message', {
          context: 'useCliBridge',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    };

    ws.onclose = () => {
      logger.warn('[CLI-Bridge] Disconnected from CLI WebSocket server', {
        context: 'useCliBridge'
      });
    };

    ws.onerror = (error) => {
      logger.error('[CLI-Bridge] WebSocket error', {
        context: 'useCliBridge',
        error: String(error)
      });
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [onSearch, onAddMedia, onRemoveMedia, onGetGridState]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}