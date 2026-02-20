using System.Security.Cryptography;
using System.Text;

public static class RefreshTokenHasher
{
    public static string Hash(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new ArgumentException("Refresh token cannot be null or empty.", nameof(refreshToken));
        }

        byte[] tokenBytes;
        try
        {
            tokenBytes = Convert.FromBase64String(refreshToken);
        }
        catch (FormatException)
        {
            tokenBytes = Encoding.UTF8.GetBytes(refreshToken);
        }

        var hashBytes = SHA256.HashData(tokenBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}