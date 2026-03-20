# Gateway Integration Guide

## Overview

Auth-service bruger en **gateway-pattern** for email confirmation. Brugere klikker på links der går til gateway'en, som derefter kalder auth-service.

## Why Gateway Pattern?

✅ **Separation of concerns** - Auth-service håndterer kun autentifikation  
✅ **Flexibility** - Gateway kan tilføje ekstra logik eller logging  
✅ **Security** - Query parameters eksponeres ikke direkte til backend  
✅ **Consistency** - Alle eksterne API calls går gennem gateway  

## Email Confirmation Flow

```
┌──────────────┐
│    User      │
│  (Browser)   │
└──────┬───────┘
       │ 1. Clicks link in email
       │    https://gateway.com/confirm-email?token=abc&email=user@example.com
       ▼
┌──────────────────┐
│    Gateway       │
│  (Your App)      │
└──────┬───────────┘
       │ 2. Extracts token & email from query params
       │ 3. Sends PATCH request with signature
       │
       ▼
┌───────────────────┐
│   Auth-Service    │
│   (This API)      │
└───────────────────┘
       │
       │ 4. Returns success/error
       ▼
┌──────────────────┐
│    Gateway       │
│  Shows message   │
│  to user         │
└──────────────────┘
```

## Configuration

### Auth-Service Configuration

**Development** (`appsettings.Development.json`):
```json
{
  "Email": {
    "ConfirmationUrl": "http://localhost:3000/confirm-email"
  }
}
```

**Production** (`appsettings.json`):
```json
{
  "Email": {
    "ConfirmationUrl": "https://yourgateway.com/confirm-email"
  }
}
```

## Gateway Implementation

### Example: Node.js/Express

```javascript
app.get('/confirm-email', async (req, res) => {
  const { token, email } = req.query;
  
  if (!token || !email) {
    return res.status(400).send('Invalid confirmation link');
  }
  
  try {
    // Call auth-service
    const body = JSON.stringify({ email, token });
    const signature = computeHmacSha256(body, process.env.AUTH_SERVICE_SECRET);
    
    const response = await fetch('http://auth-service:8080/user/confirm-email', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': process.env.AUTH_SERVICE_CLIENT_ID,
        'X-Signature': signature
      },
      body: body
    });
    
    const result = await response.json();
    
    if (response.ok) {
      res.send(`
        <h1>Email Confirmed!</h1>
        <p>${result.message}</p>
        <a href="/login">Go to Login</a>
      `);
    } else {
      res.status(response.status).send(`
        <h1>Error</h1>
        <p>${result.message}</p>
      `);
    }
  } catch (error) {
    console.error('Error confirming email:', error);
    res.status(500).send('Failed to confirm email');
  }
});

function computeHmacSha256(message, secret) {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');
}
```

### Example: C# / ASP.NET Core

```csharp
[HttpGet("confirm-email")]
public async Task<IActionResult> ConfirmEmail([FromQuery] string token, [FromQuery] string email)
{
    if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(email))
    {
        return BadRequest("Invalid confirmation link");
    }

    var body = new { email, token };
    var json = JsonSerializer.Serialize(body);
    var signature = ComputeHmacSha256(json, _configuration["AuthService:Secret"]);

    var request = new HttpRequestMessage(HttpMethod.Patch, "http://auth-service:8080/user/confirm-email");
    request.Headers.Add("X-Client-Id", _configuration["AuthService:ClientId"]);
    request.Headers.Add("X-Signature", signature);
    request.Content = new StringContent(json, Encoding.UTF8, "application/json");

    var response = await _httpClient.SendAsync(request);
    var result = await response.Content.ReadAsStringAsync();

    if (response.IsSuccessStatusCode)
    {
        return Content($@"
            <html>
            <body>
                <h1>Email Confirmed!</h1>
                <p>You can now log in.</p>
                <a href='/login'>Go to Login</a>
            </body>
            </html>
        ", "text/html");
    }

    return StatusCode((int)response.StatusCode, result);
}

private string ComputeHmacSha256(string message, string secret)
{
    var keyBytes = Encoding.UTF8.GetBytes(secret);
    var messageBytes = Encoding.UTF8.GetBytes(message);
    
    using var hmac = new HMACSHA256(keyBytes);
    var hashBytes = hmac.ComputeHash(messageBytes);
    return Convert.ToBase64String(hashBytes);
}
```

### Example: Python / FastAPI

```python
from fastapi import FastAPI, Query
from fastapi.responses import HTMLResponse
import httpx
import hmac
import hashlib
import base64
import json
import os

app = FastAPI()

@app.get("/confirm-email", response_class=HTMLResponse)
async def confirm_email(token: str = Query(...), email: str = Query(...)):
    body = {"email": email, "token": token}
    body_json = json.dumps(body)
    
    # Compute signature
    signature = base64.b64encode(
        hmac.new(
            os.environ["AUTH_SERVICE_SECRET"].encode(),
            body_json.encode(),
            hashlib.sha256
        ).digest()
    ).decode()
    
    # Call auth-service
    async with httpx.AsyncClient() as client:
        response = await client.patch(
            "http://auth-service:8080/user/confirm-email",
            headers={
                "Content-Type": "application/json",
                "X-Client-Id": os.environ["AUTH_SERVICE_CLIENT_ID"],
                "X-Signature": signature
            },
            json=body
        )
    
    if response.status_code == 200:
        return """
        <html>
            <body>
                <h1>Email Confirmed!</h1>
                <p>You can now log in.</p>
                <a href="/login">Go to Login</a>
            </body>
        </html>
        """
    else:
        return f"""
        <html>
            <body>
                <h1>Error</h1>
                <p>{response.json().get('message', 'Unknown error')}</p>
            </body>
        </html>
        """
```

## Testing

### 1. Create a User

```bash
curl -X POST http://auth-service:8080/user \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: your-client-id" \
  -H "X-Signature: computed-signature" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Check Mock Email File

In development, check `auth-service/mock-emails/` for the confirmation link:
```
http://localhost:3000/confirm-email?token=abc123&email=test@example.com
```

### 3. Test Gateway Endpoint

Visit the link in your browser or:
```bash
curl http://localhost:3000/confirm-email?token=abc123&email=test@example.com
```

### 4. Verify in Auth-Service

The gateway should call:
```bash
curl -X PATCH http://auth-service:8080/user/confirm-email \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: gateway-client" \
  -H "X-Signature: computed-signature" \
  -d '{"email":"test@example.com","token":"abc123"}'
```

## Environment Variables for Gateway

```bash
# Auth-service connection
AUTH_SERVICE_URL="http://auth-service:8080"
AUTH_SERVICE_CLIENT_ID="gateway-client"
AUTH_SERVICE_SECRET="your-shared-secret"

# Your gateway URL (must match auth-service Email:ConfirmationUrl)
GATEWAY_URL="http://localhost:3000"
```

## Security Considerations

✅ **Always use HTTPS** in production for the gateway URL  
✅ **Validate token format** before calling auth-service  
✅ **Rate limit** confirmation endpoints to prevent abuse  
✅ **Log failed attempts** for security monitoring  
✅ **Use environment variables** for secrets, never hardcode  

## Troubleshooting

### "Invalid signature" error
- ✅ Check that clientId and secret match on both sides
- ✅ Ensure request body is identical when computing signature
- ✅ Verify Content-Type is `application/json`

### "Token expired" error
- Tokens don't expire currently, but you may want to add expiration logic

### Email link doesn't work
- ✅ Check `Email:ConfirmationUrl` in appsettings matches your gateway URL
- ✅ Verify gateway is running and accessible
- ✅ Check gateway logs for errors

## Next Steps

1. ✅ Implement gateway endpoint for `/confirm-email`
2. ✅ Configure `Email:ConfirmationUrl` to point to your gateway
3. ✅ Test the full flow: create user → receive email → click link → confirm
4. ✅ Add error handling and user-friendly messages
5. ✅ Configure production SMTP and gateway URL
