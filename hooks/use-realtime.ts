'use client';

import { useEffect, useRef, useState } from 'react';

interface RealtimeOptions {
  endpoint: string;
  interval?: number; // polling interval in milliseconds
  enabled?: boolean;
  onData?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useRealtime<T = any>({
  endpoint,
  interval = 15000, // 15 seconds default
  enabled = true,
  onData,
  onError,
}: RealtimeOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchData = async (force = false) => {
    const now = Date.now();
    
    // Throttle requests to avoid too frequent calls
    if (!force && now - lastFetchRef.current < 1000) {
      return;
    }
    
    lastFetchRef.current = now;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      onData?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchData(true);
    
    // Set up polling
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, interval);
    }
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const refetch = () => fetchData(true);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // startPolling/stopPolling are intentionally stable inner functions; adding them would cause infinite re-renders.
  }, [endpoint, interval, enabled]);

  return {
    data,
    loading,
    error,
    refetch,
    startPolling,
    stopPolling,
  };
}

// Hook for real-time notifications
export function useRealtimeNotifications(userId: string, enabled = true) {
  return useRealtime({
    endpoint: `/api/notifications`, // Uses session, not userId param
    interval: 30000, // 30 seconds for notifications
    enabled,
  });
}

// Hook for real-time messages
export function useRealtimeMessages(userId: string, otherUserId: string, enabled = true) {
  return useRealtime({
    endpoint: `/api/messages?otherUserId=${otherUserId}`, // API ignores userId, uses session
    interval: 10000, // 10 seconds for messages
    enabled,
  });
}

// Hook for real-time conversations
export function useRealtimeConversations(userId: string, enabled = true) {
  return useRealtime({
    endpoint: `/api/messages/conversations`, // Uses session, not userId param
    interval: 15000, // 15 seconds for conversations
    enabled,
  });
}

// Hook for real-time proposals
export function useRealtimeProposals(chefId?: string, clientId?: string, enabled = true) {
  let endpoint = '/api/proposals';
  const params = new URLSearchParams();
  
  if (chefId) params.append('chefId', chefId);
  if (clientId) params.append('clientId', clientId);
  
  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }
  
  return useRealtime({
    endpoint,
    interval: 12000, // 12 seconds for proposals
    enabled,
  });
}

// Hook for real-time bookings
export function useRealtimeBookings(userId: string, userRole: 'CLIENT' | 'CHEF', enabled = true) {
  const endpoint = userRole === 'CLIENT' 
    ? `/api/bookings?clientId=${userId}`
    : `/api/bookings?chefId=${userId}`;
    
  return useRealtime({
    endpoint,
    interval: 15000, // 15 seconds for bookings
    enabled,
  });
}

// Hook for real-time payments - disabled since endpoint doesn't exist
export function useRealtimePayments(bookingId: string, enabled = false) {
  return useRealtime({
    endpoint: `/api/bookings/${bookingId}`, // Use bookings endpoint instead
    interval: 5000,
    enabled: false, // Disabled until proper payments endpoint exists
  });
}

export function useWebSocket(url: string, enabled = true) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        setConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };
      
      setSocket(ws);
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setConnected(false);
  };

  const sendMessage = (message: any) => {
    if (socket && connected) {
      socket.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // connect/disconnect are intentionally stable inner functions with their own cleanup refs.
  }, [url, enabled]);

  return {
    socket,
    connected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
