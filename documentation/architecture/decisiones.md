# Decisiones técnicas

Las decisiones derivan de los requisitos del proyecto. La línea base de versiones se seleccionó en Fase 2 verificando disponibilidad estable y compatibilidad entre Angular, Node y Prisma.

## Línea base validada en Fase 2

- Node.js `26.8.1` y npm `11.19.0`, presentes en el entorno.
- Angular `22.2.6`, CLI/build `22.2.7`, Material/CDK `22.3.0`, TypeScript `6.0.3` y RxJS `7.8.2`. El compilador Angular requiere TypeScript `>=6.0 <6.1`; por eso no se usa TypeScript 7 aunque exista una versión más nueva.
- Express `5.3.0`, Prisma/Client/adapter PostgreSQL `7.10.1`, `pg` `8.23.1`, Zod `4.6.7`, Vitest `5.1.1` y PDFMake `0.3.14`, además de middleware y herramientas fijados en sus manifests/lockfiles.
- PostgreSQL `17-alpine` en Docker Compose, con volumen persistente, puerto enlazado solo a loopback y healthcheck.
- Prisma `8.0.0-rc.34` era la etiqueta `latest` consultada, no una versión estable; se seleccionó `7.10.1`.

Las versiones instaladas pasaron compilación, lint, pruebas y `npm audit` sin vulnerabilidades reportadas en esta línea base.

## D-001 — Monolito modular con API REST

**Decisión:** un backend Express modular en `backend/`, un frontend Angular en `frontend/` y PostgreSQL como persistencia. Los módulos comparten proceso, pero separan routes, controllers, services, repositories, validation y types.

**Motivo:** satisface el flujo Angular → API → servicios → Prisma → PostgreSQL y mantiene el despliegue sencillo sin acoplar las reglas a un servidor monolítico de rutas.

## D-002 — Unicidad y autorización de roles

**Decisión:** roles persistidos (`ADMINISTRADOR`, `EMPLEADO`) con verificación centralizada en backend. Los empleados consultan cotizaciones propias; administradores consultan todas. Recursos desactivados se conservan.

**Motivo:** implementa mínimo privilegio y evita que ocultar controles en Angular se convierta en autorización.

## D-003 — Sesiones JWT renovables y revocables

**Decisión:** access JWT de corta duración y token de renovación aleatorio rotatorio en cookie `HttpOnly`, `Secure` en producción y política `SameSite` acorde al despliegue. Guardar solo el hash del refresh token en `user_sessions`; access token en memoria del cliente, nunca en `localStorage`. Logout revoca la sesión y elimina la cookie. Limitar login y proteger renovación contra CSRF/orígenes no autorizados.

**Motivo:** permite expiración, renovación y cierre de sesión efectivo sin persistir tokens portadores en almacenamiento accesible a scripts.

## D-004 — Dinero en Decimal y cálculo autoritativo en servidor

**Decisión:** cantidades, tasas e importes se manejan con decimal exacto de precisión y escala documentadas. El backend obtiene precio y tasa vigentes, valida catálogo, recalcula líneas y total, y persiste los resultados. El frontend muestra una vista previa, no determina el total canónico.

**Regla de redondeo propuesta:** redondear cada importe de línea a dos decimales usando half-up; sumar líneas ya redondeadas; calcular el impuesto por línea sobre su base gravada y redondearlo a dos decimales; subtotal, impuesto y total general son sumas de esos valores. Pruebas cubrirán límites y residuos decimales antes de aceptar la regla como implementación.

**Motivo:** evita errores binarios de `float`, discrepancias entre renglones y totales, y cambios retroactivos por modificaciones al catálogo.

## D-005 — Snapshots y revisión, no mutación histórica

**Decisión:** una cotización en `BORRADOR` es editable; al enviarse/aprobarse/rechazarse no se edita en silencio. La revisión crea un nuevo borrador con número propio, snapshots copiados y enlace a la versión anterior. Los cambios de estado generan historia append-only.

**Motivo:** preserva evidencia y permite auditar tanto el documento original como las revisiones.

## D-006 — Transiciones controladas

**Decisión:** grafo inicial:

```text
BORRADOR  -> PENDIENTE
PENDIENTE -> ENVIADA | VENCIDA
ENVIADA   -> APROBADA | RECHAZADA | VENCIDA
```

`APROBADA`, `RECHAZADA` y `VENCIDA` son estados terminales. Vencer solo se permite cuando la fecha de vencimiento pasó y lo ejecuta una operación explícita del servicio; no se confía en un job no especificado. La emisión registra actor, hora y observación. Se podrá revisar cualquiera de estos estados mediante un nuevo borrador enlazado, nunca cambiando el registro terminado.

Los empleados pueden avanzar sus cotizaciones de `BORRADOR` a `PENDIENTE` y de `PENDIENTE` a `ENVIADA`; solo administradores pueden aprobar, rechazar o marcar vencimiento. Solo se puede editar un borrador. Una revisión crea un nuevo borrador con snapshots originales y número consecutivo, enlazado a la cotización inicial.

**Motivo:** da significado operacional a los seis estados y bloquea saltos arbitrarios.

## D-007 — Numeración concurrente

**Decisión:** asignar el número dentro de la transacción con mecanismo atómico respaldado por PostgreSQL y restricción `UNIQUE`. El prefijo se toma de configuración. Se aceptan huecos numéricos si una transacción falla; no se reutilizan números emitidos.

**Motivo:** evitar colisiones bajo concurrencia y evitar que el número dependa del navegador.

## D-008 — PDF generado desde cotización persistida

**Decisión:** PDFMake se ejecuta en el backend y obtiene solo la cotización almacenada, incluyendo snapshots. La API entrega `application/pdf`; Angular permite descargarlo. La plantilla usa configuración de empresa y marcadores claramente visibles cuando no se ha configurado información. El logotipo se almacena como PNG embebido en URI de datos, validado por firma, dimensiones y tamaño; se bloquean recursos remotos y acceso a archivos fuera de las fuentes empaquetadas para evitar SSRF y lectura local arbitraria.

**Motivo:** el archivo coincide con el documento histórico y no permite falsificar importes desde el cliente.

## D-009 — Contrato de API uniforme

**Decisión:** API versionada bajo `/api/v1`; errores con código estable, mensaje público y detalles de validación solo cuando sean seguros. Paginación y filtros se ejecutan en PostgreSQL. OpenAPI se genera/documenta en la implementación sin duplicar la validación Zod.

**Motivo:** mantiene clientes API compatibles y facilita pruebas y documentación.

## D-010 — Validación y pruebas

**Decisión:** Zod para entorno y entradas HTTP; pruebas unitarias de dominio, integración contra PostgreSQL y pruebas de UI/API según las herramientas compatibles seleccionadas en Fase 2.

**Motivo:** valida límites en el servidor y evita depender de mocks para afirmar persistencia.
