using System;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.FileProviders;
using ChristmasPuzzle.Server.Features.Users;
using ChristmasPuzzle.Server.Features.GameSessions;
using ChristmasPuzzle.Server.Features.Statistics;

var builder = WebApplication.CreateBuilder(args);

// Configure WebRootPath to look in the correct location
// In production (IIS), the executable is in myapp/ but content root is parent folder
// So we need to look for wwwroot in the same folder as the executable
var exeLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
var exeDirectory = Path.GetDirectoryName(exeLocation);
var wwwrootPath = Path.Combine(exeDirectory ?? string.Empty, "wwwroot");

if (Directory.Exists(wwwrootPath))
{
    builder.Environment.WebRootPath = wwwrootPath;
}

// Register services
builder.Services.AddSingleton<IUserDataService, UserDataService>();
builder.Services.AddSingleton<IPuzzleDefinitionProvider, SvgPuzzleDefinitionProvider>();
builder.Services.AddSingleton<IGameSessionService, GameSessionService>();
builder.Services.AddSingleton<ChristmasPuzzle.Server.Features.Statistics.IStatisticsService, ChristmasPuzzle.Server.Features.Statistics.StatisticsService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
// OpenAPI/Swagger only in .NET 9+, not needed for basic API
builder.Services.AddCors(options =>
{
    options.AddPolicy("ClientOrigin", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: allow local Angular dev server
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
        }
        else
        {
            // Production: Since Angular and API are served from same origin,
            // we can allow same origin or be more permissive for now
            policy.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

// Force UserDataService to initialize at startup (runs merge logic)
var userDataService = app.Services.GetRequiredService<IUserDataService>();
app.Logger.LogInformation("UserDataService initialized - seed data merge completed");

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    // OpenAPI/Swagger only in .NET 9+
}

// Only redirect to HTTPS in development - IIS handles this in production
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

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

app.UseRouting();
app.UseCors("ClientOrigin");

// Statistics authentication middleware (protects /api/statistics/*)
app.UseStatisticsAuth();

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
