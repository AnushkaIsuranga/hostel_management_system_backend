using Microsoft.EntityFrameworkCore;

public sealed class CrudRepository<TEntity> : ICrudRepository<TEntity>
    where TEntity : BaseModel
{
    private readonly ApplicationDbContext _db;
    private readonly DbSet<TEntity> _set;

    public CrudRepository(ApplicationDbContext db)
    {
        _db = db;
        _set = db.Set<TEntity>();
    }

    public Task<List<TEntity>> GetAllAsNoTrackingAsync(CancellationToken cancellationToken)
        => _set.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(cancellationToken);

    public Task<TEntity?> GetByIdAsNoTrackingAsync(Guid id, CancellationToken cancellationToken)
        => _set.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<TEntity?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken)
        => _set.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task AddAsync(TEntity entity, CancellationToken cancellationToken)
        => _set.AddAsync(entity, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
