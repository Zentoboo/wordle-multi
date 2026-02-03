import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLobbyApi } from '../services/lobbyApi';
import { useAuth } from '../contexts';
import { useLobbySignalR } from '../hooks/useLobbySignalR';
import type { LobbyStatus } from '../types/multiplayer';
import ProtectedRoute from '../components/ProtectedRoute';

function LobbyDetail() {
  const { user } = useAuth();
  const { leaveLobby } = useLobbyApi();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isLeaving, setIsLeaving] = useState(false);

  const lobbyId = id ? parseInt(id) : null;
  const { lobbyData: lobby, connectionState } = useLobbySignalR(lobbyId);

  const handleLeaveLobby = async () => {
    if (!lobbyId || !confirm('Are you sure you want to leave this lobby?')) return;

    try {
      setIsLeaving(true);
      await leaveLobby(lobbyId);
      navigate('/lobby');
    } catch (err) {
      alert('Failed to leave lobby. Please try again.');
      console.error('Error leaving lobby:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const getStatusText = (status: LobbyStatus): string => {
    switch (status) {
      case 0:
        return 'Waiting';
      case 1:
        return 'In Game';
      case 2:
        return 'Finished';
      case 3:
        return 'Abandoned';
      default:
        return 'Unknown';
    }
  };

  if (!user || !lobbyId) {
    return <div>Loading...</div>;
  }

  if (!lobby) {
    return (
      <div className="card">
        <h2>Lobby Not Found</h2>
        <button onClick={() => navigate('/lobby')}>Back to Lobbies</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2>{lobby?.lobby.name || 'Loading...'}</h2>
          <div style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            backgroundColor: connectionState === 'connected' ? '#538d4e' :
              connectionState === 'connecting' ? '#b59f3b' : '#e74c3c'
          }}>
            {connectionState === 'connected' ? '● Connected' :
              connectionState === 'connecting' ? '○ Connecting...' :
              connectionState === 'error' ? '● Error' : '● Disconnected'}
          </div>
        </div>
        <button
          onClick={handleLeaveLobby}
          className="leave-button"
          disabled={connectionState !== 'connected' || isLeaving}
        >
          {isLeaving ? 'Leaving...' : 'Leave Lobby'}
        </button>
      </div>

      {lobby && (
        <>
          <div className="lobby-detail-grid">
            <div className="lobby-info-section">
              <div className="section-title">Lobby Info</div>

              <div className="info-row">
                <span className="info-label">Owner:</span>
                <span className="info-value">{lobby.lobby.ownerUsername}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Status:</span>
                <span className="info-value">{getStatusText(lobby.lobby.status)}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Max Players:</span>
                <span className="info-value">{lobby.lobby.maxPlayers}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Current Players:</span>
                <span className="info-value">{lobby.lobby.playerCount}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Number of Rounds:</span>
                <span className="info-value">{lobby.lobby.numberOfRounds}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Round Time:</span>
                <span className="info-value">{lobby.lobby.roundTimeSeconds} seconds</span>
              </div>
            </div>

            <div className="player-list-section">
              <div className="section-title">Players ({lobby.players.length}/{lobby.lobby.maxPlayers})</div>

              {lobby.players.length === 0 ? (
                <div>No players in lobby yet</div>
              ) : (
                <div className="player-list">
                  {lobby.players
                    .sort((a: any, b: any) => a.joinOrder - b.joinOrder)
                    .map((player: any) => (
                      <div key={player.userId} className="player-item">
                        <div className="player-info">
                          <span className="player-name">{player.username}</span>
                          {player.isOwner && (
                            <span className="owner-badge">Owner</span>
                          )}
                        </div>
                        <div>
                          <div className={`player-status ${player.connectionStatus === 0 ? 'status-connected' : 'status-disconnected'}`}>
                            {player.connectionStatus === 0 ? '● Connected' : '○ Disconnected'}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {lobby.players.length >= lobby.lobby.maxPlayers && (
                <div style={{ marginTop: '0.8rem', color: '#538d4e', fontSize: '0.9rem' }}>
                  Lobby is full! Waiting for game to start...
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProtectedLobbyDetail() {
  return (
    <ProtectedRoute>
      <LobbyDetail />
    </ProtectedRoute>
  );
}
