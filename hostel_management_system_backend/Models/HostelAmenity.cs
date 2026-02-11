public class HostelAmenity
{
    public Guid HostelId { get; set; }
    public Hostel Hostel { get; set; } = null!;

    public Guid AmenityId { get; set; }
    public Amenity Amenity { get; set; } = null!;
}