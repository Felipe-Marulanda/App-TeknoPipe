# Frontend

Aplicación TEKNOPIPE construida con Angular 22.

## Desarrollo local

La configuración de desarrollo usa `http://localhost:3000/api/v1` para la API.
Inicie PostgreSQL y el backend desde la raíz del repositorio:

```bash
docker compose up -d postgres
cd backend
npm run dev
```

En otra terminal, inicie Angular:

```bash
cd frontend
npm start
```

Abra `http://localhost:4200`. La API debe permitir ese origen mediante
`CORS_ORIGIN`.

## Compilación y validación

```bash
npm run build
npm run lint
npm test -- --watch=false
```

La compilación de producción usa `/api/v1` como ruta relativa; el servidor que
aloje el frontend debe reenviar esa ruta al backend. La URL de desarrollo se
define en `src/environments/environment.development.ts`.
