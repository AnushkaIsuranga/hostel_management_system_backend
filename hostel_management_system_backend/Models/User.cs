public class User : BaseModel
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    // Navigation
    public ICollection<HostelListing> Listings { get; set; } = new List<HostelListing>();
    public ICollection<InteractionEvent> InteractionEvents { get; set; } = new List<InteractionEvent>();
}
