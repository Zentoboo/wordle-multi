using System.ComponentModel.DataAnnotations;

namespace AuthApi.Models;

public class LobbyPlayer
{
    public int Id { get; set; }
    
    [Required]
    public int LobbyId { get; set; }
    public Lobby Lobby { get; set; } = null!;
    
    [Required]
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    [Required]
    public int JoinOrder { get; set; }
    
    public PlayerConnectionStatus ConnectionStatus { get; set; } = PlayerConnectionStatus.Connected;
    
    public DateTime? LastConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DisconnectedAt { get; set; }
    
    public int TotalScore { get; set; } = 0;
    public int RoundsWon { get; set; } = 0;
}

public enum PlayerConnectionStatus
{
    Connected,
    Disconnected,
    Removed
}
