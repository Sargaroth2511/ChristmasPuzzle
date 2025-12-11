# Network Restriction for Statistics

## Overview
The statistics endpoints are now protected with IP-based network restrictions, allowing access only from your local network (domain network).

## How It Works

### Automatic Local Network Detection
The middleware automatically allows access from standard private network ranges:
- **10.0.0.0/8** (Class A private network)
- **172.16.0.0/12** (Class B private network)  
- **192.168.0.0/16** (Class C private network)
- **Localhost** (127.0.0.1, ::1)

### Configuration

#### Enable/Disable Network Restriction
```json
{
  "Statistics": {
    "RequireLocalNetwork": true,  // Set to false to disable IP restriction
    "AccessKey": "your-secret-key-here"
  }
}
```

#### Add Allowed Domains (Recommended)
Restrict access to specific domain names (e.g., your company domain):

```json
{
  "Statistics": {
    "RequireLocalNetwork": true,
    "AllowedDomains": "yourcompany.local, company.com",
    "AccessKey": "your-secret-key-here"
  }
}
```

**AllowedDomains** format:
- Domain names: `yourcompany.local`, `company.com`
- Subdomain matching: `company.com` will also match `server1.company.com`, `admin.company.com`, etc.
- Multiple entries: Comma-separated

### Add Custom Networks (Optional)
If you need to allow specific external IPs or custom network ranges:

```json
{
  "Statistics": {
    "RequireLocalNetwork": true,
    "AllowedNetworks": "203.0.113.5, 198.51.100.0/24",
    "AccessKey": "your-secret-key-here"
  }
}
```

**AllowedNetworks** format:
- Individual IPs: `203.0.113.5`
- CIDR notation: `198.51.100.0/24` (allows 198.51.100.0 - 198.51.100.255)
- Multiple entries: Comma-separated

## Development Setup

### Current Development Configuration
```json
{
  "Statistics": {
    "AccessKey": "TEST-KEY-8mK9nL2pQ5rT7wX1yZ4aB6cD3eF0gH",
    "RequireLocalNetwork": true,
    "AllowedDomains": "",
    "AllowedNetworks": ""
  }
}
```

This configuration:
- ✅ Allows access from localhost (127.0.0.1)
- ✅ Allows access from 192.168.x.x network
- ✅ Allows access from 10.x.x.x network
- ✅ Allows access from 172.16-31.x.x network
- ✅ Can allow specific domains (e.g., `yourcompany.local`)
- ❌ Blocks access from public internet IPs

## Production Deployment

### IIS Configuration

Set these environment variables in IIS:
```
Statistics__RequireLocalNetwork = true
Statistics__AccessKey = <strong-production-key>
Statistics__AllowedDomains = yourcompany.local,company.com
Statistics__AllowedNetworks = <optional-custom-networks>
```

Or use Configuration Editor:
1. Open IIS Manager
2. Select your application
3. Open "Configuration Editor"
4. Section: `system.webServer/aspNetCore/environmentVariables`
5. Add:
   - `Statistics__RequireLocalNetwork` = `true`
   - `Statistics__AccessKey` = your production key
   - `Statistics__AllowedDomains` = your company domain (e.g., `company.local`)
   - `Statistics__AllowedNetworks` = (optional custom networks)

### Testing Access

**From within your network:**
```bash
# Should work - you're on local network
curl -H "X-Stats-Key: YOUR-KEY" http://your-server/api/statistics/overview
```

**From outside your network:**
```bash
# Should return 403 Forbidden
curl -H "X-Stats-Key: YOUR-KEY" http://your-server/api/statistics/overview
# Response: {"error":"Access denied. Statistics are only accessible from the local network."}
```

## Security Benefits

1. **Defense in Depth**: Even if someone obtains the API key, they can't access statistics from outside your network
2. **Reduced Attack Surface**: Public internet traffic is blocked before authentication checks
3. **Compliance**: Ensures sensitive statistics stay within your organization's network boundary
4. **Flexible**: Can be disabled or customized per environment

## Troubleshooting

### "Access denied" from local machine
- Check your IP address: `ipconfig` (Windows) or `ip addr` (Linux)
- Ensure it's in a private range (192.168.x.x, 10.x.x.x, etc.)
- If using VPN, your IP might appear as public - add it to `AllowedNetworks` or verify your domain name
- Check DNS: `nslookup your-ip-address` to see if reverse DNS is working

### Configure Domain-Based Access
For domain-based restriction to work:
1. Ensure reverse DNS is configured on your network
2. Set `AllowedDomains`: `"yourcompany.local, company.com"`
3. The server will perform reverse DNS lookup on the client IP
4. If the hostname matches your domain, access is granted

Example: Client with IP `192.168.1.100` has hostname `workstation.company.local`
- Domain `company.local` will match ✅
- Domain `otherdomain.com` will not match ❌

### Access needed from specific external IP
Add the IP to `AllowedNetworks`:
```json
"AllowedNetworks": "203.0.113.45"
```

### Disable restriction temporarily
Set in configuration:
```json
"RequireLocalNetwork": false
```

### Check server logs
The middleware logs all access attempts with IP addresses and domain resolution:
```
[Information] Domain match: workstation.company.local matches allowed domain company.local
[Information] Access check passed for 192.168.1.100
[Warning] Domain mismatch: external.otherdomain.com not in allowed domains
[Warning] Statistics access denied: IP 203.0.113.50 is not from allowed network or domain
```

## Architecture

```
Request → IP/Domain Check → API Key Check → Endpoint
              ↓                   ↓
          403 if not          401 if invalid
          allowed                 key
```

Both checks must pass for access to be granted.

**Access is granted if ANY of these conditions are met:**
1. IP is from private network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
2. IP matches `AllowedNetworks` configuration
3. Reverse DNS hostname matches `AllowedDomains` configuration
