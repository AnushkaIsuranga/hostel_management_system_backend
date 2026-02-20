public class User : BaseModel
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;

    public UserRole Role { get; set; }
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<HostelListing> Listings { get; set; } = new List<HostelListing>();
    public ICollection<InteractionEvent> InteractionEvents { get; set; } = new List<InteractionEvent>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
