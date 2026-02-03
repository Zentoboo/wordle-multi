import { useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import type { LobbyDetailDto, LobbyPlayerDto } from '../types/multiplayer';

export function useLobbySignalR(lobbyId: number | null) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'>('disconnected');
  const [lobbyData, setLobbyData] = useState<LobbyDetailDto | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get access token with automatic refresh
  const getAccessToken = async (): Promise<string | null> => {
    const token = localStorage.getItem('accessToken');
    if (token) return token;
    
    // Try to refresh token if not available
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

  useEffect(() => {
    if (!lobbyId) {
      return;
    }

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
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`SignalR reconnecting in ${delay}ms...`);
          reconnectAttempts.current++;
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    setConnection(newConnection);

    newConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setConnectionState('reconnecting');
      reconnectAttempts.current++;
    });

    newConnection.onreconnected(async (connectionId) => {
      console.log('SignalR reconnected', connectionId);
      setConnectionState('connected');
      reconnectAttempts.current = 0;
      
      try {
        await newConnection.invoke('JoinLobbyGroup', lobbyId);
      } catch (err) {
        console.error('Failed to rejoin lobby group:', err);
      }
    });

    newConnection.onclose((error) => {
      console.log('SignalR closed', error);
      setConnectionState('disconnected');

      // Check if disconnection was due to authentication
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
        return;
      }

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached, stopping');
        newConnection.stop();
      }
    });

    newConnection.start()
      .then(async () => {
        console.log('SignalR connected');
        setConnectionState('connected');

        try {
          await newConnection.invoke('JoinLobbyGroup', lobbyId);

          const token = await getAccessToken();
          if (!token) {
            throw new Error('Authentication required');
          }

          const response = await fetch(`/api/multiplayer/lobbies/${lobbyId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setLobbyData(data);
          } else {
            console.error('Failed to fetch lobby data:', response.status);
            setConnectionState('error');
          }
        } catch (err) {
          console.error('Error setting up lobby connection:', err);
          setConnectionState('error');
        }
      })
      .catch(err => {
        console.error('SignalR connection error:', err);
        setConnectionState('error');
      });

    newConnection.on('LobbyUpdated', (data: LobbyDetailDto) => {
      console.log('Lobby updated:', data);
      setLobbyData(data);
    });

    newConnection.on('PlayerJoined', (player: LobbyPlayerDto) => {
      console.log('Player joined:', player.username);
    });

    newConnection.on('PlayerLeft', (userId: number) => {
      console.log('Player left:', userId);
      if (lobbyData) {
        setLobbyData({
          ...lobbyData,
          players: lobbyData.players.filter(p => p.userId !== userId)
        });
      }
    });

    return () => {
      console.log('Cleaning up SignalR connection');
      newConnection.stop();
      newConnection.off('LobbyUpdated');
      newConnection.off('PlayerJoined');
      newConnection.off('PlayerLeft');
      newConnection.off('reconnecting');
      newConnection.off('reconnected');
      newConnection.off('close');
    };
  }, [lobbyId]);

  return { lobbyData, connectionState, connection };
}
