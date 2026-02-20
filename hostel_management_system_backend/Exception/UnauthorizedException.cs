namespace hostel_management_system_backend.Exceptions;

public sealed class UnauthorizedException : ApiException
{
    public UnauthorizedException(string message, string? errorCode = null, Exception? innerException = null)
        : base(StatusCodes.Status401Unauthorized, message, errorCode, innerException)
    {
    }
}
