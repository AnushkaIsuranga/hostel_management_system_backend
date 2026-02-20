public class HostelReview : BaseModel
{
    public Guid HostelId { get; set; }
    public Guid UserId { get; set; }

    public int Rating { get; set; }
    public string? Comment { get; set; }

    // Navigation
    public Hostel Hostel { get; set; } = null!;
    public User User { get; set; } = null!;
}
