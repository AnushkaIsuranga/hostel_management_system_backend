namespace hostel_management_system_backend.Exceptions;

public sealed class BadRequestException : ApiException
{
    public BadRequestException(string message, string? errorCode = null, Exception? innerException = null)
        : base(StatusCodes.Status400BadRequest, message, errorCode, innerException)
    {
    }
}

