# Guía de la API

El contrato completo, con métodos, parámetros, cuerpos y respuestas por endpoint, está en [`openapi.yaml`](./openapi.yaml). Durante la ejecución del backend, Swagger UI está disponible en `/api-docs/` y el YAML en `/api-docs/openapi.yaml`. La base es `/api/v1`; el servidor local usa `http://localhost:3000/api/v1`.

## Autenticación

`POST /auth/login` recibe `email` y `password`. La respuesta incluye `data.accessToken` y `data.user`; el token de acceso se envía como `Authorization: Bearer <token>`. El refresh token va en cookie `HttpOnly` y no debe leerse ni guardarse desde JavaScript. El navegador debe usar credenciales (`withCredentials`) para login, renovación y cierre de sesión.

`POST /auth/refresh` rota la sesión y requiere el origen de frontend configurado en `CORS_ORIGIN`. `POST /auth/logout` revoca el refresh token. `GET /auth/me` devuelve el usuario autenticado. Los tokens de acceso vencen; las sesiones revocadas no se pueden renovar.

## Forma de respuesta

Una respuesta de entidad usa `data`:

```json
{
  "data": {
    "id": "uuid",
    "status": "BORRADOR"
  }
}
```

Los listados añaden metadatos de paginación:

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 20, "total": 0 }
}
```

Errores usan `error.code` y un mensaje público. Según el endpoint, los códigos HTTP incluyen `400` (entrada inválida), `401` (sesión inválida), `403` (sin permiso/origen confiable), `404` (no encontrado o no autorizado), `409` (conflicto) y `422` (regla de negocio). No se devuelven trazas internas.

## Permisos

- Sin token: solo login, refresh, logout y health; refresh/logout también validan el origen.
- `ADMINISTRADOR`: administra usuarios, catálogo, clientes, configuración e informes, además de consultar todas las cotizaciones autorizadas.
- `EMPLEADO`: consulta el catálogo, administra clientes según permisos, crea y sigue sus cotizaciones y consulta los recursos autorizados.

La autorización se aplica en el servidor, incluso cuando Angular oculta controles.

## Cotizaciones

Ejemplo de `POST /quotations`:

```json
{
  "clientId": "uuid-del-cliente",
  "expirationDate": "2026-12-15",
  "observations": "Entrega según coordinación",
  "items": [
    { "productId": "uuid-del-producto", "quantity": "2" },
    { "productId": "uuid-de-otro-producto", "quantity": "1.5" }
  ]
}
```

El precio, impuesto y total enviados por el cliente no son autoridad. El backend consulta configuración y productos, calcula importes y persiste la cotización, líneas e historial inicial dentro de una transacción. Solo `BORRADOR` es editable; las transiciones permitidas y el flujo de revisión se describen en [decisiones técnicas](../architecture/decisiones.md).

## Rutas agrupadas

El archivo OpenAPI define esquemas de entrada y operaciones para autenticación; usuarios; clientes y su historial; categorías; productos; cotizaciones, revisiones, estados y PDF; historial; dashboard; informes JSON/CSV; y configuración. Los listados usan paginación en backend. Los parámetros específicos y los códigos de respuesta se mantienen en el contrato OpenAPI.
