using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using AuthApi.Services;
using Multiplayer.DTOs;

namespace AuthApi.Hubs;

[Authorize]
public class MultiplayerHub : Hub
{
    private readonly ILobbyService _lobbyService;
    private readonly IConnectionService _connectionService;
    private readonly ILogger<MultiplayerHub> _logger;

    public MultiplayerHub(
        ILobbyService lobbyService,
        IConnectionService connectionService,
        ILogger<MultiplayerHub> logger)
    {
        _lobbyService = lobbyService;
        _connectionService = connectionService;
        _logger = logger;
    }

    private int CurrentUserId
    {
        get
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }
    }

    public override async Task OnConnectedAsync()
    {
        var userId = CurrentUserId;
        await _connectionService.ConnectUserAsync(userId, Context.ConnectionId);
        await _lobbyService.HandleReconnectAsync(userId, Context.ConnectionId);
        _logger.LogInformation("User {UserId} connected to hub with connection {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = CurrentUserId;
        await _connectionService.DisconnectUserAsync(userId, Context.ConnectionId);
        await _lobbyService.HandleDisconnectAsync(userId, Context.ConnectionId);
        _logger.LogInformation("User {UserId} disconnected from hub with connection {ConnectionId}", userId, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinLobbyGroup(int lobbyId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"lobby_{lobbyId}");
        _logger.LogDebug("User {UserId} joined lobby group {LobbyId}", CurrentUserId, lobbyId);
    }

    public async Task LeaveLobbyGroup(int lobbyId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"lobby_{lobbyId}");
        _logger.LogDebug("User {UserId} left lobby group {LobbyId}", CurrentUserId, lobbyId);
    }

    public async Task BroadcastLobbyListUpdate()
    {
        await Clients.All.SendAsync("LobbyListUpdated");
    }

    public async Task BroadcastLobbyUpdate(int lobbyId, LobbyDetailDto lobbyData)
    {
        await Clients.Group($"lobby_{lobbyId}").SendAsync("LobbyUpdated", lobbyData);
    }

    public async Task BroadcastPlayerJoined(int lobbyId, LobbyPlayerDto player)
    {
        await Clients.Group($"lobby_{lobbyId}").SendAsync("PlayerJoined", player);
    }

    public async Task BroadcastPlayerLeft(int lobbyId, int userId)
    {
        await Clients.Group($"lobby_{lobbyId}").SendAsync("PlayerLeft", userId);
    }
}
