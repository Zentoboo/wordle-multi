using System.ComponentModel.DataAnnotations;
using AuthApi.Models;

namespace Multiplayer.DTOs;

public record LobbyDto(
    int Id,
    string Name,
    int OwnerId,
    string OwnerUsername,
    int MaxPlayers,
    int NumberOfRounds,
    int RoundTimeSeconds,
    LobbyStatus Status,
    int PlayerCount,
    DateTime CreatedAt
);

public record LobbyDetailDto(
    LobbyDto Lobby,
    List<LobbyPlayerDto> Players
);

public record LobbyPlayerDto(
    int UserId,
    string Username,
    int JoinOrder,
    PlayerConnectionStatus ConnectionStatus,
    bool IsOwner
);

public record CreateLobbyDto(
    [Required]
    [MinLength(3)]
    [MaxLength(50)]
    string Name,

    [Range(2, 8)]
    int MaxPlayers = 2,

    [Range(1, 20)]
    int NumberOfRounds = 1,

    [Range(15, 300)]
    int RoundTimeSeconds = 90
);

public record JoinLobbyDto(int LobbyId);

public record LeaveLobbyDto();
