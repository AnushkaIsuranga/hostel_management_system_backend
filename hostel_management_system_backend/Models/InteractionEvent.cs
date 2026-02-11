public class InteractionEvent : BaseModel
{
    public Guid? UserId { get; set; }
    public Guid? HostelId { get; set; }

    public InteractionType EventType { get; set; }

    public string? EventData { get; set; }  // JSON (search query, filters, etc.)

    public string SessionId { get; set; } = string.Empty;

    // Navigation
    public User? User { get; set; }
    public Hostel? Hostel { get; set; }
}