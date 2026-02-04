import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyApi } from '../services/lobbyApi';
import { useLobbyListSignalR } from '../hooks/useLobbyListSignalR';
import { useLobbyRedirect } from '../hooks/useLobbyRedirect';
import type { CreateLobbyRequest } from '../types/multiplayer';
import CreateLobbyModal from '../components/CreateLobbyModal';
import ProtectedRoute from '../components/ProtectedRoute';

function LobbyList() {
  const { createLobby, joinLobby } = useLobbyApi();
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningLobbyId, setJoiningLobbyId] = useState<number | null>(null);

const { lobbies, refreshLobbies, connectionState } = useLobbyListSignalR();
  const { isChecking } = useLobbyRedirect(true);

  // Show loading while checking for lobby redirect
  if (isChecking) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Checking for active lobby...</div>
        </div>
      </div>
    );
  }

  const handleCreateLobby = async (data: CreateLobbyRequest) => {
    try {
      setIsCreating(true);
      const lobby = await createLobby(data);
      setShowCreateModal(false);
      navigate(`/lobby/${lobby.lobby.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lobby';
      alert(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

const handleJoinLobby = async (lobbyId: number) => {
    try {
      setJoiningLobbyId(lobbyId);
      const lobby = await joinLobby(lobbyId);
      navigate(`/lobby/${lobby.lobby.id}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join lobby';
      alert(errorMessage);
    } finally {
      setJoiningLobbyId(null);
    }
  };

  return (
    <div className="card">
      <div className="lobby-list-header">
        <h2>Available Lobbies</h2>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{
            fontSize: '0.8rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            backgroundColor: connectionState === 'connected' ? '#538d4e' : 
                              connectionState === 'connecting' ? '#b59f3b' : '#e74c3c'
          }}>
            {connectionState === 'connected' ? '● Live' :
             connectionState === 'connecting' ? '○ Connecting...' :
             connectionState === 'error' ? '● Error' : '● Offline'}
          </div>
          <button
            onClick={refreshLobbies}
            style={{ width: 'auto', minWidth: '100px' }}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            Create Lobby
          </button>
        </div>
      </div>

      {lobbies.length === 0 ? (
        <div>No lobbies available. Create one to get started!</div>
      ) : (
        <div className="lobby-grid">
          {lobbies.map((lobby) => (
            <div key={lobby.id} className="lobby-card">
              <div className="lobby-card-header">
                <div className="lobby-card-title">{lobby.name}</div>
                <div className="lobby-card-owner">
                  by {lobby.ownerUsername}
                </div>
              </div>

              <div className="lobby-card-stats">
                <div className="stat-item">
                  <span className="stat-label">Players</span>
                  <span className="stat-value">{lobby.playerCount}/{lobby.maxPlayers}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Rounds</span>
                  <span className="stat-value">{lobby.numberOfRounds}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Time</span>
                  <span className="stat-value">{lobby.roundTimeSeconds}s</span>
                </div>
              </div>

<button
                className="play-button"
                onClick={() => handleJoinLobby(lobby.id)}
                disabled={lobby.playerCount >= lobby.maxPlayers || joiningLobbyId === lobby.id}
              >
                {joiningLobbyId === lobby.id ? 'Joining...' : 
                 lobby.playerCount >= lobby.maxPlayers ? 'Full' : 'Join Lobby'}
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateLobbyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateLobby}
        isSubmitting={isCreating}
      />
    </div>
  );
}

export default function ProtectedLobbyList() {
  return (
    <ProtectedRoute>
      <LobbyList />
    </ProtectedRoute>
  );
}
