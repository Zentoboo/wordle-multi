using AuthApi.Data;
using AuthApi.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthApi.Services;

public interface IRefreshTokenService
{
    Task<RefreshToken?> GetRefreshTokenAsync(string token);
    Task<RefreshToken> CreateRefreshTokenAsync(User user, string token, bool rememberMe = false);
    Task RevokeRefreshTokenAsync(RefreshToken refreshToken, string? newToken = null);
    Task RevokeAllUserRefreshTokensAsync(User user);
    Task CleanupExpiredTokensAsync();
    Task<bool> ValidateRefreshTokenAsync(RefreshToken refreshToken);
}

public class RefreshTokenService : IRefreshTokenService
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;
    private readonly ILogger<RefreshTokenService> _logger;

    public RefreshTokenService(AppDbContext context, TokenService tokenService, ILogger<RefreshTokenService> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
    {
        return await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token);
    }

    public async Task<RefreshToken> CreateRefreshTokenAsync(User user, string token, bool rememberMe = false)
    {
        // Revoke existing refresh tokens for this user
        await RevokeAllUserRefreshTokensAsync(user);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = _tokenService.GetRefreshTokenExpiration(rememberMe),
            CreatedAt = DateTime.UtcNow,
            IsUsed = false,
            IsRevoked = false
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return refreshToken;
    }

    public async Task RevokeRefreshTokenAsync(RefreshToken refreshToken, string? newToken = null)
    {
        refreshToken.IsRevoked = true;
        refreshToken.ReplacedByToken = newToken;
        
        _context.RefreshTokens.Update(refreshToken);
        await _context.SaveChangesAsync();
    }

    public async Task RevokeAllUserRefreshTokensAsync(User user)
    {
        var activeRefreshTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.IsRevoked && !rt.IsUsed && rt.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var token in activeRefreshTokens)
        {
            token.IsRevoked = true;
        }

        await _context.SaveChangesAsync();
    }

    public async Task CleanupExpiredTokensAsync()
    {
        _logger.LogInformation("Starting cleanup of expired refresh tokens");

        var expiredTokens = await _context.RefreshTokens
            .Where(rt => rt.ExpiresAt < DateTime.UtcNow || rt.IsRevoked || rt.IsUsed)
            .Where(rt => rt.CreatedAt < DateTime.UtcNow.AddDays(-30)) // Keep for 30 days for audit
            .ToListAsync();

        if (expiredTokens.Any())
        {
            _context.RefreshTokens.RemoveRange(expiredTokens);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleanup completed - removed {Count} expired refresh tokens", expiredTokens.Count);
        }
        else
        {
            _logger.LogInformation("Cleanup completed - no expired tokens found");
        }
    }

    public Task<bool> ValidateRefreshTokenAsync(RefreshToken refreshToken)
    {
        // Check if token exists and is not expired
        if (refreshToken == null || refreshToken.ExpiresAt < DateTime.UtcNow)
            return Task.FromResult(false);

        // Check if token is not used or revoked
        if (refreshToken.IsUsed || refreshToken.IsRevoked)
            return Task.FromResult(false);

        return Task.FromResult(true);
    }
}