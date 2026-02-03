using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Multiplayer.DTOs;
using AuthApi.Services;

namespace AuthApi.Controllers;

[ApiController]
[Route("api/multiplayer")]
[Authorize]
public class MultiplayerController : ControllerBase
{
    private readonly ILobbyService _lobbyService;
    private readonly ILogger<MultiplayerController> _logger;

    public MultiplayerController(ILobbyService lobbyService, ILogger<MultiplayerController> logger)
    {
        _lobbyService = lobbyService;
        _logger = logger;
    }

    private int CurrentUserId
    {
        get
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }
    }

    [HttpGet("lobbies")]
    public async Task<ActionResult<List<LobbyDto>>> GetAvailableLobbies()
    {
        try
        {
            var lobbies = await _lobbyService.GetAvailableLobbiesAsync();
            return Ok(lobbies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available lobbies");
            return StatusCode(500, "An error occurred while fetching lobbies");
        }
    }

    [HttpGet("lobbies/{lobbyId}")]
    public async Task<ActionResult<LobbyDetailDto>> GetLobby(int lobbyId)
    {
        try
        {
            var lobby = await _lobbyService.GetLobbyAsync(lobbyId);
            return Ok(lobby);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lobby {LobbyId}", lobbyId);
            return StatusCode(500, "An error occurred while fetching lobby details");
        }
    }

    [HttpPost("lobbies")]
    public async Task<ActionResult<LobbyDetailDto>> CreateLobby([FromBody] CreateLobbyDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var userId = CurrentUserId;
            var lobby = await _lobbyService.CreateLobbyAsync(userId, dto);
            return CreatedAtAction(nameof(GetLobby), new { lobbyId = lobby.Lobby.Id }, lobby);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating lobby for user {UserId}", CurrentUserId);
            return StatusCode(500, "An error occurred while creating the lobby");
        }
    }

    [HttpPost("lobbies/{lobbyId}/join")]
    public async Task<ActionResult<LobbyDetailDto>> JoinLobby(int lobbyId)
    {
        try
        {
            var userId = CurrentUserId;
            var lobby = await _lobbyService.JoinLobbyAsync(userId, lobbyId);
            return Ok(lobby);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining lobby {LobbyId} for user {UserId}", lobbyId, CurrentUserId);
            return StatusCode(500, "An error occurred while joining the lobby");
        }
    }

    [HttpPost("lobbies/{lobbyId}/leave")]
    public async Task<ActionResult<LobbyDetailDto?>> LeaveLobby(int lobbyId)
    {
        try
        {
            var userId = CurrentUserId;
            var lobby = await _lobbyService.LeaveLobbyAsync(userId, lobbyId);

            if (lobby == null)
                return Ok(new { message = "Lobby deleted" });

            return Ok(lobby);
        }
        catch (NotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving lobby {LobbyId} for user {UserId}", lobbyId, CurrentUserId);
            return StatusCode(500, "An error occurred while leaving the lobby");
        }
    }
}
