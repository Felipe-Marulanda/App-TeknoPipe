# TEKNOPIPE

Sistema web para administrar clientes, catálogo, cotizaciones, estados, historial y reportes. La API recalcula los importes usando PostgreSQL como fuente de verdad y genera PDF desde los datos persistidos.

## Tecnologías

- Frontend: Angular standalone, TypeScript, Angular Material, SCSS y RxJS.
- Backend: Node.js, Express, TypeScript, Prisma, Zod, JWT y PDFMake.
- Persistencia: PostgreSQL 17.
- Pruebas: Vitest, Supertest y pruebas de Angular.

## Requisitos

- Node.js 26 o posterior y npm 11.
- Docker con Docker Compose.
- Git.

## Instalación local

1. Clona el repositorio y crea la configuración local:

   ```sh
   cp .env.example .env
   ```

2. Edita `.env`. Define `JWT_ACCESS_SECRET` con al menos 32 caracteres, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (mínimo 12 caracteres; máximo 72 bytes UTF-8) y, opcionalmente, `SEED_ADMIN_NAME`. Cambia también la contraseña PostgreSQL de desarrollo si el entorno lo requiere. No publiques este archivo.

3. Inicia PostgreSQL:

   ```sh
   docker compose up -d
   docker compose ps
   ```

4. Instala el backend, genera Prisma, aplica migraciones y crea roles, configuración inicial y administrador:

   ```sh
   cd backend
   npm ci
   npm run prisma:generate
   npm run prisma:validate
   npm run prisma:deploy
   npm run prisma:seed
   ```

5. En una terminal, inicia la API:

   ```sh
   cd backend
   npm run dev
   ```

   La API queda en `http://localhost:3000`; comprueba `http://localhost:3000/api/v1/health` y abre Swagger UI en `http://localhost:3000/api-docs/`.

6. En otra terminal, inicia Angular:

   ```sh
   cd frontend
   npm ci
   npm start
   ```

   Abre `http://localhost:4200` e inicia sesión con el administrador configurado en `.env`.

## Ejecución rápida de la demo

Requisitos: Docker Desktop (o Docker Engine con Compose), Node.js según `backend/package.json` y conexión local libre en los puertos 3000, 4200 y 5433. Desde la carpeta raíz del repositorio, ejecuta:

```sh
npm run demo
```

En el primer inicio, el comando crea `.demo/.env` tomando la estructura de `.env.example`, instala dependencias si faltan, inicia una base PostgreSQL aislada en el puerto 5433, espera su disponibilidad, aplica migraciones y carga el administrador inicial y los datos de demostración. Después arranca API y aplicación web juntos. Abre `http://localhost:4200` y accede con:

| Campo | Valor |
| --- | --- |
| Usuario administrador | `admin@teknopipe.test` |
| Contraseña de demo | `DemoPipe2026Admin` |

Estas credenciales son exclusivamente para la base local de demostración; no las uses fuera de ese entorno. Swagger UI está disponible en `http://localhost:3000/api-docs/`. El seed de demostración es independiente del seed inicial e idempotente: incluye cinco categorías, quince productos, seis clientes y doce cotizaciones distribuidas entre estados y meses. Los registros usan información ficticia y neutra.

Detén API, aplicación web y PostgreSQL con:

```sh
npm run demo:stop
```

La base y sus datos permanecen en el volumen local para el siguiente inicio. `.demo/` guarda la configuración y los registros de ejecución y está excluida de Git. Para iniciar con una base vacía, detén el entorno y elimina únicamente su volumen `teknopipe-demo_postgres_data` con Docker; el siguiente `npm run demo` volverá a aplicar las migraciones y ambos seeds.

## Comandos útiles

Desde `backend/`:

| Comando                    | Acción                                                             |
| -------------------------- | ------------------------------------------------------------------ |
| `npm run build`            | Compila TypeScript.                                                |
| `npm run lint`             | Ejecuta ESLint.                                                    |
| `npm test`                 | Pruebas unitarias y HTTP sin BD.                                   |
| `npm run test:integration` | Pruebas de integración contra PostgreSQL.                          |
| `npm run prisma:deploy`    | Aplica migraciones pendientes.                                     |
| `npm run prisma:seed`      | Verifica roles/configuración y crea el administrador si no existe. |

Desde `frontend/`:

| Comando                     | Acción                                |
| --------------------------- | ------------------------------------- |
| `npm run build`             | Compila Angular para producción.      |
| `npm run lint`              | Ejecuta ESLint.                       |
| `npm test -- --watch=false` | Ejecuta las pruebas frontend una vez. |

## Configuración

Las variables están descritas en [`.env.example`](.env.example). Las variables principales son `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_ACCESS_SECRET` y las variables `SEED_ADMIN_*`. El proceso valida la configuración al arrancar. No se deben copiar secretos a Angular: todo valor de frontend termina disponible en el navegador.

En desarrollo, Angular apunta a `http://localhost:3000/api/v1`. El build de producción usa `/api/v1`, por lo que el servidor web debe enviar esa ruta a la API y permitir las cookies de sesión. Configura `CORS_ORIGIN` con el origen exacto de la aplicación.

## Estructura

```text
backend/       API Express, módulos de dominio, Prisma y pruebas
frontend/      aplicación Angular por características
documentation/ arquitectura, modelo de datos, API y manuales
docker-compose.yml  PostgreSQL local
```

## Documentación

- [Arquitectura y diagramas](documentation/architecture/overview.md)
- [Decisiones técnicas](documentation/architecture/decisiones.md)
- [Modelo entidad-relación](documentation/architecture/modelo-er.md)
- [Diccionario de datos](documentation/database/diccionario.md)
- [Contrato OpenAPI](documentation/api/openapi.yaml)
- [Guía de la API](documentation/api/README.md)
- [Manual de usuario](documentation/user-manual/manual.md)
- [Despliegue y copias de seguridad](documentation/architecture/despliegue.md)
- [Datos empresariales pendientes](documentation/architecture/datos-pendientes.md)

## Seguridad y operación

El backend valida roles y propiedad de cotizaciones. Las contraseñas se almacenan con bcrypt; el JWT de acceso permanece en memoria del cliente y la renovación se hace con cookie `HttpOnly`. En producción usa HTTPS, secretos propios del entorno, un PostgreSQL privado y copias de seguridad verificadas. El administrador inicial se crea con el seed; no hay registro público.

Una cotización aprobada no equivale a una venta facturada. Los estados terminales no se modifican; se crea una revisión enlazada para cambiar una propuesta ya emitida.
