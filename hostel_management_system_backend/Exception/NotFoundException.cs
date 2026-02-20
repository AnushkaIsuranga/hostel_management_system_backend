namespace hostel_management_system_backend.Exceptions;

public sealed class NotFoundException : ApiException
{
    public NotFoundException(string message, string? errorCode = null, Exception? innerException = null)
        : base(StatusCodes.Status404NotFound, message, errorCode, innerException)
    {
    }
}

