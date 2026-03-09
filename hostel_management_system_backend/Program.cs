using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;
using Isopoh.Cryptography.Argon2;

Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCors", policy =>
    {
        var allowedOrigins = ResolveAllowedOrigins(builder.Configuration);

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        }
        else
        {
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});
builder.Services.AddAutoMapper(typeof(MappingProfile));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Hostel API", Version = "v1" });
});

var defaultConnection = GetRequiredConfigurationValue(builder.Configuration, "ConnectionStrings:DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(defaultConnection));
builder.Services.AddHttpClient("GoogleMapsResolver", client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("HostelManagementSystem/1.0");
});
builder.Services.AddHttpContextAccessor();

// Repositories
builder.Services.AddScoped(typeof(ICrudRepository<>), typeof(CrudRepository<>));
builder.Services.AddScoped<IHostelAmenityRepository, HostelAmenityRepository>();
builder.Services.AddScoped<IHostelRepository, HostelRepository>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IHostelReviewsRepository, HostelReviewsRepository>();
builder.Services.AddScoped<IHostelVerificationRepository, HostelVerificationRepository>();
builder.Services.AddScoped<IHostelSubscriptionRepository, HostelSubscriptionRepository>();
builder.Services.AddScoped<IHostelImageRepository, HostelImageRepository>();

// Services
builder.Services.AddScoped<IUsersService, UsersService>();
builder.Services.AddScoped<IHostelsService, HostelsService>();
builder.Services.AddScoped<IRoomsService, RoomsService>();
builder.Services.AddScoped<IAmenitiesService, AmenitiesService>();
builder.Services.AddScoped<IHostelListingsService, HostelListingsService>();
builder.Services.AddScoped<IInteractionEventsService, InteractionEventsService>();
builder.Services.AddScoped<IHostelAmenitiesService, HostelAmenitiesService>();
builder.Services.AddScoped<IHostelReviewsService, HostelReviewsService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHostelVerificationService, HostelVerificationService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IHostelImagesService, HostelImagesService>();
builder.Services.AddScoped<IUniversitiesService, UniversitiesService>();
builder.Services.AddScoped<IStudentPreferencesService, StudentPreferencesService>();
builder.Services.AddScoped<IImageStorageService, LocalImageStorageService>();
builder.Services.AddScoped<JwtService>();
builder.Services.AddHostedService<SubscriptionMonitorService>();
builder.Services.AddHostedService<CleanupDeletedDataService>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = GetRequiredConfigurationValue(builder.Configuration, "JwtSettings:Secret");
var jwtIssuer = GetRequiredConfigurationValue(builder.Configuration, "JwtSettings:Issuer");
var jwtAudience = GetRequiredConfigurationValue(builder.Configuration, "JwtSettings:Audience");
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,

        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        RequireExpirationTime = true
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

await SeedDefaultAdminAsync(app);
await SeedDefaultUniversitiesAsync(app);

// For debugging, enable swagger in Development (or remove the if-check while troubleshooting)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hostel API v1");
        c.RoutePrefix = "swagger"; // default: swagger is at /swagger; set to string.Empty to serve at root
    });
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseCors("DefaultCors");
app.UseAuthentication();
app.UseMiddleware<ActivityTrackingMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.Run();

static async Task SeedDefaultAdminAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    var hasAnyUsers = await dbContext.Users.AnyAsync();
    if (hasAnyUsers)
    {
        return;
    }

    var adminSection = app.Configuration.GetSection("AdminCredentials");
    var fullName = GetRequiredConfigurationValue(app.Configuration, "AdminCredentials:FullName");
    var email = GetRequiredConfigurationValue(app.Configuration, "AdminCredentials:Email");
    var password = GetRequiredConfigurationValue(app.Configuration, "AdminCredentials:Password");

    var adminUser = new User
    {
        FullName = fullName,
        Email = email,
        PasswordHash = Argon2.Hash(password),
        PhoneNumber = string.Empty,
        Role = UserRole.Admin,
        LastActivityAt = DateTime.UtcNow,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = null,
        IsDeleted = false
    };

    dbContext.Users.Add(adminUser);
    await dbContext.SaveChangesAsync();
}

static string[] ResolveAllowedOrigins(IConfiguration configuration)
{
    var envOriginsRaw = configuration["Cors__AllowedOrigins"];
    if (!string.IsNullOrWhiteSpace(envOriginsRaw))
    {
        var envOrigins = envOriginsRaw
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(origin => !string.Equals(origin, "SET_VIA_ENV", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (envOrigins.Length > 0)
        {
            return envOrigins;
        }
    }

    var configuredOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
    return configuredOrigins
        .Where(origin => !string.IsNullOrWhiteSpace(origin))
        .Where(origin => !string.Equals(origin, "SET_VIA_ENV", StringComparison.OrdinalIgnoreCase))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

static async Task SeedDefaultUniversitiesAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    if (await dbContext.Universities.AnyAsync())
    {
        return;
    }

    await dbContext.SaveChangesAsync();
}

static string GetRequiredConfigurationValue(IConfiguration configuration, string key)
{
    var value = configuration[key];
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException($"Missing required configuration value: {key}");
    }

    if (string.Equals(value, "SET_VIA_ENV", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException($"Configuration value {key} must be provided via environment variables.");
    }

    return value;
}
