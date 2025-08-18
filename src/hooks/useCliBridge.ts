import { useEffect, useRef } from 'react';
import { Movie } from '../types/media';
import logger from '../utils/logger';

interface CliMessage {
  type: 'SEARCH' | 'ADD_MEDIA' | 'REMOVE_MEDIA' | 'GET_GRID_STATE' | 'CLEAR_GRID' | 'ADD_FIRST_RESULT' | 'GET_MENU_STATE' | 'MENU_CLEAR_GRID';
  query?: string;
  media?: Movie;
  id?: string | number;
}

interface CliBridgeProps {
  onSearch: (query: string) => Promise<void>;
  onAddMedia: (media: Movie) => void;
  onRemoveMedia: (id: string | number) => void;
  onGetGridState: () => any;
  onClearGrid: () => void;
  onAddFirstResult: (query: string) => Promise<void>;
  onGetMenuState: () => any;
  onMenuClearGrid: () => void;
}

export function useCliBridge(props: CliBridgeProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const propsRef = useRef(props);
  
  // Update props ref without triggering reconnection
  propsRef.current = props;

  useEffect(() => {
    // Only connect if not already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
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
              await propsRef.current.onSearch(message.query);
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
          
          case 'GET_GRID_STATE':
            const currentState = propsRef.current.onGetGridState();
            logger.info(`[CLI-Bridge] Current grid state received`, {
              context: 'useCliBridge',
              gridState: currentState
            });
            break;
          
          case 'CLEAR_GRID':
            propsRef.current.onClearGrid();
            break;
          
          case 'ADD_FIRST_RESULT':
            if (message.query) {
              await propsRef.current.onAddFirstResult(message.query);
            }
            break;
          
          case 'GET_MENU_STATE':
            const menuState = propsRef.current.onGetMenuState();
            logger.info('[CLI-Bridge] Menu state requested', {
              context: 'useCliBridge',
              menuState
            });
            break;
          
          case 'MENU_CLEAR_GRID':
            propsRef.current.onMenuClearGrid();
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
  }, []); // Empty dependency array to prevent reconnections

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}