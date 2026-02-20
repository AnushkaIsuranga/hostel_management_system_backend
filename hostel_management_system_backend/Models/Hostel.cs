public class Hostel : BaseModel
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public string City { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }

    public string GenderPolicy { get; set; } = string.Empty;

    public string LocationUrl { get; set; } = string.Empty;

    public HostelStatus Status { get; set; }

    // Navigation
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
    public ICollection<HostelListing> Listings { get; set; } = new List<HostelListing>();
    public ICollection<HostelAmenity> HostelAmenities { get; set; } = new List<HostelAmenity>();
    public ICollection<InteractionEvent> InteractionEvents { get; set; } = new List<InteractionEvent>();
    public ICollection<HostelReview> Reviews { get; set; } = new List<HostelReview>();
}
