using Microsoft.EntityFrameworkCore;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Core
    public DbSet<User> Users => Set<User>();
    public DbSet<Hostel> Hostels => Set<Hostel>();
    public DbSet<HostelListing> HostelListings => Set<HostelListing>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<InteractionEvent> InteractionEvents => Set<InteractionEvent>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Join tables
    public DbSet<HostelAmenity> HostelAmenities => Set<HostelAmenity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --------------------------------------------------
        // Global soft delete filter
        // --------------------------------------------------
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Hostel>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<HostelListing>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Room>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Amenity>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<InteractionEvent>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<RefreshToken>().HasQueryFilter(e => !e.User.IsDeleted);

        // --------------------------------------------------
        // User
        // --------------------------------------------------
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();

            entity.Property(u => u.FullName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(u => u.Email)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(u => u.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(u => u.PhoneNumber)
                .HasMaxLength(20);

            entity.Property(u => u.LastActivityAt)
                .IsRequired();
        });

        // --------------------------------------------------
        // RefreshToken
        // --------------------------------------------------
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.Property(r => r.TokenHash)
                .HasMaxLength(64)
                .IsRequired();

            entity.HasIndex(r => r.TokenHash)
                .IsUnique();

            entity.HasIndex(r => new { r.UserId, r.Revoked });

            entity.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --------------------------------------------------
        // Hostel
        // --------------------------------------------------
        modelBuilder.Entity<Hostel>(entity =>
        {
            entity.Property(h => h.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(h => h.City)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(h => h.LocationUrl)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(h => h.MinPrice)
                .HasPrecision(18, 2);

            entity.Property(h => h.MaxPrice)
                .HasPrecision(18, 2);

            entity.HasIndex(h => h.City);
            entity.HasIndex(h => h.Status);
        });

        // --------------------------------------------------
        // HostelListing
        // --------------------------------------------------
        modelBuilder.Entity<HostelListing>(entity =>
        {
            entity.HasOne(hl => hl.Hostel)
                .WithMany(h => h.Listings)
                .HasForeignKey(hl => hl.HostelId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(hl => hl.Owner)
                .WithMany(u => u.Listings)
                .HasForeignKey(hl => hl.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(hl => new { hl.HostelId, hl.OwnerUserId })
                .IsUnique();
        });

        // --------------------------------------------------
        // Room
        // --------------------------------------------------
        modelBuilder.Entity<Room>(entity =>
        {
            entity.Property(r => r.RoomType)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(r => r.Price)
                .HasPrecision(18, 2);

            entity.HasOne(r => r.Hostel)
                .WithMany(h => h.Rooms)
                .HasForeignKey(r => r.HostelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --------------------------------------------------
        // Amenity
        // --------------------------------------------------
        modelBuilder.Entity<Amenity>(entity =>
        {
            entity.Property(a => a.Name)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(a => a.Name).IsUnique();
        });

        // --------------------------------------------------
        // HostelAmenity (many-to-many)
        // --------------------------------------------------
        modelBuilder.Entity<HostelAmenity>(entity =>
        {
            entity.HasKey(ha => new { ha.HostelId, ha.AmenityId });

            entity.HasOne(ha => ha.Hostel)
                .WithMany(h => h.HostelAmenities)
                .HasForeignKey(ha => ha.HostelId);

            entity.HasOne(ha => ha.Amenity)
                .WithMany(a => a.HostelAmenities)
                .HasForeignKey(ha => ha.AmenityId);
        });

        // --------------------------------------------------
        // InteractionEvent
        // --------------------------------------------------
        modelBuilder.Entity<InteractionEvent>(entity =>
        {
            entity.Property(i => i.EventType)
                .IsRequired();

            entity.Property(i => i.SessionId)
                .HasMaxLength(100)
                .IsRequired();

            entity.HasIndex(i => i.UserId);
            entity.HasIndex(i => i.HostelId);
            entity.HasIndex(i => new { i.UserId, i.EventType });

            entity.HasOne(i => i.User)
                .WithMany(u => u.InteractionEvents)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(i => i.Hostel)
                .WithMany(h => h.InteractionEvents)
                .HasForeignKey(i => i.HostelId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
