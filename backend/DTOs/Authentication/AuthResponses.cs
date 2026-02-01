namespace AuthApi.DTOs.Authentication;

public record AuthenticationResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt,
    UserResponse User
);

public record UserResponse(
    int Id,
    string Username,
    string Email
);

public record RefreshTokenRequest(
    string RefreshToken
);