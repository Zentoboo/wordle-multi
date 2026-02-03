using AuthApi.Data;
using AuthApi.Models;
using AuthApi.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Multiplayer.DTOs;

namespace AuthApi.Services;

public class LobbyService : ILobbyService
{
    private readonly AppDbContext _context;
    private readonly IConnectionService _connectionService;
    private readonly IHubContext<MultiplayerHub> _hubContext;
    private readonly ILogger<LobbyService> _logger;

    private const int DisconnectTimeoutMinutes = 3;

    public LobbyService(
        AppDbContext context,
        IConnectionService connectionService,
        IHubContext<MultiplayerHub> hubContext,
        ILogger<LobbyService> logger)
    {
        _context = context;
        _connectionService = connectionService;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<LobbyDetailDto> CreateLobbyAsync(int userId, CreateLobbyDto dto)
    {
        var existingLobby = await _context.LobbyPlayers
            .Include(lp => lp.Lobby)
            .Where(lp => lp.UserId == userId && lp.ConnectionStatus != PlayerConnectionStatus.Removed)
            .FirstOrDefaultAsync();

        if (existingLobby != null)
            throw new InvalidOperationException("You are already in a lobby. Leave your current lobby first.");

        var lobby = new Lobby
        {
            Name = dto.Name,
            OwnerId = userId,
            MaxPlayers = dto.MaxPlayers,
            NumberOfRounds = dto.NumberOfRounds,
            RoundTimeSeconds = dto.RoundTimeSeconds,
            Status = LobbyStatus.Waiting,
            CreatedAt = DateTime.UtcNow
        };

        var player = new LobbyPlayer
        {
            LobbyId = lobby.Id,
            UserId = userId,
            JoinOrder = 0,
            ConnectionStatus = PlayerConnectionStatus.Connected,
            LastConnectedAt = DateTime.UtcNow
        };

        _context.Lobbies.Add(lobby);
        lobby.Players.Add(player);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("User {UserId} created lobby {LobbyId}", userId, lobby.Id);

        var lobbyDetail = await GetLobbyDetailAsync(lobby.Id);
        
        // Broadcast updates
        await _hubContext.Clients.All.SendAsync("LobbyListUpdated");
        await _hubContext.Clients.Group($"lobby_{lobby.Id}").SendAsync("LobbyCreated", lobbyDetail);
        
        return lobbyDetail;
    }

    public async Task<LobbyDetailDto> JoinLobbyAsync(int userId, int lobbyId)
    {
        var lobby = await _context.Lobbies
            .Include(l => l.Players)
            .FirstOrDefaultAsync(l => l.Id == lobbyId);

        if (lobby == null)
            throw new NotFoundException("Lobby not found");

        if (lobby.Status != LobbyStatus.Waiting)
            throw new InvalidOperationException("Cannot join a lobby that is already in progress");

        if (lobby.Players.Count >= lobby.MaxPlayers)
            throw new InvalidOperationException("Lobby is full");

        if (lobby.Players.Any(p => p.UserId == userId))
            throw new InvalidOperationException("You are already in this lobby");

        var existingLobbyPlayer = await _context.LobbyPlayers
            .Include(lp => lp.Lobby)
            .Where(lp => lp.UserId == userId && lp.ConnectionStatus != PlayerConnectionStatus.Removed)
            .FirstOrDefaultAsync();

        if (existingLobbyPlayer != null)
            throw new InvalidOperationException("You are already in a lobby. Leave your current lobby first.");

        var player = new LobbyPlayer
        {
            LobbyId = lobbyId,
            UserId = userId,
            JoinOrder = lobby.Players.Count,
            ConnectionStatus = PlayerConnectionStatus.Connected,
            LastConnectedAt = DateTime.UtcNow
        };

        _context.LobbyPlayers.Add(player);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("User {UserId} joined lobby {LobbyId}", userId, lobbyId);

        var lobbyDetail = await GetLobbyDetailAsync(lobbyId);
        var newPlayer = lobbyDetail.Players.FirstOrDefault(p => p.UserId == userId);
        
        // Broadcast updates
        await _hubContext.Clients.All.SendAsync("LobbyListUpdated");
        await _hubContext.Clients.Group($"lobby_{lobbyId}").SendAsync("PlayerJoined", newPlayer);
        
        return lobbyDetail;
    }

    public async Task<LobbyDetailDto?> LeaveLobbyAsync(int userId, int lobbyId)
    {
        var lobby = await _context.Lobbies
            .Include(l => l.Players)
            .FirstOrDefaultAsync(l => l.Id == lobbyId);

        if (lobby == null)
            throw new NotFoundException("Lobby not found");

        var player = lobby.Players.FirstOrDefault(p => p.UserId == userId);
        if (player == null)
            throw new NotFoundException("You are not in this lobby");

        _context.LobbyPlayers.Remove(player);
        await _context.SaveChangesAsync();
        
        if (lobby.OwnerId == userId)
        {
            await TransferOwnershipAsync(lobby);
        }
        
        if (!lobby.Players.Any())
        {
            _context.Lobbies.Remove(lobby);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Lobby {LobbyId} deleted - no players remaining", lobbyId);
            
            // Broadcast lobby list update (lobby removed)
            await _hubContext.Clients.All.SendAsync("LobbyListUpdated");
            
            return null;
        }
        
        _logger.LogInformation("User {UserId} left lobby {LobbyId}", userId, lobbyId);

        var lobbyDetail = await GetLobbyDetailAsync(lobbyId);
        
        // Broadcast updates
        await _hubContext.Clients.All.SendAsync("LobbyListUpdated");
        await _hubContext.Clients.Group($"lobby_{lobbyId}").SendAsync("PlayerLeft", userId);
        if (lobbyDetail != null)
        {
            await _hubContext.Clients.Group($"lobby_{lobbyId}").SendAsync("LobbyUpdated", lobbyDetail);
        }

        return lobbyDetail;
    }

    private async Task TransferOwnershipAsync(Lobby lobby)
    {
        var nextOwner = lobby.Players
            .Where(p => p.ConnectionStatus != PlayerConnectionStatus.Removed)
            .OrderBy(p => p.JoinOrder)
            .FirstOrDefault();
        
        if (nextOwner != null)
        {
            lobby.OwnerId = nextOwner.UserId;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Ownership of lobby {LobbyId} transferred to user {UserId}", lobby.Id, nextOwner.UserId);
            
            // Broadcast ownership change
            var lobbyDetail = await GetLobbyDetailAsync(lobby.Id);
            await _hubContext.Clients.Group($"lobby_{lobby.Id}").SendAsync("LobbyUpdated", lobbyDetail);
        }
    }

    public async Task<List<LobbyDto>> GetAvailableLobbiesAsync()
    {
        return await _context.Lobbies
            .Where(l => l.Status == LobbyStatus.Waiting)
            .Include(l => l.Owner)
            .Include(l => l.Players)
            .Select(l => new LobbyDto(
                l.Id,
                l.Name,
                l.OwnerId,
                l.Owner.Username,
                l.MaxPlayers,
                l.NumberOfRounds,
                l.RoundTimeSeconds,
                l.Status,
                l.Players.Count,
                l.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<LobbyDetailDto> GetLobbyAsync(int lobbyId)
    {
        return await GetLobbyDetailAsync(lobbyId);
    }

    private async Task<LobbyDetailDto> GetLobbyDetailAsync(int lobbyId)
    {
        var lobby = await _context.Lobbies
            .Include(l => l.Owner)
            .Include(l => l.Players)
            .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(l => l.Id == lobbyId);

        if (lobby == null)
            throw new NotFoundException("Lobby not found");

        var lobbyDto = new LobbyDto(
            lobby.Id,
            lobby.Name,
            lobby.OwnerId,
            lobby.Owner.Username,
            lobby.MaxPlayers,
            lobby.NumberOfRounds,
            lobby.RoundTimeSeconds,
            lobby.Status,
            lobby.Players.Count,
            lobby.CreatedAt
        );

        var playerDtos = lobby.Players
            .Select(p => new LobbyPlayerDto(
                p.UserId,
                p.User.Username,
                p.JoinOrder,
                p.ConnectionStatus,
                p.UserId == lobby.OwnerId
            ))
            .OrderBy(p => p.JoinOrder)
            .ToList();

        return new LobbyDetailDto(lobbyDto, playerDtos);
    }

    public async Task HandleDisconnectAsync(int userId, string connectionId)
    {
        await _connectionService.DisconnectUserAsync(userId, connectionId);

        var player = await _context.LobbyPlayers
            .Include(lp => lp.Lobby)
            .FirstOrDefaultAsync(lp => lp.UserId == userId && lp.ConnectionStatus == PlayerConnectionStatus.Connected);

        if (player != null)
        {
            player.ConnectionStatus = PlayerConnectionStatus.Disconnected;
            player.DisconnectedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} disconnected from lobby {LobbyId}", userId, player.LobbyId);
        }
    }

    public async Task HandleReconnectAsync(int userId, string connectionId)
    {
        await _connectionService.ConnectUserAsync(userId, connectionId);

        var player = await _context.LobbyPlayers
            .FirstOrDefaultAsync(lp => lp.UserId == userId && lp.ConnectionStatus == PlayerConnectionStatus.Disconnected);

        if (player != null)
        {
            player.ConnectionStatus = PlayerConnectionStatus.Connected;
            player.LastConnectedAt = DateTime.UtcNow;
            player.DisconnectedAt = null;
            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} reconnected to lobby {LobbyId}", userId, player.LobbyId);
        }
    }

    public async Task CleanupInactiveLobbiesAsync()
    {
        var inactiveLobbies = await _context.Lobbies
            .Include(l => l.Players)
            .Where(l => l.Status == LobbyStatus.Waiting &&
                        l.CreatedAt < DateTime.UtcNow.AddHours(-2))
            .ToListAsync();

        foreach (var lobby in inactiveLobbies)
        {
            _context.Lobbies.Remove(lobby);
            _logger.LogInformation("Cleanup: Removed inactive lobby {LobbyId}", lobby.Id);
        }

        await _context.SaveChangesAsync();
    }

    public async Task CleanupDisconnectedPlayersAsync()
    {
        var timeout = TimeSpan.FromMinutes(DisconnectTimeoutMinutes);
        var cutoffTime = DateTime.UtcNow - timeout;
        
        var disconnectedPlayers = await _context.LobbyPlayers
            .Include(lp => lp.Lobby)
            .Where(lp => lp.ConnectionStatus == PlayerConnectionStatus.Disconnected &&
                        lp.DisconnectedAt.HasValue &&
                        lp.DisconnectedAt.Value < cutoffTime)
            .ToListAsync();
        
        foreach (var player in disconnectedPlayers)
        {
            await LeaveLobbyAsync(player.UserId, player.LobbyId);
            _logger.LogInformation("Cleanup: Removed timed-out player {UserId} from lobby {LobbyId}", player.UserId, player.LobbyId);
        }
    }
}
