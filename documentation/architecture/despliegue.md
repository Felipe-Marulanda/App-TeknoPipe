# Despliegue y operación

## Topología

Publica Angular como archivos estáticos y ejecuta la API Node/Express como servicio separado. Mantén PostgreSQL en una red privada accesible solo por la API. En producción todo el tráfico del navegador y API debe usar HTTPS.

El build Angular usa la ruta relativa `/api/v1`; configura el proxy del servidor web para enviar esa ruta al backend. Este esquema mantiene las cookies de sesión bajo el mismo sitio. Si frontend y API usan orígenes distintos, configura `CORS_ORIGIN` exactamente y comprueba las políticas de cookies con HTTPS.

```text
Navegador --HTTPS--> servidor web / Angular
Navegador --HTTPS /api/v1--> proxy --> API Express
API --red privada--> PostgreSQL
```

## Preparación

1. Construye Angular desde `frontend/` con `npm ci` y `npm run build`; publica `dist/frontend/browser` en el servidor web.
2. En el backend, instala dependencias con `npm ci`, ejecuta `npm run prisma:generate` y `npm run build`.
3. Proporciona al proceso variables seguras: `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `JWT_ACCESS_SECRET` y las variables `SEED_ADMIN_*` solo durante la inicialización requerida.
4. Antes de poner la API en servicio, ejecuta `npm run prisma:deploy` para aplicar las migraciones versionadas. Ejecuta `npm run prisma:seed` en la primera instalación; conserva las credenciales iniciales de forma segura y rota la contraseña después.
5. Ejecuta `npm start` con un supervisor de procesos. Expón únicamente el proxy/API; no publiques el puerto PostgreSQL.
6. Comprueba `/api/v1/health`, login, renovación de sesión y descarga PDF en el entorno desplegado.

No uses `prisma migrate dev` en producción. No incluyas `.env`, contraseñas, tokens ni archivos de respaldo dentro de la imagen o del repositorio. La API requiere Node.js 26 o posterior según `backend/package.json`.

## Copias de seguridad

Con credenciales operativas disponibles en el entorno, crea un respaldo lógico:

```sh
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > teknopipe-$(date +%F).dump
```

Guarda copias cifradas fuera del servidor de base de datos, limita el acceso y aplica una política de retención definida por la organización. Protege los archivos como datos sensibles: contienen clientes, usuarios y cotizaciones.

Para restaurar en una base preparada y autorizada:

```sh
pg_restore --clean --if-exists --no-owner --no-acl --dbname "$DATABASE_URL" teknopipe-AAAA-MM-DD.dump
```

La restauración reemplaza objetos existentes de la base destino. Verifica primero que `DATABASE_URL` señale al entorno de recuperación, no a producción activa. Tras restaurar, ejecuta `npm run prisma:deploy`, inicia API, valida `/api/v1/health` y prueba el acceso a registros y PDF. Programa simulacros periódicos y registra duración y resultado; una copia no está verificada hasta que puede restaurarse.

## Cambios de esquema y vuelta atrás

Haz respaldo antes de una migración de producción. Revisa la migración SQL y el impacto de sus índices/restricciones, aplica `prisma:deploy` y verifica salud y flujos principales. Las migraciones deben ser compatibles con el código desplegado durante la transición; no reescribas migraciones ya aplicadas. Para revertir un cambio de datos/esquema, prepara una migración correctiva o restaura una copia comprobada según el procedimiento operativo.

## Datos empresariales

Configura razón social, identificación fiscal, contacto, logotipo autorizado, términos, vigencia y formato de numeración antes de uso comercial. No se deben completar con datos ficticios. Consulta [datos pendientes](./datos-pendientes.md).
