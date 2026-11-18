# Modelo entidad-relación

El modelo conserva los datos históricos de las cotizaciones aunque el catálogo o los datos de contacto cambien. La implementación versionada está en [`schema.prisma`](../../backend/prisma/schema.prisma) y su migración inicial en `backend/prisma/migrations/`.

```mermaid
erDiagram
    ROLES ||--o{ USERS : asigna
    USERS ||--o{ QUOTATIONS : crea
    CLIENTS ||--o{ QUOTATIONS : recibe
    CATEGORIES o|--o{ PRODUCTS : clasifica
    QUOTATIONS ||--|{ QUOTATION_ITEMS : contiene
    PRODUCTS ||--o{ QUOTATION_ITEMS : referencia
    QUOTATIONS ||--o{ QUOTATION_STATUS_HISTORY : registra
    USERS ||--o{ QUOTATION_STATUS_HISTORY : cambia
    QUOTATIONS o|--o{ QUOTATIONS : revisa
    USERS ||--o{ USER_SESSIONS : autentica

    ROLES {
        uuid id PK
        string name UK
        string description
    }
    USERS {
        uuid id PK
        uuid role_id FK
        string email UK
        string password_hash
        string full_name
        boolean active
        datetime created_at
        datetime updated_at
    }
    USER_SESSIONS {
        uuid id PK
        uuid user_id FK
        string refresh_token_hash UK
        datetime expires_at
        datetime revoked_at
        datetime created_at
    }
    CLIENTS {
        uuid id PK
        string identification_type
        string identification_number
        string legal_name
        string contact_name
        string email
        string phone
        string address
        string city
        string department
        boolean active
        datetime created_at
        datetime updated_at
    }
    CATEGORIES {
        uuid id PK
        string name UK
        string description
        boolean active
        datetime created_at
        datetime updated_at
    }
    PRODUCTS {
        uuid id PK
        uuid category_id FK
        string reference UK
        string name
        string description
        string unit
        decimal unit_price
        boolean active
        datetime created_at
        datetime updated_at
    }
    QUOTATIONS {
        uuid id PK
        uuid client_id FK
        uuid created_by_id FK
        uuid revision_of_id FK
        int revision_number
        string number UK
        string status
        date issue_date
        date expiration_date
        string client_identification_type
        string client_name_snapshot
        string client_identification_snapshot
        string client_contact_snapshot
        string client_email_snapshot
        string client_phone_snapshot
        string client_address_snapshot
        string client_city_snapshot
        string client_department_snapshot
        decimal tax_rate
        decimal subtotal
        decimal discount_total
        decimal tax_total
        decimal total
        string currency
        string observations
        string commercial_terms
        datetime created_at
        datetime updated_at
    }
    QUOTATION_ITEMS {
        uuid id PK
        uuid quotation_id FK
        uuid product_id FK
        int line_number
        string product_reference_snapshot
        string product_name_snapshot
        string description_snapshot
        string unit_snapshot
        decimal quantity
        decimal unit_price
        decimal subtotal
        decimal discount_amount
        decimal taxable_base
        decimal tax_rate
        decimal tax_amount
        decimal total
    }
    QUOTATION_STATUS_HISTORY {
        uuid id PK
        uuid quotation_id FK
        uuid changed_by_id FK
        string previous_status
        string new_status
        string observation
        datetime changed_at
    }
    COMPANY_SETTINGS {
        int id PK
        string commercial_name
        string tax_identification
        text logo_data
        string email
        string phone
        string address
        string currency
        decimal tax_rate
        int default_validity_days
        string default_terms
        boolean discounts_enabled
        string quotation_prefix
        datetime updated_at
    }
    QUOTATION_COUNTERS {
        int year PK
        int last_number
        datetime updated_at
    }
```

## Entidades y reglas

- **Role / User:** roles únicos `ADMINISTRADOR` y `EMPLEADO`; usuario con correo normalizado único, hash de contraseña, estado activo y rol requerido. El primer administrador se crea por seed controlado, sin registro público.
- **UserSession:** extensión necesaria para revocar sesiones y renovar tokens. Solo almacena el hash del token de renovación, su vencimiento y revocación.
- **Client:** identificación normalizada y única por tipo y número. Desactivación lógica; no se elimina si tiene cotizaciones relacionadas.
- **Category / Product:** referencia/código único; precio no negativo; producto asociado opcionalmente a categoría. Las asociaciones históricas no autorizan usar productos inactivos en cotizaciones nuevas.
- **Quotation:** número único, cliente y usuario obligatorios, valores calculados en backend, estado explícito, tasa e importe capturados, moneda/condiciones y datos del cliente congelados. `revision_of_id` enlaza una nueva cotización con la versión anterior; las originales no se sobrescriben.
- **QuotationItem:** cada línea conserva referencia, nombre, descripción, unidad, precio, cantidad e impuesto aplicados. `product_id` es referencia al catálogo actual, pero no se usa para reconstruir el documento histórico.
- **QuotationStatusHistory:** registro de solo inserción para cada transición, incluyendo estado anterior/nuevo, actor, fecha y observación.
- **CompanySettings:** configuración singleton con valores comerciales y reglas vigentes. El logotipo opcional se almacena como URI de datos PNG validado y se limita por bytes y dimensiones. Cambios futuros no se propagan a cotizaciones ya creadas.
- **QuotationCounter:** contador por año actualizado atómicamente por PostgreSQL para asignar números sin colisiones; los números emitidos no se reutilizan.

## Integridad, tipos y consultas

- Identificadores UUID para entidades transaccionales y claves foráneas con borrado restrictivo donde borrar rompería historia.
- Importes en `Decimal` de precisión fija en Prisma/PostgreSQL; cantidad con escala decimal acotada. No usar `float` para moneda.
- Índices/únicos en correo de usuario, identificación de cliente, referencia de producto, nombre de categoría y número/estado/fechas/cliente/creador de cotización.
- Índices compuestos para listado paginado y filtrado de cotizaciones (estado, fecha y creador) y búsqueda normalizada por cliente.
- `created_at` y `updated_at` en registros editables; historial append-only para cambios de estado.
- La migración agrega `CHECK` de email normalizado, valores requeridos, importes/descuentos/tasas, fechas, vigencia de configuración y contador positivo. La API además exige al menos una línea por cotización.
- Crear una cotización junto a sus detalles e historial inicial dentro de una transacción. Actualizaciones de estado y su historial también son atómicas.
- La migración de base de datos será versionada; no se usará `db push` como sustituto de migraciones en entornos compartidos.
