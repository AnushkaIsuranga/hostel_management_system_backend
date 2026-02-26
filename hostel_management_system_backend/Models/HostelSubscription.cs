public class HostelSubscription : BaseModel
{
    public Guid HostelId { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime ExpiryDate { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime? LastReminderSentAt { get; set; }

    public Hostel Hostel { get; set; } = null!;
}
