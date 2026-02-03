import { useState } from 'react';
import type { CreateLobbyRequest } from '../types/multiplayer';

interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateLobbyRequest) => Promise<void>;
  isSubmitting: boolean;
}

function CreateLobbyModal({ isOpen, onClose, onCreate, isSubmitting }: CreateLobbyModalProps) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [numberOfRounds, setNumberOfRounds] = useState(1);
  const [roundTimeSeconds, setRoundTimeSeconds] = useState(90);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    if (maxPlayers < 2 || maxPlayers > 8) {
      newErrors.maxPlayers = 'Max players must be between 2 and 8';
    }

    if (numberOfRounds < 1 || numberOfRounds > 20) {
      newErrors.numberOfRounds = 'Rounds must be between 1 and 20';
    }

    if (roundTimeSeconds < 15 || roundTimeSeconds > 300) {
      newErrors.roundTimeSeconds = 'Round time must be between 15 and 300 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onCreate({
      name: name.trim(),
      maxPlayers,
      numberOfRounds,
      roundTimeSeconds
    });
  };

  const resetForm = () => {
    setName('');
    setMaxPlayers(2);
    setNumberOfRounds(1);
    setRoundTimeSeconds(90);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Lobby</h2>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Lobby Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter lobby name"
            />
            {errors.name && (
              <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.name}
              </div>
            )}
          </div>

          <div className="form-row">
            <div>
              <label>Max Players</label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                disabled={isSubmitting}
                min={2}
                max={8}
              />
              {errors.maxPlayers && (
                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {errors.maxPlayers}
                </div>
              )}
            </div>

            <div>
              <label>Number of Rounds</label>
              <input
                type="number"
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(parseInt(e.target.value))}
                disabled={isSubmitting}
                min={1}
                max={20}
              />
              {errors.numberOfRounds && (
                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  {errors.numberOfRounds}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Round Time (seconds)</label>
            <input
              type="number"
              value={roundTimeSeconds}
              onChange={(e) => setRoundTimeSeconds(parseInt(e.target.value))}
              disabled={isSubmitting}
              min={15}
              max={300}
            />
            {errors.roundTimeSeconds && (
              <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {errors.roundTimeSeconds}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateLobbyModal;
