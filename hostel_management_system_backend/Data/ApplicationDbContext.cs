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
    public DbSet<HostelReview> HostelReviews => Set<HostelReview>();
    public DbSet<HostelImage> HostelImages => Set<HostelImage>();
    public DbSet<HostelVerificationRequest> HostelVerificationRequests => Set<HostelVerificationRequest>();
    public DbSet<HostelSubscription> HostelSubscriptions => Set<HostelSubscription>();
    public DbSet<University> Universities => Set<University>();
    public DbSet<StudentPreference> StudentPreferences => Set<StudentPreference>();

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
        modelBuilder.Entity<HostelReview>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<HostelImage>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<HostelVerificationRequest>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<HostelSubscription>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<University>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<StudentPreference>().HasQueryFilter(e => !e.IsDeleted);

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

            entity.Property(h => h.OwnerId)
                .IsRequired();

            entity.Property(h => h.VerificationStatus)
                .IsRequired();

            entity.Property(h => h.IsVerified)
                .IsRequired();

            entity.Property(h => h.City)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(h => h.GoogleMapsUrl)
                .HasColumnName("LocationUrl")
                .HasMaxLength(500)
                .IsRequired(false);

            entity.Property(h => h.Latitude)
                .IsRequired();

            entity.Property(h => h.Longitude)
                .IsRequired();

            entity.Property(h => h.MinPrice)
                .HasPrecision(18, 2);

            entity.Property(h => h.MaxPrice)
                .HasPrecision(18, 2);

            entity.HasIndex(h => h.City);
            entity.HasIndex(h => h.Status);
            entity.HasIndex(h => h.OwnerId);
            entity.HasIndex(h => h.VerificationStatus);
            entity.HasIndex(h => new { h.Latitude, h.Longitude });

            entity.HasOne(h => h.Owner)
                .WithMany(u => u.OwnedHostels)
                .HasForeignKey(h => h.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(h => h.VerifiedByAdminId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // --------------------------------------------------
        // University
        // --------------------------------------------------
        modelBuilder.Entity<University>(entity =>
        {
            entity.Property(u => u.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(u => u.Latitude)
                .IsRequired();

            entity.Property(u => u.Longitude)
                .IsRequired();

            entity.HasIndex(u => u.Name)
                .IsUnique();
        });

        // --------------------------------------------------
        // StudentPreference
        // --------------------------------------------------
        modelBuilder.Entity<StudentPreference>(entity =>
        {
            entity.Property(p => p.MinBudget)
                .HasPrecision(18, 2);

            entity.Property(p => p.MaxBudget)
                .HasPrecision(18, 2);

            entity.Property(p => p.SelectedAmenitiesJson)
                .HasMaxLength(4000)
                .IsRequired();

            entity.Property(p => p.PriorityOrderJson)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(p => p.PriceWeight)
                .IsRequired();

            entity.Property(p => p.DistanceWeight)
                .IsRequired();

            entity.Property(p => p.RatingWeight)
                .IsRequired();

            entity.HasIndex(p => p.UserId)
                .IsUnique();

            entity.HasIndex(p => p.UniversityId);

            entity.HasOne(p => p.User)
                .WithOne(u => u.StudentPreference)
                .HasForeignKey<StudentPreference>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.University)
                .WithMany()
                .HasForeignKey(p => p.UniversityId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --------------------------------------------------
        // HostelVerificationRequest
        // --------------------------------------------------
        modelBuilder.Entity<HostelVerificationRequest>(entity =>
        {
            entity.Property(v => v.Status)
                .IsRequired();

            entity.Property(v => v.AdminNotes)
                .HasMaxLength(1000);

            entity.HasIndex(v => v.HostelId);
            entity.HasIndex(v => v.Status);

            entity.HasOne(v => v.Hostel)
                .WithMany(h => h.VerificationRequests)
                .HasForeignKey(v => v.HostelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(v => v.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(v => v.ReviewedByAdminId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // --------------------------------------------------
        // HostelSubscription
        // --------------------------------------------------
        modelBuilder.Entity<HostelSubscription>(entity =>
        {
            entity.Property(s => s.StartDate)
                .IsRequired();

            entity.Property(s => s.ExpiryDate)
                .IsRequired();

            entity.Property(s => s.IsActive)
                .IsRequired();

            entity.HasIndex(s => s.HostelId)
                .IsUnique();

            entity.HasIndex(s => s.ExpiryDate);

            entity.HasOne(s => s.Hostel)
                .WithOne(h => h.Subscription)
                .HasForeignKey<HostelSubscription>(s => s.HostelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --------------------------------------------------
        // HostelImage
        // --------------------------------------------------
        modelBuilder.Entity<HostelImage>(entity =>
        {
            entity.Property(i => i.FileName)
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(i => i.ContentType)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(i => i.FileSize)
                .IsRequired();

            entity.Property(i => i.ImageUrl)
                .HasMaxLength(1000)
                .IsRequired();

            entity.Property(i => i.DisplayOrder)
                .IsRequired();

            entity.HasIndex(i => i.HostelId);
            entity.HasIndex(i => new { i.HostelId, i.DisplayOrder });

            entity.HasOne(i => i.Hostel)
                .WithMany(h => h.Images)
                .HasForeignKey(i => i.HostelId)
                .OnDelete(DeleteBehavior.Cascade);
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

        // --------------------------------------------------
        // HostelReview
        // --------------------------------------------------
        modelBuilder.Entity<HostelReview>(entity =>
        {
            entity.HasKey(r => r.Id);

            entity.Property(r => r.Rating)
                .IsRequired();

            entity.Property(r => r.Comment)
                .HasMaxLength(1000);

            entity.HasCheckConstraint(
                "CK_HostelReviews_Rating_Range",
                "[Rating] >= 1 AND [Rating] <= 5");

            entity.HasIndex(r => r.HostelId);
            entity.HasIndex(r => new { r.HostelId, r.UserId })
                .IsUnique();

            entity.HasOne(r => r.Hostel)
                .WithMany(h => h.Reviews)
                .HasForeignKey(r => r.HostelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.User)
                .WithMany(u => u.HostelReviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
