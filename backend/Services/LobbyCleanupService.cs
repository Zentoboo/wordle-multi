namespace AuthApi.Services;

public class LobbyCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<LobbyCleanupService> _logger;

    public LobbyCleanupService(IServiceProvider serviceProvider, ILogger<LobbyCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Lobby Cleanup Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var lobbyService = scope.ServiceProvider.GetRequiredService<ILobbyService>();

                await lobbyService.CleanupInactiveLobbiesAsync();
                await lobbyService.CleanupDisconnectedPlayersAsync();

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Lobby Cleanup Service");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
