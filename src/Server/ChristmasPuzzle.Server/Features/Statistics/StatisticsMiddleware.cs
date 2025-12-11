using Microsoft.Extensions.Primitives;
using System.Net;

namespace ChristmasPuzzle.Server.Features.Statistics;

/// <summary>
/// Middleware to validate the statistics API access key and IP restrictions
/// </summary>
public class StatisticsAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StatisticsAuthMiddleware> _logger;

    public StatisticsAuthMiddleware(
        RequestDelegate next, 
        IConfiguration configuration,
        ILogger<StatisticsAuthMiddleware> logger)
    {
        _next = next;
        _configuration = configuration;
        _logger = logger;
    }

    private bool IsLocalNetworkIp(IPAddress? ipAddress)
    {
        if (ipAddress == null)
            return false;

        // Allow localhost
        if (IPAddress.IsLoopback(ipAddress))
            return true;

        // Convert to bytes for subnet checking
        var bytes = ipAddress.GetAddressBytes();
        
        // IPv4 only for now
        if (bytes.Length != 4)
            return false;

        // Check private network ranges:
        // 10.0.0.0 - 10.255.255.255 (Class A)
        if (bytes[0] == 10)
            return true;

        // 172.16.0.0 - 172.31.255.255 (Class B)
        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
            return true;

        // 192.168.0.0 - 192.168.255.255 (Class C)
        if (bytes[0] == 192 && bytes[1] == 168)
            return true;

        return false;
    }

    private async Task<bool> IsAllowedDomainAsync(HttpContext context)
    {
        var allowedDomains = _configuration["Statistics:AllowedDomains"];
        if (string.IsNullOrWhiteSpace(allowedDomains))
            return false;

        var remoteIp = context.Connection.RemoteIpAddress;
        if (remoteIp == null)
            return false;

        try
        {
            // Perform reverse DNS lookup
            var hostEntry = await Dns.GetHostEntryAsync(remoteIp);
            var hostname = hostEntry.HostName.ToLowerInvariant();

            var domains = allowedDomains.Split(',', StringSplitOptions.RemoveEmptyEntries);
            foreach (var domain in domains)
            {
                var trimmed = domain.Trim().ToLowerInvariant();
                
                // Exact match or subdomain match
                if (hostname.Equals(trimmed) || hostname.EndsWith("." + trimmed))
                {
                    _logger.LogInformation("Domain match: {Hostname} matches allowed domain {Domain}", hostname, trimmed);
                    return true;
                }
            }

            _logger.LogInformation("Domain mismatch: {Hostname} not in allowed domains", hostname);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve hostname for IP {IP}", remoteIp);
        }

        return false;
    }

    private bool IsAllowedCustomNetwork(IPAddress? ipAddress)
    {
        if (ipAddress == null)
            return false;

        // Get custom allowed networks from configuration (comma-separated)
        var allowedNetworks = _configuration["Statistics:AllowedNetworks"];
        if (string.IsNullOrWhiteSpace(allowedNetworks))
            return false;

        var networks = allowedNetworks.Split(',', StringSplitOptions.RemoveEmptyEntries);
        var ipBytes = ipAddress.GetAddressBytes();

        foreach (var network in networks)
        {
            var trimmed = network.Trim();
            
            // Support CIDR notation (e.g., "192.168.1.0/24")
            if (trimmed.Contains('/'))
            {
                var parts = trimmed.Split('/');
                if (parts.Length == 2 && 
                    IPAddress.TryParse(parts[0], out var networkIp) &&
                    int.TryParse(parts[1], out var prefixLength))
                {
                    if (IsInSubnet(ipAddress, networkIp, prefixLength))
                        return true;
                }
            }
            // Support individual IP addresses
            else if (IPAddress.TryParse(trimmed, out var allowedIp))
            {
                if (ipAddress.Equals(allowedIp))
                    return true;
            }
        }

        return false;
    }

    private bool IsInSubnet(IPAddress address, IPAddress network, int prefixLength)
    {
        var addressBytes = address.GetAddressBytes();
        var networkBytes = network.GetAddressBytes();

        if (addressBytes.Length != networkBytes.Length)
            return false;

        int bytesToCheck = prefixLength / 8;
        int bitsToCheck = prefixLength % 8;

        // Check full bytes
        for (int i = 0; i < bytesToCheck; i++)
        {
            if (addressBytes[i] != networkBytes[i])
                return false;
        }

        // Check remaining bits
        if (bitsToCheck > 0)
        {
            int mask = (byte)(0xFF << (8 - bitsToCheck));
            if ((addressBytes[bytesToCheck] & mask) != (networkBytes[bytesToCheck] & mask))
                return false;
        }

        return true;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only protect /api/statistics/* routes
        if (!context.Request.Path.StartsWithSegments("/api/statistics"))
        {
            await _next(context);
            return;
        }

        // Check IP/domain restriction first
        var remoteIp = context.Connection.RemoteIpAddress;
        var requireLocalNetwork = _configuration.GetValue<bool>("Statistics:RequireLocalNetwork", false);

        if (requireLocalNetwork)
        {
            bool isAllowed = IsLocalNetworkIp(remoteIp) || 
                           IsAllowedCustomNetwork(remoteIp) || 
                           await IsAllowedDomainAsync(context);
            
            if (!isAllowed)
            {
                _logger.LogWarning("Statistics access denied: IP {IP} is not from allowed network or domain", remoteIp);
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new 
                { 
                    error = "Access denied. Statistics are only accessible from authorized networks or domains." 
                });
                return;
            }
            
            _logger.LogInformation("Access check passed for {IP}", remoteIp);
        }

        // Get configured key from environment variable or appsettings
        var configuredKey = _configuration["Statistics:AccessKey"];

        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            _logger.LogInformation("Statistics:AccessKey is not configured. Set it as an environment variable on IIS.");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new 
            { 
                error = "Statistics endpoint is not properly configured on the server." 
            });
            return;
        }

        // Check for X-Stats-Key header
        if (!context.Request.Headers.TryGetValue("X-Stats-Key", out StringValues headerValue))
        {
            _logger.LogWarning("Statistics access attempt without X-Stats-Key header from {IP}", 
                context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new 
            { 
                error = "Unauthorized. X-Stats-Key header is required." 
            });
            return;
        }

        var providedKey = headerValue.ToString();

        // Validate the key
        if (providedKey != configuredKey)
        {
            _logger.LogWarning("Statistics access attempt with invalid key from {IP}", 
                context.Connection.RemoteIpAddress);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new 
            { 
                error = "Unauthorized. Invalid access key." 
            });
            return;
        }

        // Key is valid, continue to the endpoint
        _logger.LogInformation("Authorized statistics access from {IP}", 
            context.Connection.RemoteIpAddress);
        await _next(context);
    }
}

/// <summary>
/// Extension method to register the statistics auth middleware
/// </summary>
public static class StatisticsAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseStatisticsAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<StatisticsAuthMiddleware>();
    }
}
