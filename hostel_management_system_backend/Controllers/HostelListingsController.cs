using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class HostelListingsController : ControllerBase
{
    private readonly IHostelListingsService _service;

    public HostelListingsController(IHostelListingsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<HostelListingReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var listings = await _service.GetAllAsync(cancellationToken);
        return Ok(listings);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HostelListingReadDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var listing = await _service.GetByIdAsync(id, cancellationToken);
        return listing is null ? NotFound() : Ok(listing);
    }

    [HttpPost]
    public async Task<ActionResult<HostelListingReadDto>> Create([FromBody] HostelListingCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HostelListingReadDto>> Update(Guid id, [FromBody] HostelListingUpdateDto dto, CancellationToken cancellationToken)
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
