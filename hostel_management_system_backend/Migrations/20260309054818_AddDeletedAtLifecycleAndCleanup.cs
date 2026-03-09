using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace hostel_management_system_backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDeletedAtLifecycleAndCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Universities",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "StudentPreferences",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Rooms",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "InteractionEvents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "HostelVerificationRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "HostelSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Hostels",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "HostelReviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "HostelListings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "HostelImages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Amenities",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Universities");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "StudentPreferences");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "InteractionEvents");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "HostelVerificationRequests");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "HostelSubscriptions");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Hostels");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "HostelReviews");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "HostelListings");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "HostelImages");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Amenities");
        }
    }
}
