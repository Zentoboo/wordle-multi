using AuthApi.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AuthApi.Services;

public class TokenCleanupService : BackgroundService
{
    private readonly ILogger<TokenCleanupService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(12);

    public TokenCleanupService(
        ILogger<TokenCleanupService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Token Cleanup Service is starting.");

        // Run once at startup
        await PerformCleanupAsync();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_cleanupInterval, stoppingToken);
                await PerformCleanupAsync();
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Token Cleanup Service is stopping.");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during token cleanup. Next cleanup in {Hours} hours.", _cleanupInterval.TotalHours);
            }
        }
    }

    private async Task PerformCleanupAsync()
    {
        _logger.LogInformation("Starting scheduled token cleanup");
        
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var refreshTokenService = scope.ServiceProvider.GetRequiredService<IRefreshTokenService>();
            
            await refreshTokenService.CleanupExpiredTokensAsync();
            
            _logger.LogInformation("Scheduled token cleanup completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to perform scheduled token cleanup");
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Token Cleanup Service is stopping.");
        await base.StopAsync(cancellationToken);
    }
}