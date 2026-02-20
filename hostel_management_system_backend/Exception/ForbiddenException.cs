namespace hostel_management_system_backend.Exceptions;

public sealed class ForbiddenException : ApiException
{
    public ForbiddenException(string message, string? errorCode = null, Exception? innerException = null)
        : base(StatusCodes.Status403Forbidden, message, errorCode, innerException)
    {
    }
}
