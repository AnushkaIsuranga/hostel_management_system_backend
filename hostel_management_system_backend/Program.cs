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
builder.Services.AddAutoMapper(typeof(MappingProfile));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Hostel API", Version = "v1" });
});
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Repositories
builder.Services.AddScoped(typeof(ICrudRepository<>), typeof(CrudRepository<>));
builder.Services.AddScoped<IHostelAmenityRepository, HostelAmenityRepository>();

// Services
builder.Services.AddScoped<IUsersService, UsersService>();
builder.Services.AddScoped<IHostelsService, HostelsService>();
builder.Services.AddScoped<IRoomsService, RoomsService>();
builder.Services.AddScoped<IAmenitiesService, AmenitiesService>();
builder.Services.AddScoped<IHostelListingsService, HostelListingsService>();
builder.Services.AddScoped<IInteractionEventsService, InteractionEventsService>();
builder.Services.AddScoped<IHostelAmenitiesService, HostelAmenitiesService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<JwtService>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.UTF8.GetBytes(jwtSettings["Secret"]!);

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

        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        RequireExpirationTime = true
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

await SeedDefaultAdminAsync(app);

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
    var fullName = adminSection["FullName"];
    var email = adminSection["Email"];
    var password = adminSection["Password"];

    fullName = string.IsNullOrWhiteSpace(fullName) ? "admin123" : fullName;
    email = string.IsNullOrWhiteSpace(email) ? "admin123@hostel.local" : email;
    password = string.IsNullOrWhiteSpace(password) ? "admin@World123" : password;

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
