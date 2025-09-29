using System.Linq;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientOrigin", policy =>
    {
        policy.WithOrigins(
                "http://127.0.0.1:4300",
                "http://localhost:4300",
                "https://127.0.0.1:4300",
                "https://localhost:4300",
                "http://127.0.0.1:4200",
                "http://localhost:4200",
                "https://127.0.0.1:4200",
                "https://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var spaDistPath = ResolveSpaDistPath(app);
if (spaDistPath is not null)
{
    var distProvider = new PhysicalFileProvider(spaDistPath);

    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = distProvider
    });

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = distProvider
    });
}
else
{
    app.Logger.LogWarning("Angular dist folder not found. Build the client into wwwroot or run 'npm run build' inside ClientApp.");
}

app.UseStaticFiles();

app.UseRouting();
app.UseCors("ClientOrigin");

app.MapControllers();

if (spaDistPath is not null)
{
    var distProvider = new PhysicalFileProvider(spaDistPath);

    app.MapFallbackToFile("{*path}", "index.html", new StaticFileOptions
    {
        FileProvider = distProvider
    });
}

app.Run();

static string? ResolveSpaDistPath(WebApplication app)
{
    var candidatePaths = new[]
    {
        app.Environment.WebRootPath,
        Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "..", "ClientApp", "dist"))
    };

    foreach (var path in candidatePaths)
    {
        if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
        {
            continue;
        }

        if (Directory.EnumerateFileSystemEntries(path).Any())
        {
            return path;
        }
    }

    return null;
}
