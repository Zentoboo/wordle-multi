import { useApi } from './apiClient';
import type { LobbyDto, LobbyDetailDto, CreateLobbyRequest } from '../types/multiplayer';

export function useLobbyApi() {
    const { get, post } = useApi();

    return {
        getAvailableLobbies: () => get<LobbyDto[]>('/multiplayer/lobbies'),
        getLobbyDetail: (lobbyId: number) => get<LobbyDetailDto>(`/multiplayer/lobbies/${lobbyId}`),
        createLobby: (data: CreateLobbyRequest) => post<LobbyDetailDto>('/multiplayer/lobbies', data),
        joinLobby: (lobbyId: number) => post<LobbyDetailDto>(`/multiplayer/lobbies/${lobbyId}/join`),
        leaveLobby: (lobbyId: number) => post(`/multiplayer/lobbies/${lobbyId}/leave`),
        getUserCurrentLobby: () => get<LobbyDetailDto>('/multiplayer/lobbies/my-lobby'),
    };
}
