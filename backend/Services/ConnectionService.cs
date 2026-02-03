 using AuthApi.Data;
 using AuthApi.Hubs;
 using AuthApi.Models;
 using Microsoft.AspNetCore.SignalR;
 using Microsoft.EntityFrameworkCore;
 using System.Collections.Concurrent;

 namespace AuthApi.Services;

public class ConnectionService : IConnectionService
{
    private readonly AppDbContext _context;
    private readonly IHubContext<MultiplayerHub> _hubContext;
    private readonly ILogger<ConnectionService> _logger;

    private readonly ConcurrentDictionary<int, string> _userConnections = new();

    public ConnectionService(
        AppDbContext context,
        IHubContext<MultiplayerHub> hubContext,
        ILogger<ConnectionService> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task ConnectUserAsync(int userId, string connectionId)
    {
        _userConnections[userId] = connectionId;
        _logger.LogDebug("User {UserId} connected with connection {ConnectionId}", userId, connectionId);
        await Task.CompletedTask;
    }

    public async Task DisconnectUserAsync(int userId, string connectionId)
    {
        _userConnections.TryRemove(userId, out _);
        _logger.LogDebug("User {UserId} disconnected", userId);
        await Task.CompletedTask;
    }

    public Task<string?> GetConnectionIdAsync(int userId)
    {
        return Task.FromResult(_userConnections.TryGetValue(userId, out var connectionId) ? connectionId : null);
    }

    public async Task<IEnumerable<string>> GetLobbyConnectionIdsAsync(int lobbyId)
    {
        var userIds = await _context.LobbyPlayers
            .Where(lp => lp.LobbyId == lobbyId && lp.ConnectionStatus == PlayerConnectionStatus.Connected)
            .Select(lp => lp.UserId)
            .ToListAsync();

        var connectionIds = new List<string>();
        foreach (var userId in userIds)
        {
            if (_userConnections.TryGetValue(userId, out var connectionId))
            {
                connectionIds.Add(connectionId);
            }
        }

        return connectionIds;
    }

    public async Task BroadcastToLobbyAsync(int lobbyId, string method, object? message)
    {
        var connectionIds = await GetLobbyConnectionIdsAsync(lobbyId);
        foreach (var connectionId in connectionIds)
        {
            await _hubContext.Clients.Client(connectionId).SendAsync(method, message);
        }
    }
}
