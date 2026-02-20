namespace hostel_management_system_backend.Exceptions;

public sealed class ConflictException : ApiException
{
    public ConflictException(string message, string? errorCode = null, Exception? innerException = null)
        : base(StatusCodes.Status409Conflict, message, errorCode, innerException)
    {
    }
}
