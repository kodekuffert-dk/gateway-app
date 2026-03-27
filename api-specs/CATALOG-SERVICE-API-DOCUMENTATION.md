# Catalog Service API Documentation

Version: 1.0.0

## Base URLs

- **Development**: `http://localhost:7000`
- **Production**: `https://catalog.kodekuffert.dk`

## Purpose

Catalog-service ejer hold- og kursusdomænet:

- Hold (teams) med startdato, slutdato og tilknyttede kurser
- Kurser med titel og beskrivelse
- Tilknytning mellem hold og kurser

Gateway-app'en kalder catalog-service fra admin-panelet og fra whitelist-import-flowet.
Ved CSV-import kan gatewayen bede servicen om at oprette et hold, hvis det ikke allerede eksisterer.

## Authentication

Catalog-service bruger **signature-baseret autentifikation** til at sikre requests mellem services.

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

## Kurser

### 2. List Courses

Henter alle kurser sorteret alfabetisk efter titel.

**Endpoint**: `GET /courses`

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "title": "Introduktion til IT-sikkerhed",
    "description": "Grundlæggende begreber inden for IT-sikkerhed og trusselsbilleder.",
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "title": "SSDLC og sikker softwareudvikling",
    "description": "Integrering af sikkerhed i hele softwareudviklingslivscyklussen.",
    "createdAt": "2026-01-15T10:01:00.000Z",
    "updatedAt": "2026-01-15T10:01:00.000Z"
  }
]
```

---

### 3. Create Course

Opretter et nyt kursus.

**Endpoint**: `POST /courses`

**Request Body**:
```json
{
  "title": "Introduktion til IT-sikkerhed",
  "description": "Grundlæggende begreber inden for IT-sikkerhed og trusselsbilleder."
}
```

**Success Response (201)**:
```json
{
  "id": 1,
  "title": "Introduktion til IT-sikkerhed",
  "description": "Grundlæggende begreber inden for IT-sikkerhed og trusselsbilleder.",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Error Response (400)**:
```json
{
  "message": "Course title is required."
}
```

---

### 4. Update Course

Opdaterer titel og/eller beskrivelse på et eksisterende kursus.

**Endpoint**: `PUT /courses/{courseId}`

**Request Body**:
```json
{
  "title": "Introduktion til IT-sikkerhed",
  "description": "Opdateret beskrivelse."
}
```

**Success Response (200)**:
```json
{
  "id": 1,
  "title": "Introduktion til IT-sikkerhed",
  "description": "Opdateret beskrivelse.",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-03-27T09:00:00.000Z"
}
```

**Error Response (404)**:
```json
{
  "message": "Course not found."
}
```

---

### 5. Delete Course

Sletter et kursus permanent. Tilknytninger til hold fjernes automatisk.

**Endpoint**: `DELETE /courses/{courseId}`

**Success Response (200)**:
```json
{
  "message": "Course deleted successfully."
}
```

**Error Response (404)**:
```json
{
  "message": "Course not found."
}
```

---

## Hold

### 6. List Teams

Henter alle hold sorteret alfabetisk efter navn.
Hvert hold inkluderer de tilknyttede kursus-id'er og kursus-titler.

**Endpoint**: `GET /teams`

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "name": "Hold A – Forår 2026",
    "startDate": "2026-02-01",
    "endDate": "2026-06-30",
    "courseIds": [1, 2],
    "courses": ["Introduktion til IT-sikkerhed", "SSDLC og sikker softwareudvikling"],
    "createdAt": "2026-01-20T09:00:00.000Z",
    "updatedAt": "2026-01-20T09:00:00.000Z"
  }
]
```

---

### 7. Create Team

Opretter et nyt hold med valgfrie kursustilknytninger.

**Endpoint**: `POST /teams`

**Request Body**:
```json
{
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "courseIds": [1, 2]
}
```

**Field Notes**:
- `startDate` er påkrævet og skal have formatet `YYYY-MM-DD`.
- `endDate` er valgfri.
- `courseIds` er valgfri. Et tomt array eller fraværende felt opretter holdet uden kurser.

**Success Response (201)**:
```json
{
  "id": 1,
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "courseIds": [1, 2],
  "courses": ["Introduktion til IT-sikkerhed", "SSDLC og sikker softwareudvikling"],
  "createdAt": "2026-01-20T09:00:00.000Z",
  "updatedAt": "2026-01-20T09:00:00.000Z"
}
```

**Error Response (400)**:
```json
{
  "message": "Team name and startDate are required."
}
```

---

### 8. Ensure Team By Name

Henter et eksisterende hold med det givne navn, eller opretter det hvis det ikke findes.
Bruges primært af gateway-app'en ved CSV-whitelist-import, hvor holdnavnet er defineret i filen.

**Endpoint**: `POST /teams/ensure`

**Request Body**:
```json
{
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30"
}
```

**Field Notes**:
- Søgning er case-insensitiv på `name`.
- `startDate` og `endDate` bruges kun, hvis holdet oprettes. De ignoreres, hvis holdet allerede eksisterer.
- Hvis holdet oprettes og `startDate` mangler, bruges dags dato.

**Success Response (200)**:
```json
{
  "id": 1,
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "createdAt": "2026-01-20T09:00:00.000Z",
  "updatedAt": "2026-01-20T09:00:00.000Z"
}
```

**Error Response (400)**:
```json
{
  "message": "Team name is required."
}
```

---

### 9. Update Team

Opdaterer navn, datoer og kursustilknytninger på et eksisterende hold.
Eksisterende kursustilknytninger erstattes fuldstændigt af de nye.

**Endpoint**: `PUT /teams/{teamId}`

**Request Body**:
```json
{
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "courseIds": [1]
}
```

**Success Response (200)**:
```json
{
  "id": 1,
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "courseIds": [1],
  "courses": ["Introduktion til IT-sikkerhed"],
  "createdAt": "2026-01-20T09:00:00.000Z",
  "updatedAt": "2026-03-27T09:00:00.000Z"
}
```

**Error Response (404)**:
```json
{
  "message": "Team not found."
}
```

---

### 10. Delete Team

Sletter et hold permanent. Kursustilknytninger fjernes automatisk.

**Endpoint**: `DELETE /teams/{teamId}`

**Success Response (200)**:
```json
{
  "message": "Team deleted successfully."
}
```

**Error Response (404)**:
```json
{
  "message": "Team not found."
}
```

---

## Service Flow

### 1️⃣ Administrator opretter kurser

```http
POST /courses
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]

{
  "title": "Introduktion til IT-sikkerhed",
  "description": "Grundlæggende begreber inden for IT-sikkerhed."
}
```

### 2️⃣ Administrator opretter hold og tilknytter kurser

```http
POST /teams
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]

{
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-06-30",
  "courseIds": [1, 2]
}
```

### 3️⃣ Gateway sikrer hold ved CSV-whitelist-import

```http
POST /teams/ensure
Content-Type: application/json
X-Client-Id: gateway-client
X-Signature: [computed-signature]
X-Timestamp: [unix-timestamp]

{
  "name": "Hold A – Forår 2026",
  "startDate": "2026-02-01",
  "endDate": null
}
```
