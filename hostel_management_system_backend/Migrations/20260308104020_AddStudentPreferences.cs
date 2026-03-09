using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace hostel_management_system_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StudentPreferences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UniversityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MinBudget = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    MaxBudget = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    RequiredCapacity = table.Column<int>(type: "int", nullable: true),
                    SelectedAmenitiesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    PriorityOrderJson = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceWeight = table.Column<double>(type: "float", nullable: false),
                    DistanceWeight = table.Column<double>(type: "float", nullable: false),
                    RatingWeight = table.Column<double>(type: "float", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StudentPreferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StudentPreferences_Universities_UniversityId",
                        column: x => x.UniversityId,
                        principalTable: "Universities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StudentPreferences_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudentPreferences_UniversityId",
                table: "StudentPreferences",
                column: "UniversityId");

            migrationBuilder.CreateIndex(
                name: "IX_StudentPreferences_UserId",
                table: "StudentPreferences",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StudentPreferences");
        }
    }
}
