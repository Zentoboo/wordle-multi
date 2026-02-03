import { useEffect, useState, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';

interface SignalRConnectionContextType {
  connection: signalR.HubConnection | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  joinLobbyGroup: (lobbyId: number) => Promise<void>;
  leaveLobbyGroup: (lobbyId: number) => Promise<void>;
  addCleanupCallback: (callback: () => void) => () => void;
}

const SignalRConnectionContext = createContext<SignalRConnectionContextType | null>(null);

export function useSignalRConnectionProvider() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const connectionInitialized = useRef(false);
  const cleanupCallbacks = useRef<(() => void)[]>([]);

  const getAccessToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('accessToken');
    if (token) return token;
    
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken })
      });

      if (refreshResponse.ok) {
        const authData = await refreshResponse.json();
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);
        return authData.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return null;
  };

  const joinLobbyGroup = useCallback(async (lobbyId: number) => {
    if (!connection || connectionState !== 'connected') {
      console.warn('Cannot join lobby group: connection not ready');
      return;
    }
    try {
      await connection.invoke('JoinLobbyGroup', lobbyId);
      console.log(`Joined lobby group: ${lobbyId}`);
    } catch (err) {
      console.error('Failed to join lobby group:', err);
      throw err;
    }
  }, [connection, connectionState]);

  const leaveLobbyGroup = useCallback(async (lobbyId: number) => {
    if (!connection) {
      console.warn('Cannot leave lobby group: no connection');
      return;
    }
    try {
      await connection.invoke('LeaveLobbyGroup', lobbyId);
      console.log(`Left lobby group: ${lobbyId}`);
    } catch (err) {
      console.error('Failed to leave lobby group:', err);
    }
  }, [connection]);

  const addCleanupCallback = useCallback((callback: () => void) => {
    cleanupCallbacks.current.push(callback);
    return () => {
      const index = cleanupCallbacks.current.indexOf(callback);
      if (index > -1) {
        cleanupCallbacks.current.splice(index, 1);
      }
    };
  }, []);

  useEffect(() => {
    if (connectionInitialized.current) {
      return;
    }

    connectionInitialized.current = true;
    setConnectionState('connecting');

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/multiplayer', {
        accessTokenFactory: async () => {
          const token = await getAccessToken();
          if (!token) {
            console.error('No authentication token available for SignalR');
            setConnectionState('error');
            throw new Error('Authentication required');
          }
          return token;
        }
      })
      .withHubProtocol(new signalR.JsonHubProtocol())
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`SignalR reconnecting in ${delay}ms... (attempt ${retryContext.previousRetryCount + 1}/${maxReconnectAttempts})`);
          return delay;
        }
      })
      .withServerTimeout(30000)
      .withKeepAliveInterval(15000)
      .configureLogging(signalR.LogLevel.Information)
      .build();

    setConnection(newConnection);

    newConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setConnectionState('reconnecting');
      reconnectAttempts.current++;
    });

    newConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      setConnectionState('connected');
      reconnectAttempts.current = 0;
    });

    newConnection.onclose((error) => {
      console.log('SignalR closed', error);
      setConnectionState('disconnected');

      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
        return;
      }

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached, stopping');
        setConnectionState('error');
      }
    });

    newConnection.start()
      .then(() => {
        console.log('SignalR connected (shared connection)');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
      })
      .catch(err => {
        console.error('SignalR connection error:', err);
        setConnectionState('error');
      });

    return () => {
      console.log('Cleaning up shared SignalR connection');
      cleanupCallbacks.current.forEach(cb => cb());
      cleanupCallbacks.current = [];
      newConnection.stop();
      connectionInitialized.current = false;
    };
  }, []);

  const contextValue: SignalRConnectionContextType = {
    connection,
    connectionState,
    joinLobbyGroup,
    leaveLobbyGroup,
    addCleanupCallback,
  };

  return contextValue;
}

export function SignalRConnectionProvider({ children }: { children: ReactNode }) {
  const contextValue = useSignalRConnectionProvider();

  return (
    <SignalRConnectionContext.Provider value={contextValue}>
      {children}
    </SignalRConnectionContext.Provider>
  );
}

export function useSignalRConnection() {
  const context = useContext(SignalRConnectionContext);
  if (!context) {
    throw new Error('useSignalRConnection must be used within SignalRConnectionProvider');
  }
  return context;
}
