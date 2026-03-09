using System.Linq.Expressions;

public interface ICrudRepository<TEntity>
    where TEntity : BaseModel
{
    Task<List<TEntity>> GetAllAsNoTrackingAsync(CancellationToken cancellationToken);
    Task<TEntity?> GetByIdAsNoTrackingAsync(Guid id, CancellationToken cancellationToken);
    Task<TEntity?> GetByIdForUpdateAsync(Guid id, CancellationToken cancellationToken);
    Task<TEntity?> GetSingleForUpdateAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken);
    Task AddAsync(TEntity entity, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
