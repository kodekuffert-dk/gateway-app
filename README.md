# Gateway Frontend

![License](https://img.shields.io/github/license/kodekuffert-dk/gateway-app)


Frontend-gateway i Node.js + Express. Kalder backend-services og håndterer auth/session.

- Loginflow
- Opsætning med og uden mocks
- Proxy-routing til services
- Krav til miljøvariabler (f.eks. AUTH_URL)

## Teknologi
- Node.js
- Express.js

## Kom i gang

### Kør lokalt
```bash
npm install
npm start
```

Gateway starter på `http://localhost:4000`.

### Kør med Docker Compose
```bash
docker compose up --build
```

Gateway starter på `http://localhost:4000`.

### Byg og kør Docker-imaget direkte
```bash
docker build -t gateway-app .
docker run --rm -p 4000:4000 -e SESSION_SECRET=change-me gateway-app
```

## Funktioner
- Login med JWT
- Proxy til backend services
- Mulighed for mock-services under udvikling
- Artikelside med visning af Markdown-artikler for alle loggede brugere
- Upload af Markdown-artikler for administratorer
- Brugeradministration for administratorer
- Hold i egen tabel (`teams`) med startdato og slutdato
- Kurser i egen tabel (`courses`) med titel og beskrivelse
- Kurser tildeles hold (`team_courses`) og arves af brugere via deres hold

## Konfiguration
Miljøvariabler kan defineres i `.env`, via shell-miljøet eller i `compose.yaml`.

Vigtige variabler:

- `PORT` - porten Express lytter på. Standard er `4000`.
- `JWT_SECRET` - hemmelig nøgle til signering af JWT-cookie. Bør sættes til en stærk værdi uden for udvikling.
- `JWT_EXPIRES_IN` - token-levetid, f.eks. `7d` (standard) eller `12h`.
- `JWT_COOKIE_NAME` - navn på auth-cookie. Standard er `gateway_token`.
- `SESSION_SECRET` - fallback hvis `JWT_SECRET` ikke er sat.
- `DATABASE_URL` - connection string til PostgreSQL (default i compose peger på `postgres` service).
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - konfiguration for PostgreSQL-containeren.
- `ADMIN_EMAILS` - kommasepareret liste af admin-mails med adgang til artikel- og brugeradministration.
- `ARTICLES_DIR` - valgfri sti til mappe med Markdown-artikler. Standard er `src/data/articles`.

## Databasemigrering (eksisterende data)
Hvis du allerede har en kørende Postgres-volume, kan schema-migreringen køres manuelt:

```bash
docker compose exec -T postgres psql -U gateway -d gateway < db/migrations/002_normalize_teams_courses.sql
```