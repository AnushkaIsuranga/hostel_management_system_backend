using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace hostel_management_system_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddHostelVerificationAndSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVerified",
                table: "Hostels",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Hostels",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<int>(
                name: "VerificationStatus",
                table: "Hostels",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerifiedAt",
                table: "Hostels",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerifiedByAdminId",
                table: "Hostels",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HostelSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HostelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastReminderSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HostelSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HostelSubscriptions_Hostels_HostelId",
                        column: x => x.HostelId,
                        principalTable: "Hostels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HostelVerificationRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HostelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    AdminNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewedByAdminId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HostelVerificationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HostelVerificationRequests_Hostels_HostelId",
                        column: x => x.HostelId,
                        principalTable: "Hostels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HostelVerificationRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HostelVerificationRequests_Users_ReviewedByAdminId",
                        column: x => x.ReviewedByAdminId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Hostels_OwnerId",
                table: "Hostels",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Hostels_VerificationStatus",
                table: "Hostels",
                column: "VerificationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Hostels_VerifiedByAdminId",
                table: "Hostels",
                column: "VerifiedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_HostelSubscriptions_ExpiryDate",
                table: "HostelSubscriptions",
                column: "ExpiryDate");

            migrationBuilder.CreateIndex(
                name: "IX_HostelSubscriptions_HostelId",
                table: "HostelSubscriptions",
                column: "HostelId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HostelVerificationRequests_HostelId",
                table: "HostelVerificationRequests",
                column: "HostelId");

            migrationBuilder.CreateIndex(
                name: "IX_HostelVerificationRequests_RequestedByUserId",
                table: "HostelVerificationRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HostelVerificationRequests_ReviewedByAdminId",
                table: "HostelVerificationRequests",
                column: "ReviewedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_HostelVerificationRequests_Status",
                table: "HostelVerificationRequests",
                column: "Status");

            migrationBuilder.Sql(@"
DECLARE @EmptyGuid uniqueidentifier = '00000000-0000-0000-0000-000000000000';
DECLARE @FallbackOwnerId uniqueidentifier;

SELECT TOP (1) @FallbackOwnerId = [Id]
FROM [Users]
ORDER BY [CreatedAt];

IF @FallbackOwnerId IS NOT NULL
BEGIN
    UPDATE [Hostels]
    SET [OwnerId] = @FallbackOwnerId
    WHERE [OwnerId] = @EmptyGuid;
END
");

            migrationBuilder.AddForeignKey(
                name: "FK_Hostels_Users_OwnerId",
                table: "Hostels",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Hostels_Users_VerifiedByAdminId",
                table: "Hostels",
                column: "VerifiedByAdminId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Hostels_Users_OwnerId",
                table: "Hostels");

            migrationBuilder.DropForeignKey(
                name: "FK_Hostels_Users_VerifiedByAdminId",
                table: "Hostels");

            migrationBuilder.DropTable(
                name: "HostelSubscriptions");

            migrationBuilder.DropTable(
                name: "HostelVerificationRequests");

            migrationBuilder.DropIndex(
                name: "IX_Hostels_OwnerId",
                table: "Hostels");

            migrationBuilder.DropIndex(
                name: "IX_Hostels_VerificationStatus",
                table: "Hostels");

            migrationBuilder.DropIndex(
                name: "IX_Hostels_VerifiedByAdminId",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "IsVerified",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "VerifiedAt",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "VerifiedByAdminId",
                table: "Hostels");
        }
    }
}
