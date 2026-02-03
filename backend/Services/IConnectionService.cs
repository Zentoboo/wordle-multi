namespace AuthApi.Services;

public interface IConnectionService
{
    Task ConnectUserAsync(int userId, string connectionId);
    Task DisconnectUserAsync(int userId, string connectionId);
    Task<string?> GetConnectionIdAsync(int userId);
    Task<IEnumerable<string>> GetLobbyConnectionIdsAsync(int lobbyId);
    Task BroadcastToLobbyAsync(int lobbyId, string method, object? message);
}
