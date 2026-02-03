using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddLobbyConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LobbyPlayers_LobbyId",
                table: "LobbyPlayers");

            migrationBuilder.DropIndex(
                name: "IX_LobbyPlayers_UserId",
                table: "LobbyPlayers");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Lobbies",
                type: "BLOB",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_LobbyPlayers_LobbyId_UserId",
                table: "LobbyPlayers",
                columns: new[] { "LobbyId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LobbyPlayers_UserId_ConnectionStatus",
                table: "LobbyPlayers",
                columns: new[] { "UserId", "ConnectionStatus" },
                unique: true,
                filter: "ConnectionStatus = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LobbyPlayers_LobbyId_UserId",
                table: "LobbyPlayers");

            migrationBuilder.DropIndex(
                name: "IX_LobbyPlayers_UserId_ConnectionStatus",
                table: "LobbyPlayers");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Lobbies");

            migrationBuilder.CreateIndex(
                name: "IX_LobbyPlayers_LobbyId",
                table: "LobbyPlayers",
                column: "LobbyId");

            migrationBuilder.CreateIndex(
                name: "IX_LobbyPlayers_UserId",
                table: "LobbyPlayers",
                column: "UserId",
                unique: true,
                filter: "ConnectionStatus <> 2");
        }
    }
}
