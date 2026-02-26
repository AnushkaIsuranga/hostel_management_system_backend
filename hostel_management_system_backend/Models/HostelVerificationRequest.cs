public class HostelVerificationRequest : BaseModel
{
    public Guid HostelId { get; set; }

    public Guid RequestedByUserId { get; set; }

    public HostelVerificationStatus Status { get; set; } = HostelVerificationStatus.Pending;

    public string? AdminNotes { get; set; }

    public Guid? ReviewedByAdminId { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public Hostel Hostel { get; set; } = null!;
}
