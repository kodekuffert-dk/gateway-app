# Article Service API Documentation

Version: 1.0.0

## Base URLs

- **Development**: `http://localhost:6000`
- **Production**: `https://articles.kodekuffert.dk`

## Purpose

Article-service ejer hele artikel-domænet:

- Artikler og deres metadata
- Markdown-indhold
- Kategorier / emner
- Persistence og ID'er

Gateway-app'en håndterer fortsat fil-upload fra administratorer, men videresender filindholdet til article-service som JSON. Servicen returnerer markdown som canonical payload, og gateway-app'en står for rendering og sanitization til HTML.

## Authentication

Article-service bruger **signature-baseret autentifikation** til at sikre requests mellem services.

### Required Headers

```http
X-Client-Id: your-client-id
X-Signature: base64-encoded-hmac-sha256
X-Timestamp: unix-timestamp-seconds
```

### Signature Beregning

Signaturen beregnes over følgende streng:

```text
{timestamp}.{json-body}
```

Eksempel:

```csharp
var secret = "your-client-secret";
var timestamp = "1711531200";
var body = JsonSerializer.Serialize(requestBody);
var message = $"{timestamp}.{body}";
var signature = ComputeHmacSha256Base64(message, secret);
```

Hvis requesten ikke har en body, bruges en tom streng efter punktummet:

```text
1711531200.
```

---

## Endpoints

### 1. Health Check

Tjek om servicen kører og kan forbinde til sine afhængigheder.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "Healthy"
}
```

---

### 2. List Categories

Henter alle kategorier, der kan bruges til artikler.

**Endpoint**: `GET /categories`

**Success Response (200)**:
```json
[
  {
    "id": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
    "name": "Datasikkerhed",
    "createdAt": "2026-03-27T09:15:00.000Z",
    "deletedAt": null
  },
  {
    "id": "3de6d6b7-fab1-460d-b40b-500dc77b8ddd",
    "name": "Case-analyse",
    "createdAt": "2026-03-27T09:16:00.000Z",
    "deletedAt": "2026-03-27T10:00:00.000Z"
  }
]
```

**Query Parameters**:
- `includeArchived` (boolean, optional) - Når `true`, returneres også arkiverede kategorier. Standard er `false`.

---

### 3. Create Category

Opretter en ny kategori til artikel-domænet.

**Endpoint**: `POST /categories`

**Request Body**:
```json
{
  "name": "Datasikkerhed"
}
```

**Success Response (201)**:
```json
{
  "id": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
  "name": "Datasikkerhed",
  "createdAt": "2026-03-27T09:15:00.000Z",
  "deletedAt": null
}
```

**Error Responses**:

- **400 Bad Request** - Navn mangler eller er tomt:
```json
{
  "message": "Category name is required."
}
```

- **409 Conflict** - Kategorien findes allerede:
```json
{
  "message": "Category 'Datasikkerhed' already exists."
}
```

---

### 4. Archive Category

Arkiverer en kategori. Kategorien fjernes fra standardlister, men slettes ikke fysisk.

**Endpoint**: `DELETE /categories/{categoryId}`

**Success Response (200)**:
```json
{
  "message": "Category archived successfully."
}
```

**Error Response (404)**:
```json
{
  "message": "Category not found."
}
```

---

### 5. List Articles

Henter artikler som oversigtsdata. Markdown-indhold returneres ikke i denne liste.

**Endpoint**: `GET /articles`

**Query Parameters**:
- `categoryId` (string, optional) - Filtrerer artikler på kategori

**Success Response (200)**:
```json
[
  {
    "id": "1773387036063-ssdlc-fase-eksempler",
    "title": "SSDLC fase eksempler",
    "categoryId": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
    "categoryName": "Datasikkerhed",
    "originalFileName": "ssdlc-fase-eksempler.md",
    "createdAt": "2026-03-27T09:20:00.000Z",
    "updatedAt": "2026-03-27T09:20:00.000Z"
  },
  {
    "id": "1773387233021-case-online-voting-system",
    "title": "Case: Online Voting System",
    "categoryId": "3de6d6b7-fab1-460d-b40b-500dc77b8ddd",
    "categoryName": "Case-analyse",
    "originalFileName": "case-online-voting-system.md",
    "createdAt": "2026-03-27T09:30:00.000Z",
    "updatedAt": "2026-03-27T09:35:00.000Z"
  }
]
```

---

### 6. Get Article By Id

Henter en enkelt artikel inklusive markdown-indhold.

**Endpoint**: `GET /articles/{articleId}`

**Success Response (200)**:
```json
{
  "id": "1773387036063-ssdlc-fase-eksempler",
  "title": "SSDLC fase eksempler",
  "categoryId": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
  "categoryName": "Datasikkerhed",
  "originalFileName": "ssdlc-fase-eksempler.md",
  "markdown": "# SSDLC fase eksempler\n\nIndhold...",
  "createdAt": "2026-03-27T09:20:00.000Z",
  "updatedAt": "2026-03-27T09:20:00.000Z"
}
```

**Error Response (404)**:
```json
{
  "message": "Article not found."
}
```

---

### 7. Create Article

Opretter en ny artikel i servicen. Gateway-app'en uploader først filen fra browseren og videresender derefter markdown-indholdet til servicen som JSON.

**Endpoint**: `POST /articles`

**Request Body**:
```json
{
  "title": "SSDLC fase eksempler",
  "categoryId": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
  "originalFileName": "ssdlc-fase-eksempler.md",
  "markdown": "# SSDLC fase eksempler\n\nIndhold..."
}
```

**Field Notes**:
- `title` er valgfri. Hvis den mangler, kan servicen udlede titlen fra første Markdown H1 eller filnavnet.
- `originalFileName` bruges til sporbarhed og evt. slug-generering, men servicen ejer det endelige artikel-id.
- `markdown` er canonical content format. HTML skal ikke gemmes eller returneres som primær payload.

**Success Response (201)**:
```json
{
  "id": "1773387036063-ssdlc-fase-eksempler",
  "title": "SSDLC fase eksempler",
  "categoryId": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
  "categoryName": "Datasikkerhed",
  "originalFileName": "ssdlc-fase-eksempler.md",
  "createdAt": "2026-03-27T09:20:00.000Z",
  "updatedAt": "2026-03-27T09:20:00.000Z"
}
```

**Error Responses**:

- **400 Bad Request** - Markdown mangler:
```json
{
  "message": "Markdown content is required."
}
```

- **400 Bad Request** - Kategorien findes ikke:
```json
{
  "message": "Category not found."
}
```

---

### 8. Delete Article

Sletter en artikel permanent.

**Endpoint**: `DELETE /articles/{articleId}`

**Success Response (200)**:
```json
{
  "message": "Article deleted successfully."
}
```

**Error Response (404)**:
```json
{
  "message": "Article not found."
}
```

---

## Service Flow

### 1️⃣ Administrator uploader Markdown-fil i gateway-app'en

Gateway modtager filen via browser-upload og læser dens tekstindhold.

### 2️⃣ Gateway opretter artikel i article-service

```http
POST /articles
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]

{
  "title": "SSDLC fase eksempler",
  "categoryId": "5e1c2c0b-b0c7-4f77-8cc3-7a76dc8ef2af",
  "originalFileName": "ssdlc-fase-eksempler.md",
  "markdown": "# SSDLC fase eksempler\n\nIndhold..."
}
```

### 3️⃣ Gateway henter artikelliste

```http
GET /articles
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]
```

### 4️⃣ Gateway henter en artikel og renderer markdown

```http
GET /articles/1773387036063-ssdlc-fase-eksempler
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]
```

Gateway renderer derefter `markdown` til HTML og sanitiserer output før visning i browseren.