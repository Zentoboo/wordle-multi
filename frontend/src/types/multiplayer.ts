export const LobbyStatus = {
    Waiting: 0,
    InGame: 1,
    Finished: 2,
    Abandoned: 3
} as const;

export type LobbyStatus = typeof LobbyStatus[keyof typeof LobbyStatus];

export const PlayerConnectionStatus = {
    Connected: 0,
    Disconnected: 1,
    Removed: 2
} as const;

export type PlayerConnectionStatus = typeof PlayerConnectionStatus[keyof typeof PlayerConnectionStatus];

export interface LobbyDto {
    id: number;
    name: string;
    ownerId: number;
    ownerUsername: string;
    maxPlayers: number;
    numberOfRounds: number;
    roundTimeSeconds: number;
    status: LobbyStatus;
    playerCount: number;
    createdAt: string;
}

export interface LobbyPlayerDto {
    userId: number;
    username: string;
    joinOrder: number;
    connectionStatus: PlayerConnectionStatus;
    isOwner: boolean;
}

export interface LobbyDetailDto {
    lobby: LobbyDto;
    players: LobbyPlayerDto[];
}

export interface CreateLobbyRequest {
    name: string;
    maxPlayers: number;
    numberOfRounds: number;
    roundTimeSeconds: number;
}
