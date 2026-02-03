import { useEffect, useState } from 'react';
import { useSignalRConnection } from '../contexts/SignalRContext';
import type { LobbyDetailDto, LobbyPlayerDto } from '../types/multiplayer';

export function useLobbySignalR(lobbyId: number | null) {
  const { connection, connectionState, joinLobbyGroup, leaveLobbyGroup, addCleanupCallback } = useSignalRConnection();
  const [lobbyData, setLobbyData] = useState<LobbyDetailDto | null>(null);

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

  useEffect(() => {
    if (!lobbyId || !connection) {
      return;
    }

    const fetchLobbyData = async () => {
      try {
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
        }
      } catch (err) {
        console.error('Error fetching lobby data:', err);
      }
    };

    const onLobbyUpdated = (data: LobbyDetailDto) => {
      console.log('Lobby updated:', data);
      setLobbyData(data);
    };

    const onPlayerJoined = (player: LobbyPlayerDto) => {
      console.log('Player joined:', player.username);
      setLobbyData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: [...prev.players, player]
        };
      });
    };

    const onPlayerLeft = (userId: number) => {
      console.log('Player left:', userId);
      setLobbyData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter(p => p.userId !== userId)
        };
      });
    };

    connection.on('LobbyUpdated', onLobbyUpdated);
    connection.on('PlayerJoined', onPlayerJoined);
    connection.on('PlayerLeft', onPlayerLeft);

    joinLobbyGroup(lobbyId);
    fetchLobbyData();

    const cleanup = addCleanupCallback(() => {
      leaveLobbyGroup(lobbyId);
    });

    return () => {
      connection.off('LobbyUpdated', onLobbyUpdated);
      connection.off('PlayerJoined', onPlayerJoined);
      connection.off('PlayerLeft', onPlayerLeft);
      cleanup();
    };
  }, [lobbyId, connection, joinLobbyGroup, leaveLobbyGroup, addCleanupCallback]);

  return { lobbyData, connectionState, connection };
}
