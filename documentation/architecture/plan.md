# Estructura, dependencias y plan

## Organización propuesta

```text
frontend/
  src/app/
    core/{guards,interceptors,services,models}/
    shared/{components,directives,pipes}/
    layout/{sidebar,header,main-layout}/
    features/{auth,dashboard,users,clients,categories,products,quotations,history,reports,settings}/
  src/assets/
  src/styles/
backend/
  prisma/{schema.prisma,migrations/,seed.ts}
  src/
    config/
    middlewares/
    modules/
      auth/ users/ roles/ clients/ categories/ products/
      quotations/ pdf/ history/ reports/ settings/
    utils/
    types/
    app.ts
    server.ts
documentation/
  architecture/
  database/
  api/
  diagrams/
  user-manual/
docker-compose.yml
.env.example
README.md
```

Cada módulo de API contiene rutas, controlador, servicio, repositorio, validación Zod y tipos cuando sea necesario. `app.ts` configura middleware/rutas; `server.ts` solo valida configuración e inicia el listener. Las pruebas se colocan junto al módulo o en directorios `tests` claramente separados.

## Dependencias previstas

Las versiones se determinarán en Fase 2 consultando versiones estables y peer dependencies; no se fijan números sin verificar compatibilidad.

### Frontend

- Angular, Angular Router y Angular Material/CDK.
- TypeScript, RxJS y Sass.
- Herramientas oficiales de Angular CLI y su runner de pruebas compatible con la versión elegida.
- Evitar bibliotecas adicionales para componentes, estado global o gráficas hasta comprobar que Angular/CDK y las necesidades reales no bastan.

### Backend

- Node.js LTS compatible, Express y TypeScript.
- Prisma CLI y Prisma Client; PostgreSQL como driver/base de datos.
- Zod para validación; una biblioteca JWT compatible con Node para access JWT; `bcrypt` para hashes.
- Helmet, CORS y rate limiter de Express para seguridad HTTP y login.
- PDFMake para crear documentos en el servidor.
- OpenAPI/Swagger UI y generación desde las validaciones para mantener contrato y Zod alineados.

### Desarrollo y pruebas

- Docker Compose para PostgreSQL local.
- ESLint y Prettier para frontend y backend con configuración consistente.
- Runner de pruebas compatible con Angular elegido y Vitest (o runner equivalente compatible) para lógica Node; Supertest para pruebas HTTP.
- No se añadirá framework de monorepo, ORM alternativo, librería de formularios, estado o PDF adicional.

## Plan de ejecución

| Fase | Entregables y puerta de salida |
|---|---|
| 1. Análisis | Arquitectura, diagramas, modelo ER, estructura, dependencias, decisiones, riesgos y datos comerciales pendientes. |
| 2. Entorno | Esqueletos Angular/Express funcionales, scripts, configuración validada, Docker Compose y conexión básica a PostgreSQL. Verificar instalación y compilación. |
| 3. Base de datos | Esquema Prisma, migración versionada, seed idempotente protegido por variables de entorno y pruebas de integridad/conexión. |
| 4. Backend | Infraestructura, autenticación/roles, CRUDs, cotizaciones/cálculos/estados, PDF, dashboard, reportes y configuración con pruebas API. |
| 5. Frontend | Tema accesible, layout adaptable, autenticación y features conectadas a servicios/guards, formularios, estados de carga/error/vacío. |
| 6. Integración | Flujos completos, control de permisos, datos persistidos, cálculos y descarga PDF verificados entre navegador y API. |
| 7. Pruebas | Unitarias, integración, flujo principal, casos negativos, seguridad y tamaños responsive; corregir todo fallo bloqueante. |
| 8. Documentación y entrega | README, API/OpenAPI, diagramas, modelo de datos, manual, configuración local y despliegue/respaldo. |

Cada fase se valida antes de su commit y push. Un commit representa un único cambio lógico; nunca se incluyen `.env`, `.progress`, prompt, credenciales ni herramientas locales.

## Riesgos y mitigación

- **Versiones incompatibles:** verificar requisitos oficiales de Node/Angular/Prisma y peer dependencies antes de instalar; fijar versiones exactas en manifests y lockfiles.
- **Dependencia de infraestructura:** mantener Docker Compose como entorno local reproducible, con healthcheck y volumen; no sustituir la persistencia PostgreSQL por memoria.
- **Alcance elevado:** priorizar cortes verticales que funcionen de extremo a extremo y no marcar módulos terminados sin pruebas.
- **Datos comerciales no proporcionados:** aislarlos en configuración y listar bloqueos operativos en `datos-pendientes.md`.
- **Integración de reportes:** usar datos de cotizaciones reales y mantener separado el valor cotizado del ingreso facturado.
