using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class UniversitiesController : ControllerBase
{
    private readonly IUniversitiesService _service;

    public UniversitiesController(IUniversitiesService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<UniversityReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var universities = await _service.GetAllAsync(cancellationToken);
        return Ok(universities);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UniversityReadDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var university = await _service.GetByIdAsync(id, cancellationToken);
        return university is null ? NotFound() : Ok(university);
    }

    [HttpPost]
    public async Task<ActionResult<UniversityReadDto>> Create([FromBody] UniversityCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UniversityReadDto>> Update(Guid id, [FromBody] UniversityUpdateDto dto, CancellationToken cancellationToken)
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
