using Multiplayer.DTOs;

namespace AuthApi.Services;

public interface ILobbyService
{
    Task<LobbyDetailDto> CreateLobbyAsync(int userId, CreateLobbyDto dto);
    Task<LobbyDetailDto> JoinLobbyAsync(int userId, int lobbyId);
Task<LobbyDetailDto?> LeaveLobbyAsync(int userId, int lobbyId);
    Task<LobbyDetailDto> GetLobbyAsync(int lobbyId);
    Task<LobbyDetailDto?> GetUserCurrentLobbyAsync(int userId);
    Task<List<LobbyDto>> GetAvailableLobbiesAsync();
    Task HandleDisconnectAsync(int userId, string connectionId);
    Task HandleReconnectAsync(int userId, string connectionId);
    Task CleanupInactiveLobbiesAsync();
    Task CleanupDisconnectedPlayersAsync();
}
