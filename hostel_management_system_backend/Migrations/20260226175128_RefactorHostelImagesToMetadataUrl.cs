using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace hostel_management_system_backend.Migrations
{
    /// <inheritdoc />
    public partial class RefactorHostelImagesToMetadataUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Image",
                table: "HostelImages",
                newName: "ImageUrl");

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "HostelImages",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "HostelImages",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "application/octet-stream");

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "HostelImages",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "HostelImages",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "HostelImages",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql(@"
                UPDATE HostelImages
                SET FileName = CASE
                    WHEN CHARINDEX('/', REVERSE(ImageUrl)) > 0
                        THEN RIGHT(ImageUrl, CHARINDEX('/', REVERSE(ImageUrl)) - 1)
                    WHEN CHARINDEX('\\', REVERSE(ImageUrl)) > 0
                        THEN RIGHT(ImageUrl, CHARINDEX('\\', REVERSE(ImageUrl)) - 1)
                    ELSE ImageUrl
                END
                WHERE FileName = '';
            ");

            migrationBuilder.CreateIndex(
                name: "IX_HostelImages_HostelId_DisplayOrder",
                table: "HostelImages",
                columns: new[] { "HostelId", "DisplayOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HostelImages_HostelId_DisplayOrder",
                table: "HostelImages");

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "HostelImages",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "HostelImages");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "HostelImages");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "HostelImages");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "HostelImages");

            migrationBuilder.RenameColumn(
                name: "ImageUrl",
                table: "HostelImages",
                newName: "Image");
        }
    }
}
