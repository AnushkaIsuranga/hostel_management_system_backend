using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class AmenitiesController : ControllerBase
{
    private readonly IAmenitiesService _service;

    public AmenitiesController(IAmenitiesService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<AmenityReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var amenities = await _service.GetAllAsync(cancellationToken);
        return Ok(amenities);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AmenityReadDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var amenity = await _service.GetByIdAsync(id, cancellationToken);
        return amenity is null ? NotFound() : Ok(amenity);
    }

    [HttpPost]
    public async Task<ActionResult<AmenityReadDto>> Create([FromBody] AmenityCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AmenityReadDto>> Update(Guid id, [FromBody] AmenityUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _service.UpdateAsync(id, dto, cancellationToken);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _service.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
