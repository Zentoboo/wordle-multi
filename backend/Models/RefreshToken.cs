using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthApi.Models;

public class RefreshToken
{
    public int Id { get; set; }

    [Required]
    [ForeignKey("User")]
    public int UserId { get; set; }
    
    [Required]
    [StringLength(1000)]
    public string Token { get; set; } = string.Empty;

    [Required]
    public DateTime ExpiresAt { get; set; }

    [Required]
    public bool IsUsed { get; set; } = false;

    [Required]
    public bool IsRevoked { get; set; } = false;

    [Required]
    public DateTime CreatedAt { get; set; }

    [StringLength(1000)]
    public string? ReplacedByToken { get; set; }

    // Navigation property
    public User User { get; set; } = null!;
}