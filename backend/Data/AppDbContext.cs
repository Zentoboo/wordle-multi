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
            .HasIndex(lp => lp.UserId)
            .IsUnique()
            .HasFilter("ConnectionStatus <> 2");
    }
}
