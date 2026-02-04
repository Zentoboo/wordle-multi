import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLobbyApi } from '../services/lobbyApi';

export function useLobbyRedirect(shouldCheck = false) {
    const { getUserCurrentLobby } = useLobbyApi();
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (!shouldCheck) return;

        const checkLobbyAndRedirect = async () => {
            try {
                setIsChecking(true);
                const lobby = await getUserCurrentLobby();
                if (lobby) {
                    navigate(`/lobby/${lobby.lobby.id}`, { replace: true });
                }
            } catch (error) {
                // 404 means not in lobby, which is fine
                // Other errors we can ignore for now
            } finally {
                setIsChecking(false);
            }
        };

        checkLobbyAndRedirect();
    }, [shouldCheck, getUserCurrentLobby, navigate]);

    return { isChecking };
}