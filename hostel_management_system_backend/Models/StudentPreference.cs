public sealed class StudentPreference : BaseModel
{
    public Guid UserId { get; set; }
    public Guid UniversityId { get; set; }

    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public int? RequiredCapacity { get; set; }

    // JSON array of amenity names selected by the student.
    public string SelectedAmenitiesJson { get; set; } = "[]";

    // JSON array of keys in rank order: ["price", "distance", "rating"].
    public string PriorityOrderJson { get; set; } = "[]";

    public double PriceWeight { get; set; }
    public double DistanceWeight { get; set; }
    public double RatingWeight { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public University University { get; set; } = null!;
}
