public class HostelImage : BaseModel
{
    public Guid HostelId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public string ImageUrl { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }

    // Navigation
    public Hostel Hostel { get; set; } = null!;
}
