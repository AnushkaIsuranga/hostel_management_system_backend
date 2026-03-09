using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public sealed class CleanupDeletedDataService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CleanupDeletedDataService> _logger;
    private readonly IConfiguration _configuration;

    public CleanupDeletedDataService(
        IServiceProvider serviceProvider,
        ILogger<CleanupDeletedDataService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var cleanupIntervalHours = _configuration.GetValue<int?>("DataCleanup:RunIntervalHours") ?? 24;
        var interval = TimeSpan.FromHours(Math.Max(1, cleanupIntervalHours));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupSoftDeletedHostelsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Cleanup deleted data run failed.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    private async Task CleanupSoftDeletedHostelsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var imageStorage = scope.ServiceProvider.GetRequiredService<IImageStorageService>();

        var retentionDays = _configuration.GetValue<int?>("DataCleanup:RetentionDays") ?? 60;
        var cutoff = DateTime.UtcNow.AddDays(-Math.Max(1, retentionDays));

        var hostels = await db.Hostels
            .IgnoreQueryFilters()
            .Where(h => h.IsDeleted && h.DeletedAt.HasValue && h.DeletedAt.Value <= cutoff)
            .Include(h => h.Images)
            .ToListAsync(cancellationToken);

        if (hostels.Count == 0)
        {
            return;
        }

        foreach (var hostel in hostels)
        {
            foreach (var image in hostel.Images)
            {
                if (!string.IsNullOrWhiteSpace(image.ImageUrl))
                {
                    await imageStorage.DeleteImageAsync(image.ImageUrl, cancellationToken);
                }
            }

            db.HostelImages.RemoveRange(hostel.Images);
            db.Hostels.Remove(hostel);
        }

        await db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Cleaned up {HostelCount} deleted hostels older than retention window.", hostels.Count);
    }
}
