import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { LobbyDto } from '../types/multiplayer';

export function useLobbyListSignalR() {
  const [lobbies, setLobbies] = useState<LobbyDto[]>([]);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

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
          // Exponential backoff with max delay
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          console.log(`SignalR reconnecting in ${delay}ms...`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    newConnection.start()
      .then(async () => {
        console.log('SignalR connected (lobby list)');
        setConnectionState('connected');

        try {
          const response = await fetch('/api/multiplayer/lobbies', {
            headers: {
              'Authorization': `Bearer ${await getAccessToken()}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setLobbies(data);
          } else {
            console.error('Failed to fetch lobbies:', response.status);
            setConnectionState('error');
          }
        } catch (error) {
          console.error('Error fetching lobbies:', error);
          setConnectionState('error');
        }
      })
      .catch(err => {
        console.error('SignalR connection error:', err);
        setConnectionState('error');
      });

    newConnection.on('LobbyListUpdated', async () => {
      console.log('Lobby list updated, refreshing...');
      try {
        const token = await getAccessToken();
        if (!token) {
          console.error('No authentication token for lobby update');
          return;
        }

        const response = await fetch('/api/multiplayer/lobbies', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setLobbies(data);
        } else {
          console.error('Failed to refresh lobbies on update:', response.status);
        }
      } catch (error) {
        console.error('Error refreshing lobbies on update:', error);
      }
    });

    newConnection.onreconnecting((error) => {
      console.log('SignalR reconnecting...', error);
      setConnectionState('connecting');
    });

    newConnection.onreconnected((connectionId) => {
      console.log('SignalR reconnected', connectionId);
      setConnectionState('connected');
    });

    newConnection.onclose((error) => {
      console.log('SignalR disconnected', error);
      setConnectionState('disconnected');
      
      // Check if disconnection was due to authentication
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.error('Authentication failed - redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth';
      }
    });

    return () => {
      console.log('Cleaning up SignalR connection (lobby list)');
      newConnection.stop();
      newConnection.off('LobbyListUpdated');
      newConnection.off('close');
    };
  }, []);

  const refreshLobbies = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        console.error('No authentication token available');
        return;
      }

      const response = await fetch('/api/multiplayer/lobbies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLobbies(data);
      } else {
        console.error('Failed to refresh lobbies:', response.status);
      }
    } catch (err) {
      console.error('Error refreshing lobbies:', err);
    }
  };

  return { lobbies, refreshLobbies, connectionState };
}
