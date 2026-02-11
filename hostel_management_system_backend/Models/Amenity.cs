public class Amenity : BaseModel
{
    public string Name { get; set; } = string.Empty;

    public ICollection<HostelAmenity> HostelAmenities { get; set; } = new List<HostelAmenity>();
}
