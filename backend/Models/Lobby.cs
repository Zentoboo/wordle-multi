using System.ComponentModel.DataAnnotations;

namespace AuthApi.Models;

public class Lobby
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public int OwnerId { get; set; }
    public User Owner { get; set; } = null!;
    
    [Required]
    [Range(2, 8)]
    public int MaxPlayers { get; set; } = 2;
    
    [Required]
    [Range(1, 20)]
    public int NumberOfRounds { get; set; } = 1;
    
    [Required]
    [Range(15, 300)]
    public int RoundTimeSeconds { get; set; } = 90;
    
    [Required]
    public LobbyStatus Status { get; set; } = LobbyStatus.Waiting;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<LobbyPlayer> Players { get; set; } = new List<LobbyPlayer>();
}

public enum LobbyStatus
{
    Waiting,
    InGame,
    Finished,
    Abandoned
}
