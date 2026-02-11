using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class HostelsController : ControllerBase
{
    private readonly IHostelsService _service;

    public HostelsController(IHostelsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<HostelReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var hostels = await _service.GetAllAsync(cancellationToken);
        return Ok(hostels);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HostelReadDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var hostel = await _service.GetByIdAsync(id, cancellationToken);
        return hostel is null ? NotFound() : Ok(hostel);
    }

    [HttpPost]
    public async Task<ActionResult<HostelReadDto>> Create([FromBody] HostelCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HostelReadDto>> Update(Guid id, [FromBody] HostelUpdateDto dto, CancellationToken cancellationToken)
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
