using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hostel-amenities")]
public sealed class HostelAmenitiesController : ControllerBase
{
    private readonly IHostelAmenitiesService _service;

    public HostelAmenitiesController(IHostelAmenitiesService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<HostelAmenityReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var links = await _service.GetAllAsync(cancellationToken);
        return Ok(links);
    }

    [HttpGet("{hostelId:guid}/{amenityId:guid}")]
    public async Task<ActionResult<HostelAmenityReadDto>> GetByKey(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
    {
        var link = await _service.GetByKeyAsync(hostelId, amenityId, cancellationToken);
        return link is null ? NotFound() : Ok(link);
    }

    [HttpPost]
    public async Task<ActionResult<HostelAmenityReadDto>> Create([FromBody] HostelAmenityCreateDto dto, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(dto, cancellationToken);
        if (!result.Created)
            return Conflict("Hostel amenity already exists.");

        return CreatedAtAction(nameof(GetByKey), new { hostelId = dto.HostelId, amenityId = dto.AmenityId }, result.Result);
    }

    [HttpPost("by-names")]
    public async Task<ActionResult<List<HostelAmenityReadDto>>> CreateByNames([FromBody] HostelAmenityBulkCreateDto dto, CancellationToken cancellationToken)
    {
        var links = await _service.CreateByNamesAsync(dto, cancellationToken);
        return Ok(links);
    }

    [HttpDelete("{hostelId:guid}/{amenityId:guid}")]
    public async Task<IActionResult> Delete(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(hostelId, amenityId, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
