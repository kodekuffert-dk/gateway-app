# Gateway Frontend

![License](https://img.shields.io/github/license/kodekuffert-dk/gateway-app)


Frontend-gateway i Node.js + Express. Kalder backend-services, håndterer JWT-session og bruger ekstern auth-service til login.

- Login via auth-service
- Opsætning med og uden mocks
- Proxy-routing til services
- Krav til miljøvariabler (f.eks. AUTH_SERVICE_URL)

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
- Login med ekstern auth-service + lokal JWT-session
- Proxy til backend services
- Mulighed for mock-services under udvikling
- Artikelside med visning af Markdown-artikler for alle loggede brugere
- Upload af Markdown-artikler for administratorer
- Hold i egen tabel (`teams`) med startdato og slutdato
- Kurser i egen tabel (`courses`) med titel og beskrivelse
- Kurser tildeles hold (`team_courses`)

## Konfiguration
Miljøvariabler kan defineres i `src/.env` (anbefalet), via shell-miljøet eller i `compose.yaml`.

Vigtige variabler:

- `PORT` - porten Express lytter på. Standard er `4000`.
- `JWT_SECRET` - hemmelig nøgle til signering af JWT-cookie. Bør sættes til en stærk værdi uden for udvikling.
- `JWT_EXPIRES_IN` - token-levetid, f.eks. `7d` (standard) eller `12h`.
- `JWT_COOKIE_NAME` - navn på auth-cookie. Standard er `gateway_token`.
- `SESSION_SECRET` - fallback hvis `JWT_SECRET` ikke er sat.
- `AUTH_PROVIDER` - vælg auth-provider: `service` eller `dummy` (standard: `service`).
- `AUTH_SERVICE_URL` - base URL til auth-service, f.eks. `http://localhost:5000`.
- `AUTH_SERVICE_CLIENT_ID` - client-id sendt som `X-Client-Id` (standard: `gateway-client`).
- `AUTH_SERVICE_SECRET` - delt hemmelighed til HMAC-signatur i `X-Signature`.
- `AUTH_SERVICE_LOGIN_PATH` - endpoint path til login. Standard: `/login`.
- `AUTH_SERVICE_REGISTER_PATH` - endpoint path til oprettelse. Standard: `/user`.
- `DATABASE_URL` - connection string til PostgreSQL (default i compose peger på `postgres` service).
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - konfiguration for PostgreSQL-containeren.
- Admin-adgang styres via brugerens rolle fra auth-service (f.eks. `Administrator`) og ikke via email-liste i `.env`.
- `ARTICLES_DIR` - valgfri sti til mappe med Markdown-artikler. Standard er `src/data/articles`.

## Auth provider (interface-agtig struktur)
`authStore` fungerer som et lille interface-lag med to providers:

- `service`: kalder ekstern auth-service over HTTP.
- `dummy`: hardcoded test-brugere i gateway-app'en (ingen ekstern service krævet).

Dummy-brugere:

- `admin@kodekuffert.dk` / `kodekuffert123`
- `student@ucn.dk` / `kodekuffert123`

Dummy-provider accepterer kun brugere, der findes i den hardcodede `DUMMY_USERS`-liste.

## Databasemigrering (eksisterende data)
Hvis du allerede har en kørende Postgres-volume, kan schema-migreringen køres manuelt:

```bash
docker compose exec -T postgres psql -U gateway -d gateway < db/migrations/002_normalize_teams_courses.sql

# Fjern lokal brugerdata fra gateway-databasen
docker compose exec -T postgres psql -U gateway -d gateway < db/migrations/004_drop_gateway_users.sql
```