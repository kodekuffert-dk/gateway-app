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

## Konfiguration
Miljøvariabler kan defineres i `.env`, via shell-miljøet eller i `compose.yaml`.

Vigtige variabler:

- `PORT` - porten Express lytter på. Standard er `4000`.
- `SESSION_SECRET` - hemmelig nøgle til sessioner. Bør sættes til en stærk værdi uden for udvikling.
- `ADMIN_EMAILS` - kommasepareret liste af admin-emails, som må uploade artikler (f.eks. `admin@ucn.dk,teacher@ucn.dk`).
- `ARTICLES_DIR` - valgfri sti til mappe med Markdown-artikler. Standard er `src/data/articles`.