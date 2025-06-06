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

### Med mock-services
```bash
docker-compose up --build
```

Gateway starter på `http://localhost:4000`.

## Funktioner
- Login med JWT
- Proxy til backend services
- Mulighed for mock-services under udvikling

## Konfiguration
Miljøvariabler som f.eks. `AUTH_URL`, `MATERIAL_URL` defineres i `.env` eller `docker-compose.yml`.