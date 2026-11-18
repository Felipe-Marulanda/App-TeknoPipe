# Arquitectura inicial

## Propósito y alcance

TEKNOPIPE centraliza clientes, catálogo y cotizaciones para reducir tiempos y errores de elaboración y proporcionar trazabilidad. El producto será una aplicación web empresarial con persistencia real, autorización en el servidor, cálculos monetarios reproducibles y generación de PDF desde datos guardados.

El alcance funcional comprende autenticación, usuarios y roles, dashboard, clientes, categorías, productos, cotizaciones, historial, reportes, configuración y PDF. La facturación y el registro de ventas no forman parte del alcance; una cotización aprobada no se contabiliza como una venta.

## Restricciones

- Frontend Angular standalone con Angular Material, TypeScript, SCSS, Router, Reactive Forms, HttpClient y RxJS.
- API REST modular con Express y TypeScript; Prisma y PostgreSQL para persistencia.
- Validación de entrada con Zod; PDF generado con PDFMake.
- Repositorio único, frontend y backend desplegables de forma independiente.
- La interfaz nunca se conecta directamente a PostgreSQL.
- La identidad comercial no suministrada se mantendrá configurable y se documentará como pendiente.

## Componentes

```mermaid
flowchart LR
    Browser[ navegador ]
    subgraph Frontend[Frontend Angular]
        UI[Layout y features]
        Core[Guards, interceptor y servicios]
    end
    subgraph Backend[API Express /api/v1]
        Routes[Rutas y validación Zod]
        Controllers[Controladores]
        Services[Servicios de dominio]
        Repositories[Repositorios Prisma]
        Auth[Autenticación y autorización]
        Pdf[Servicio PDFMake]
    end
    DB[(PostgreSQL)]
    Browser --> UI --> Core
    Core -->|HTTPS / JSON| Routes
    Routes --> Controllers --> Services
    Controllers --> Auth
    Services --> Repositories --> DB
    Services --> Pdf
    Pdf -->|PDF| Core
```

### Responsabilidades

- **Frontend:** presentación, navegación, validaciones de experiencia de usuario, solicitudes HTTP y visualización de errores, cargas y estados vacíos. Los datos y cálculos enviados por el cliente nunca se consideran fuente de verdad.
- **Rutas y controladores:** adaptan HTTP al dominio, validan parámetros y cuerpos, extraen la identidad autenticada y producen respuestas consistentes.
- **Servicios:** aplican permisos, reglas de negocio, transiciones de estado y cálculos; coordinan transacciones para operaciones multi-tabla.
- **Repositorios:** concentran consultas Prisma y evitan acoplar las reglas de dominio a consultas HTTP.
- **PostgreSQL:** fuente de verdad para cuentas, catálogo, configuración, cotizaciones y trazabilidad.

## Despliegue local y destino

En desarrollo, Docker Compose ejecutará PostgreSQL con volumen persistente y comprobación de salud. Angular y Express se ejecutarán como procesos separados, usando variables de entorno locales. En despliegue, frontend, API y PostgreSQL se publican por separado; la base de datos no se expone al navegador ni a Internet. Las credenciales y secretos se suministran por el entorno, nunca por archivos versionados.

```mermaid
flowchart TB
    Client[Navegador]
    Web[Frontend Angular estático]
    API[API Node.js / Express]
    DB[(PostgreSQL administrado o privado)]
    Client -->|HTTPS| Web
    Client -->|HTTPS /api/v1| API
    API -->|red privada| DB
```

## Flujo de creación de cotización

```mermaid
sequenceDiagram
    actor E as Empleado
    participant F as Angular
    participant A as API Express
    participant S as Servicio de cotizaciones
    participant P as Prisma
    participant D as PostgreSQL
    E->>F: Selecciona cliente, productos y cantidades
    F->>A: POST /api/v1/quotations
    A->>A: Autentica, autoriza y valida con Zod
    A->>S: Solicitud validada
    S->>P: Transacción: leer catálogo y configuración
    P->>D: Consultar cliente, productos y tasa vigente
    D-->>P: Datos actuales
    P-->>S: Datos verificados
    S->>S: Capturar snapshots y recalcular importes
    S->>P: Insertar cotización, líneas e historial
    P->>D: COMMIT
    D-->>P: Registros persistidos
    P-->>A: Cotización canónica
    A-->>F: 201 + cotización persistida
    F-->>E: Resumen confirmado
```

## Seguridad y límites de confianza

Todo endpoint privado verifica el token y el permiso en el backend. Las consultas de empleados se limitan a recursos autorizados; los administradores tienen acceso general. Los secretos se validan al inicio con esquema de entorno. Helmet, CORS con orígenes permitidos, limitación de intentos de login y errores sin detalles internos forman parte de la configuración de API. Ver [decisiones técnicas](./decisiones.md).

## Riesgos iniciales

| Riesgo | Tratamiento |
|---|---|
| Pérdida de exactitud monetaria | Decimal en base de datos y servicio; redondeo explícito y pruebas de límites. |
| Edición del catálogo que cambie el pasado | Snapshots por línea y tasa impositiva capturada al crear la cotización. |
| Cotizaciones vistas o alteradas por usuarios no autorizados | Autorización por rol y propiedad comprobada en cada operación del backend. |
| Colisión de números bajo solicitudes simultáneas | Asignación transaccional/atómica respaldada por restricción única en PostgreSQL. |
| Cambios silenciosos en cotizaciones enviadas | Solo borradores editables; revisiones identificadas y enlazadas al original. |
| Datos comerciales desconocidos | Configuración provisional sin inventar dirección, NIT ni contacto; completar antes del despliegue. |
| Exposición de credenciales | `.env` ignorado, `.env.example` sin secretos y configuración validada al arrancar. |
