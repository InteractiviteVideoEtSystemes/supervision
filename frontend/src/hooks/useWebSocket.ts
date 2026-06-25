import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { StatusResponse } from '../types';
import { apiBaseUrl } from '../api/client';

const getSocketBaseUrl = () => apiBaseUrl || window.location.origin;

export const useWebSocket = (
  environment: string,
  onStatusUpdate: (payload: StatusResponse) => void,
  onFallbackPoll?: () => void,
) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!environment) {
      return undefined;
    }

    const socket = io(`${getSocketBaseUrl()}/ws/status`, {
      withCredentials: true,
      query: { env: environment },
      transports: ['websocket', 'polling'],
    });

    let pollInterval: number | undefined;

    const stopPolling = () => {
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = undefined;
      }
    };

    const startPolling = () => {
      if (!onFallbackPoll || pollInterval) {
        return;
      }
      onFallbackPoll();
      pollInterval = window.setInterval(onFallbackPoll, 30000);
    };

    socket.on('connect', () => {
      setConnected(true);
      stopPolling();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      startPolling();
    });

    socket.on('connect_error', () => {
      setConnected(false);
      startPolling();
    });

    socket.on('status-update', (payload: StatusResponse) => {
      onStatusUpdate(payload);
    });

    return () => {
      stopPolling();
      socket.disconnect();
    };
  }, [environment, onFallbackPoll, onStatusUpdate]);

  return connected;
};
