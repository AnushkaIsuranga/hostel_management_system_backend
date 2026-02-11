public class HostelListing : BaseModel
{
    public Guid HostelId { get; set; }
    public Guid OwnerUserId { get; set; }

    public ListingStatus Status { get; set; }

    // Navigation
    public Hostel Hostel { get; set; } = null!;
    public User Owner { get; set; } = null!;
}
