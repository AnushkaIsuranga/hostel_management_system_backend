using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class InteractionEventsController : ControllerBase
{
    private readonly IInteractionEventsService _service;

    public InteractionEventsController(IInteractionEventsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<InteractionEventReadDto>>> GetAll(CancellationToken cancellationToken)
    {
        var events = await _service.GetAllAsync(cancellationToken);
        return Ok(events);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InteractionEventReadDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _service.GetByIdAsync(id, cancellationToken);
        return evt is null ? NotFound() : Ok(evt);
    }

    [HttpPost]
    public async Task<ActionResult<InteractionEventReadDto>> Create([FromBody] InteractionEventCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _service.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<InteractionEventReadDto>> Update(Guid id, [FromBody] InteractionEventUpdateDto dto, CancellationToken cancellationToken)
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
