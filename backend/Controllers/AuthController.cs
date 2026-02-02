using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthApi.Data;
using AuthApi.Models;
using AuthApi.Services;
using AuthApi.DTOs.Authentication;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace backend.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext context, TokenService tokenService, IRefreshTokenService refreshTokenService, ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _refreshTokenService = refreshTokenService;
        _logger = logger;
    }

    // ---------------- REGISTER ----------------
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        _logger.LogInformation("Registration attempt for username: {Username}", dto.Username);

        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
        {
            _logger.LogWarning("Registration failed - username already exists: {Username}", dto.Username);
            return BadRequest("This username is already taken. Please choose a different username.");
        }

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            _logger.LogWarning("Registration failed - email already exists: {Email}", dto.Email);
            return BadRequest("This email address is already registered. Please use a different email or try logging in.");
        }

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            EmailVerified = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User registered successfully: {UserId} with username: {Username}", user.Id, user.Username);

        // Generate tokens for automatic login after registration
        var accessToken = _tokenService.CreateAccessToken(user);
        var refreshTokenString = _tokenService.CreateRefreshToken();
        var refreshToken = await _refreshTokenService.CreateRefreshTokenAsync(user, refreshTokenString, dto.RememberMe);

        var response = new AuthenticationResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken.Token,
            AccessTokenExpiresAt: DateTime.UtcNow.AddHours(4),
            RefreshTokenExpiresAt: refreshToken.ExpiresAt,
            User: new UserResponse(user.Id, user.Username, user.Email)
        );

        _logger.LogInformation("Tokens generated for new user: {UserId}", user.Id);

        return Ok(response);
    }

    // ---------------- LOGIN ----------------
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        _logger.LogInformation("Login attempt for username: {Username}", dto.Username);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null)
        {
            _logger.LogWarning("Login failed - user not found: {Username}", dto.Username);
            return Unauthorized("Invalid username or password. Please check your credentials and try again.");
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed - invalid password for username: {Username}", dto.Username);
            return Unauthorized("Invalid username or password. Please check your credentials and try again.");
        }

        var accessToken = _tokenService.CreateAccessToken(user);
        var refreshTokenString = _tokenService.CreateRefreshToken();
        var refreshToken = await _refreshTokenService.CreateRefreshTokenAsync(user, refreshTokenString, dto.RememberMe);

        var response = new AuthenticationResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken.Token,
            AccessTokenExpiresAt: DateTime.UtcNow.AddHours(4),
            RefreshTokenExpiresAt: refreshToken.ExpiresAt,
            User: new UserResponse(user.Id, user.Username, user.Email)
        );

        _logger.LogInformation("User logged in successfully: {UserId} with username: {Username}", user.Id, user.Username);

        return Ok(response);
    }

    // ---------------- REFRESH TOKEN ----------------
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        _logger.LogInformation("Token refresh attempt");

        var storedRefreshToken = await _refreshTokenService.GetRefreshTokenAsync(request.RefreshToken);
        
        if (storedRefreshToken == null || 
            storedRefreshToken.IsUsed || 
            storedRefreshToken.IsRevoked || 
            storedRefreshToken.ExpiresAt < DateTime.UtcNow)
        {
            _logger.LogWarning("Token refresh failed - invalid refresh token");
            return Unauthorized("Your session has expired or is invalid. Please log in again.");
        }

        // Get user from refresh token
        var user = await _context.Users.FindAsync(storedRefreshToken.UserId);
        if (user == null)
        {
            _logger.LogWarning("Token refresh failed - user not found for refresh token");
            return Unauthorized("Unable to verify your account. Please log in again.");
        }

        // Create new tokens
        var accessToken = _tokenService.CreateAccessToken(user);
        var newRefreshTokenString = _tokenService.CreateRefreshToken();
        var newRefreshToken = await _refreshTokenService.CreateRefreshTokenAsync(user, newRefreshTokenString);

        // Mark old refresh token as used and replaced by new one
        await _refreshTokenService.RevokeRefreshTokenAsync(storedRefreshToken, newRefreshTokenString);

        var response = new AuthenticationResponse(
            AccessToken: accessToken,
            RefreshToken: newRefreshToken.Token,
            AccessTokenExpiresAt: DateTime.UtcNow.AddHours(4),
            RefreshTokenExpiresAt: newRefreshToken.ExpiresAt,
            User: new UserResponse(user.Id, user.Username, user.Email)
        );

        _logger.LogInformation("Token refreshed successfully for user: {UserId}", user.Id);

        return Ok(response);
    }

    // ---------------- REVOKE TOKEN ----------------
    [HttpPost("revoke")]
    public async Task<IActionResult> RevokeToken([FromBody] RefreshTokenRequest request)
    {
        _logger.LogInformation("Token revocation attempt");

        var refreshToken = await _refreshTokenService.GetRefreshTokenAsync(request.RefreshToken);
        
        if (refreshToken == null)
        {
            _logger.LogWarning("Token revocation failed - refresh token not found");
            return NotFound("Session not found. The token may have already expired or been revoked.");
        }

        await _refreshTokenService.RevokeRefreshTokenAsync(refreshToken);
        
        _logger.LogInformation("Token revoked successfully for user: {UserId}", refreshToken.UserId);

        return Ok("Your session has been successfully revoked on all devices.");
    }

    // ---------------- GET CURRENT USER ----------------
    [HttpGet("me")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized("Authentication error. Please log in again.");

        var userId = int.Parse(userIdClaim.Value);
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
            return NotFound("Account not found. Please log in again.");

        var userResponse = new UserResponse(user.Id, user.Username, user.Email);
        return Ok(userResponse);
    }
}

// ---------------- DTOs ----------------
public record RegisterDto(
    [Required(ErrorMessage = "Username is required")]
    [MinLength(3, ErrorMessage = "Username must be at least 3 characters long")]
    [MaxLength(50, ErrorMessage = "Username cannot exceed 50 characters")]
    string Username,
    
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address")]
    [MaxLength(255, ErrorMessage = "Email cannot exceed 255 characters")]
    string Email,
    
    [Required(ErrorMessage = "Password is required")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$", 
        ErrorMessage = "Password must contain at least 8 characters with uppercase, lowercase, number, and special character")]
    string Password,
    
    bool RememberMe = false
);

public record LoginDto(
    [Required(ErrorMessage = "Username is required")]
    string Username,
    
    [Required(ErrorMessage = "Password is required")]
    string Password,
    
    bool RememberMe = false
);