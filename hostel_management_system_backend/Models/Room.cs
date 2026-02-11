public class Room : BaseModel
{
    public Guid HostelId { get; set; }

    public string RoomType { get; set; } = string.Empty; // Single, Shared, etc.
    public decimal Price { get; set; }
    public int Capacity { get; set; }

    public bool IsAvailable { get; set; }

    // Navigation
    public Hostel Hostel { get; set; } = null!;
}
