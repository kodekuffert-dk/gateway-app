# Auth Service API Documentation

Version: 1.0.0

## Base URLs

- **Development**: `http://localhost:5000`
- **Production**: `https://auth.kodekuffert.dk`

## Authentication

Auth-service bruger **signature-baseret autentifikation** til at sikre requests mellem services.

### Required Headers

```http
X-Client-Id: your-client-id
X-Signature: hmac-sha256-signature-of-request-body
```

### Signature Beregning

```csharp
var secret = "your-client-secret";
var message = JsonSerializer.Serialize(requestBody);
var signature = ComputeHmacSha256(message, secret);
```

---

## Endpoints

### 1. Health Check

Tjek om servicen kører og har database-forbindelse.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "Healthy"
}
```

---

### 2. Create User

Opretter en ny bruger. Email skal være på whitelist.

**Endpoint**: `POST /user`

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200)**:
```json
{
  "message": "User created successfully. Continue by confirming email."
}
```

**Error Responses**:

- **400 Bad Request** - Email ikke whitelisted:
```json
{
  "message": "Email (student@example.com) is not whitelisted"
}
```

- **500 Internal Server Error** - Email kunne ikke sendes:
```json
{
  "message": "User created but failed to send confirmation email. Please contact support."
}
```

---

### 3. Confirm Email

Bekræfter brugerens email-adresse via token. **Dette endpoint skal kaldes af gateway-applikationen**, ikke direkte fra klienten.

**Endpoint**: `PATCH /user/confirm-email`

**Request Body**:
```json
{
  "email": "student@example.com",
  "token": "abc123def456"
}
```

**Success Response (200)**:
```json
{
  "message": "Email confirmed successfully. You can now log in."
}
```

**Already Confirmed (200)**:
```json
{
  "message": "Email is already confirmed."
}
```

**Error Responses**:

- **400 Bad Request** - Invalid token or missing fields:
```json
{
  "message": "Invalid or expired confirmation token."
}
```

- **404 Not Found** - User doesn't exist:
```json
{
  "message": "User not found."
}
```

**Gateway Integration**:

Bruger modtager email med link som: `https://yourgateway.com/confirm-email?token=abc123&email=user@example.com`

Gateway modtager GET request og sender PATCH til auth-service:
```http
PATCH /user/confirm-email
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]

{
  "email": "student@example.com",
  "token": "abc123def456"
}
```

---

### 4. Login

Autentificerer bruger og returnerer de brugerdata, gatewayen skal bruge til at oprette sin egen session-cookie.

**Endpoint**: `POST /login`

**Request Body**:
```json
{
  "email": "student@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200)**:
```json
{
  "message": "Login succesfuld",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "student@example.com",
  "role": "Student"
}
```

**Error Responses**:

- **400 Bad Request** - Missing fields:
```json
{
  "message": "Email og password skal udfyldes."
}
```

- **401 Unauthorized** - Invalid credentials:
```json
{
  "message": "Forkert email eller password."
}
```

- **401 Unauthorized** - Email not confirmed:
```json
{
  "message": "E-mail er ikke bekræftet."
}
```

---

### 5. Get Whitelist

Henter alle whitelistede emails grupperet efter team.

**Endpoint**: `GET /whitelist`

**Success Response (200)**:
```json
[
  {
    "teamName": "DevTeam",
    "emails": [
      {
        "email": "user1@example.com",
        "status": "Approved"
      },
      {
        "email": "user2@example.com",
        "status": "Pending"
      }
    ]
  },
  {
    "teamName": "StudentTeam",
    "emails": [
      {
        "email": "student1@school.dk",
        "status": "Approved"
      }
    ]
  }
]
```

**Email Status Values**:
- `Pending` (0) - Afventer godkendelse
- `Approved` (1) - Godkendt
- `Rejected` (2) - Afvist

---

### 6. Add Emails to Whitelist

Tilføjer emails til whitelist for et specifikt team.

**Endpoint**: `POST /whitelist`

**Request Body**:
```json
{
  "teamName": "DevTeam",
  "emails": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ]
}
```

**Success Response (200)**:
```json
{
  "message": "3 emails added to whitelist for team 'DevTeam'"
}
```

**Error Response (400)**:
```json
{
  "message": "Emails and TeamName are required."
}
```

---

### 7. Remove Emails from Whitelist

Fjerner emails fra whitelist.

**Endpoint**: `DELETE /whitelist`

**Request Body**:
```json
{
  "emails": [
    "user1@example.com",
    "user2@example.com"
  ]
}
```

**Success Response (200)**:
```json
{
  "message": "2 emails deleted from whitelist"
}
```

---

## User Flow

### 1️⃣ Administrator tilføjer email til whitelist

```http
POST /whitelist
Content-Type: application/json
X-Client-Id: admin-client
X-Signature: [computed-signature]

{
  "teamName": "DevTeam",
  "emails": ["student@example.com"]
}
```

### 2️⃣ Bruger opretter konto

```http
POST /user
Content-Type: application/json
X-Client-Id: frontend-client
X-Signature: [computed-signature]

{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

### 3️⃣ Bruger modtager email og klikker på link

Email indeholder link til gateway:
```
https://yourgateway.com/confirm-email?token=abc123&email=student@example.com
```

### 4️⃣ Gateway modtager request og kalder auth-service

```http
PATCH /user/confirm-email
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]

{
  "email": "student@example.com",
  "token": "abc123"
}
```

### 5️⃣ Bruger logger ind

```http
POST /login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "message": "Login succesfuld",
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "student@example.com",
  "role": "Student"
}
```

Gateway-applikationen opretter herefter sin egen signerede session-cookie til browseren.

---

## Data Models

### User
```json
{
  "id": "uuid",
  "email": "string",
  "role": "Student | Administrator",
  "isEmailConfirmed": "boolean",
  "createdAt": "datetime"
}
```

### Login Response
```json
{
  "message": "Login succesfuld",
  "id": "uuid",
  "email": "string",
  "role": "Student | Administrator"
}
```

---

## Error Handling

Alle endpoints returnerer standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication failed |
| 403 | Forbidden - Invalid signature |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Configuration

### Environment Variables

```bash
# Database
DB_CONNECTION="Host=auth-db;Port=5432;Database=authdb;Username=authuser;Password=authpassword"

# Email (Production only)
EMAIL_SMTP_HOST="smtp.gmail.com"
EMAIL_SMTP_PORT="587"
EMAIL_SMTP_USER="noreply@example.com"
EMAIL_SMTP_PASSWORD="password"
EMAIL_FROM_EMAIL="noreply@example.com"
EMAIL_CONFIRMATION_URL="https://yourgateway.com/confirm-email"

# Environment
ASPNETCORE_ENVIRONMENT="Development | Production"
```

**Vigtigt**: `EMAIL_CONFIRMATION_URL` skal pege på din **gateway**, ikke direkte på auth-service.

---

## Development Mode

I udviklings-miljø:
- ✅ Mock emails skrives til `auth-service/mock-emails/` mappen
- ✅ Ingen rigtige emails sendes
- ✅ Gateway URL: `http://localhost:3000/confirm-email`
- ✅ Signatur-validering kan bypasses (afhængig af middleware-konfiguration)

---

## Production Mode

I produktion:
- ✅ Rigtige emails sendes via SMTP
- ✅ Signatur-validering er påkrævet
- ✅ HTTPS er påkrævet

---

## Client Examples

### C# Example

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Security.Cryptography;

public async Task<string> CreateUser(string email, string password)
{
    var client = new HttpClient { BaseAddress = new Uri("http://localhost:5000") };
    
    var body = new { email, password };
    var json = JsonSerializer.Serialize(body);
    var signature = ComputeSignature(json, "your-client-secret");
    
    var request = new HttpRequestMessage(HttpMethod.Post, "/user");
    request.Headers.Add("X-Client-Id", "your-client-id");
    request.Headers.Add("X-Signature", signature);
    request.Content = new StringContent(json, Encoding.UTF8, "application/json");
    
    var response = await client.SendAsync(request);
    return await response.Content.ReadAsStringAsync();
}

private string ComputeSignature(string message, string secret)
{
    var keyBytes = Encoding.UTF8.GetBytes(secret);
    var messageBytes = Encoding.UTF8.GetBytes(message);
    
    using var hmac = new HMACSHA256(keyBytes);
    var hashBytes = hmac.ComputeHash(messageBytes);
    return Convert.ToBase64String(hashBytes);
}
```

### JavaScript/TypeScript Example

```typescript
async function createUser(email: string, password: string) {
  const body = { email, password };
  const json = JSON.stringify(body);
  const signature = await computeSignature(json, 'your-client-secret');
  
  const response = await fetch('http://localhost:5000/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': 'your-client-id',
      'X-Signature': signature
    },
    body: json
  });
  
  return await response.json();
}

async function computeSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

---

## Support

For spørgsmål eller problemer:
- GitHub: https://github.com/kodekuffert-dk/auth-service
- Issues: https://github.com/kodekuffert-dk/auth-service/issues
