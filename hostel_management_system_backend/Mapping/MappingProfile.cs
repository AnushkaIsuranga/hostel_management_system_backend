using AutoMapper;

public sealed class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User
        CreateMap<User, UserReadDto>();
        CreateMap<UserCreateDto, User>();
        CreateMap<UserUpdateDto, User>();

        // Hostel
        CreateMap<Hostel, HostelReadDto>();
        CreateMap<HostelCreateDto, Hostel>();
        CreateMap<HostelUpdateDto, Hostel>();

        // Room
        CreateMap<Room, RoomReadDto>();
        CreateMap<RoomCreateDto, Room>();
        CreateMap<RoomUpdateDto, Room>();

        // Amenity
        CreateMap<Amenity, AmenityReadDto>();
        CreateMap<AmenityCreateDto, Amenity>();
        CreateMap<AmenityUpdateDto, Amenity>();

        // HostelListing
        CreateMap<HostelListing, HostelListingReadDto>();
        CreateMap<HostelListingCreateDto, HostelListing>();
        CreateMap<HostelListingUpdateDto, HostelListing>();

        // InteractionEvent
        CreateMap<InteractionEvent, InteractionEventReadDto>();
        CreateMap<InteractionEventCreateDto, InteractionEvent>();
        CreateMap<InteractionEventUpdateDto, InteractionEvent>();

        // HostelAmenity
        CreateMap<HostelAmenity, HostelAmenityReadDto>();
        CreateMap<HostelAmenityCreateDto, HostelAmenity>();

        // HostelReview
        CreateMap<HostelReview, HostelReviewReadDto>()
            .ForCtorParam("UserFullName", opt => opt.MapFrom(src => src.User.FullName));
        CreateMap<HostelReviewCreateDto, HostelReview>();
        CreateMap<HostelReviewUpdateDto, HostelReview>();
    }
}
