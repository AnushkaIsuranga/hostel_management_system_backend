using System.IdentityModel.Tokens.Jwt;
using Microsoft.EntityFrameworkCore;

public sealed class ActivityTrackingMiddleware
{
    private readonly RequestDelegate _next;

    public ActivityTrackingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (Guid.TryParse(userIdClaim, out var userId))
            {
                var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
                if (user is not null)
                {
                    user.LastActivityAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        await _next(context);
    }
}
