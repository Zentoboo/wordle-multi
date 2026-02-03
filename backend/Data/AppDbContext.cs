using AuthApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Lobby> Lobbies => Set<Lobby>();
    public DbSet<LobbyPlayer> LobbyPlayers => Set<LobbyPlayer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<LobbyPlayer>()
            .HasOne(lp => lp.Lobby)
            .WithMany(l => l.Players)
            .HasForeignKey(lp => lp.LobbyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LobbyPlayer>()
            .HasOne(lp => lp.User)
            .WithMany()
            .HasForeignKey(lp => lp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LobbyPlayer>()
            .HasIndex(lp => new { lp.UserId, lp.ConnectionStatus })
            .IsUnique()
            .HasFilter("ConnectionStatus = 0");

        modelBuilder.Entity<LobbyPlayer>()
            .HasIndex(lp => new { lp.LobbyId, lp.UserId })
            .IsUnique();
    }
}
