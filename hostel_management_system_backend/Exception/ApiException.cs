namespace hostel_management_system_backend.Exceptions;

public abstract class ApiException : Exception
{
    protected ApiException(int statusCode, string message, string? errorCode = null, Exception? innerException = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }

    public int StatusCode { get; }
    public string? ErrorCode { get; }
}
