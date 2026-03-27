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
- Hold- og kursusadministration via catalog-service (eller dummy-provider)

## Konfiguration
Miljøvariabler til gateway-app'en defineres i `src/.env` (anbefalet). `compose.yaml` indlæser samme fil via `env_file` og sætter kun `NODE_ENV=production` oveni.

Vigtige variabler:

- `PORT` - porten Express lytter på. Standard er `4000`.
- `JWT_SECRET` - hemmelig nøgle til signering af JWT-cookie. Bør sættes til en stærk værdi uden for udvikling.
- `JWT_EXPIRES_IN` - token-levetid, f.eks. `7d` (standard) eller `12h`.
- `JWT_COOKIE_NAME` - navn på auth-cookie. Standard er `gateway_token`.
- `SESSION_SECRET` - fallback hvis `JWT_SECRET` ikke er sat.
- `AUTH_PROVIDER` - vælg auth-provider: `service` eller `dummy` (standard: `dummy`).
- `AUTH_SERVICE_URL` - base URL til auth-service, f.eks. `http://localhost:5000`.
- `AUTH_SERVICE_CLIENT_ID` - client-id sendt som `X-Client-Id` (standard: `gateway-client`).
- `AUTH_SERVICE_SECRET` - delt hemmelighed til HMAC-signatur i `X-Signature`.
- `AUTH_SERVICE_LOGIN_PATH` - endpoint path til login. Standard: `/login`.
- `AUTH_SERVICE_REGISTER_PATH` - endpoint path til oprettelse. Standard: `/user`.
- `ARTICLE_PROVIDER` - vælg article-provider: `service` eller `dummy` (standard: `dummy`).
- `ARTICLE_SERVICE_URL` - base URL til article-service, f.eks. `http://localhost:6000`.
- `ARTICLE_SERVICE_CLIENT_ID` - client-id sendt som `X-Client-Id`.
- `ARTICLE_SERVICE_SECRET` - delt hemmelighed til HMAC-signatur i `X-Signature`.
- `CATALOG_PROVIDER` - vælg catalog-provider: `service` eller `dummy` (standard: `dummy`).
- `CATALOG_SERVICE_URL` - base URL til catalog-service, f.eks. `http://localhost:7000`.
- `CATALOG_SERVICE_CLIENT_ID` - client-id sendt som `X-Client-Id`.
- `CATALOG_SERVICE_SECRET` - delt hemmelighed til HMAC-signatur i `X-Signature`.
- Admin-adgang styres via brugerens rolle fra auth-service (f.eks. `Administrator`) og ikke via email-liste i `.env`.

## Auth provider (interface-agtig struktur)
`authStore` fungerer som et lille interface-lag med to providers:

- `service`: kalder ekstern auth-service over HTTP.
- `dummy`: hardcoded test-brugere i gateway-app'en (ingen ekstern service krævet).

Dummy-brugere:

- `admin@kodekuffert.dk` / `kodekuffert123`
- `student@ucn.dk` / `kodekuffert123`

Dummy-provider accepterer kun brugere, der findes i den hardcodede `DUMMY_USERS`-liste.

## Catalog og Article providers
Gateway-app'en følger samme provider-mønster for content-domæner:

- `articleStore`: skifter mellem `dummy` (in-memory) og `service` (ekstern article-service)
- `catalogStore`: skifter mellem `dummy` (in-memory) og `service` (ekstern catalog-service)

I `dummy`-tilstand kan app'en køre uden lokal database-container.