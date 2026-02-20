using System.Text.Json;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

public sealed class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ApiException ex)
        {
            await WriteProblemDetailsAsync(context, ex.StatusCode, ex.Message, ex.ErrorCode);
        }
        catch (DbUpdateException ex)
        {
            _logger.LogWarning(ex, "Database update failed.");
            await WriteProblemDetailsAsync(
                context,
                StatusCodes.Status409Conflict,
                "A database constraint was violated.",
                "db_update_conflict");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception.");
            await WriteProblemDetailsAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.",
                "server_error");
        }
    }

    private static async Task WriteProblemDetailsAsync(HttpContext context, int statusCode, string detail, string? errorCode)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = ReasonPhrases.GetReasonPhrase(statusCode),
            Detail = detail,
            Instance = context.Request.Path
        };

        if (!string.IsNullOrWhiteSpace(errorCode))
        {
            problem.Extensions["errorCode"] = errorCode;
        }

        await context.Response.WriteAsync(JsonSerializer.Serialize(problem, JsonOptions));
    }
}
