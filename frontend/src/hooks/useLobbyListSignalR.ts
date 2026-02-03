import { useEffect, useState } from 'react';
import type { LobbyDto } from '../types/multiplayer';
import { useSignalRConnection } from '../contexts/SignalRContext';

export function useLobbyListSignalR() {
  const { connection, connectionState } = useSignalRConnection();
  const [lobbies, setLobbies] = useState<LobbyDto[]>([]);

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

  useEffect(() => {
    if (!connection) return;

    const onLobbyListUpdated = async () => {
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
    };

    connection.on('LobbyListUpdated', onLobbyListUpdated);

    refreshLobbies();

    return () => {
      connection.off('LobbyListUpdated', onLobbyListUpdated);
    };
  }, [connection]);

  return { lobbies, refreshLobbies, connectionState };
}
