# Diccionario de datos

El esquema ejecutable está en [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma), con restricciones de PostgreSQL en migraciones versionadas. Los importes se almacenan como `Decimal`; los borrados que rompen trazabilidad se restringen.

| Tabla                      | Propósito y campos relevantes                                                                                                   | Integridad e índices                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `roles`                    | Roles autorizados y descripción.                                                                                                | Nombre único; relación uno a muchos con usuarios.                                                  |
| `users`                    | Correo, nombre, hash bcrypt, rol, estado y timestamps.                                                                          | Correo normalizado único; FK a rol e índice por estado/rol.                                        |
| `user_sessions`            | Hash del refresh token, usuario, vencimiento y revocación.                                                                      | Hash único; FK a usuario; el token original no se almacena.                                        |
| `clients`                  | Identificación, razón social, contacto, email, teléfono, dirección, ciudad, departamento y estado.                              | Unicidad por tipo y número normalizados; índice por nombre.                                        |
| `categories`               | Nombre, descripción, estado y timestamps.                                                                                       | Nombre único; no se elimina mientras tenga productos asociados.                                    |
| `products`                 | Referencia, nombre, descripción, categoría, unidad, precio y estado.                                                            | Referencia única; precio no negativo; FK opcional a categoría.                                     |
| `quotations`               | Número, cliente, creador, revisión antecedente, estado, fechas, snapshots de cliente, moneda, tasa y totales.                   | Número único; FKs restrictivas; índices para número, estado, fechas, cliente y creador.            |
| `quotation_items`          | Número de línea, referencia/nombre/descripción/unidad snapshot, cantidad, precio, descuento, base, tasa, impuesto y total.      | FK a cotización y producto; cantidades/precios acotados; conserva el contenido comercial original. |
| `quotation_status_history` | Cotización, actor, estado anterior/nuevo, observación y fecha.                                                                  | FKs; índices por cotización/fecha y usuario; registros append-only desde el flujo de negocio.      |
| `company_settings`         | Configuración singleton de empresa, identidad fiscal, contacto, logo, moneda, IVA, vigencia, términos, descuentos y numeración. | PK fija `1`, tasa y parámetros validados.                                                          |
| `quotation_counters`       | Último consecutivo emitido por año.                                                                                             | Año como PK; contador positivo actualizado atómicamente.                                           |

## Relaciones principales

- Un rol tiene usuarios; un usuario crea cotizaciones y sesiones.
- Un cliente recibe cotizaciones; una categoría clasifica productos.
- Una cotización contiene líneas y eventos de estado. Puede enlazarse a una versión anterior.
- Cada línea referencia un producto actual, pero el PDF histórico se construye desde sus snapshots.
- La configuración vigente solo afecta nuevas cotizaciones; no reescribe las existentes.

El detalle entidad-relación y las reglas de negocio están en el [modelo ER](../architecture/modelo-er.md). Las claves y tipos exactos se mantienen en Prisma y en la migración, evitando duplicar aquí un esquema que pudiera divergir.
