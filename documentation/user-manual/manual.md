# Manual de usuario

## Primer ingreso

El administrador inicial se crea desde el proceso de seed, usando `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y, opcionalmente, `SEED_ADMIN_NAME` en el entorno del backend. Inicia sesión en la aplicación. No existe registro público de administradores.

Antes de emitir documentos comerciales, abre **Configuración** y registra los datos autorizados de la empresa, moneda, tasa de IVA, vigencia, condiciones comerciales y prefijo de numeración. Carga únicamente un logotipo oficial. Si estos datos no están disponibles, deja los campos vacíos; consulta la lista de [datos pendientes](../architecture/datos-pendientes.md).

## Clientes y catálogo

1. En **Clientes**, crea el registro con tipo y número de identificación y razón social. Completa los datos de contacto que tengas. La identificación se normaliza y debe ser única.
2. En **Categorías**, registra las categorías que necesite el catálogo. La categoría es opcional para un producto.
3. En **Productos**, agrega referencia, nombre, unidad, precio y categoría. Los productos inactivos no se pueden añadir a cotizaciones nuevas.

Los registros se desactivan para conservar la trazabilidad. Los cambios de precio o descripción no modifican documentos ya guardados.

## Crear y revisar una cotización

1. Abre **Cotizaciones** y selecciona **Nueva cotización**.
2. Selecciona el cliente, fecha de vencimiento, observaciones y condiciones comerciales.
3. Añade una o varias líneas. Selecciona cada producto y define una cantidad positiva. Si la configuración permite descuentos, indica el valor correspondiente.
4. Revisa el resumen y guarda. El servidor consulta precios/configuración vigentes, vuelve a calcular y persiste la cotización, sus líneas y el primer evento de historial en una transacción.
5. Abre el detalle para consultar totales, historial, descargar PDF o avanzar el estado según tus permisos.

El subtotal de cada línea es cantidad por precio unitario. El backend aplica el redondeo monetario por línea definido en [decisiones técnicas](../architecture/decisiones.md); el IVA queda capturado en cada cotización. El PDF se genera desde los snapshots persistidos de cliente y productos.

## Estados y revisiones

Las transiciones válidas están restringidas por el backend:

```text
BORRADOR → PENDIENTE → ENVIADA → APROBADA
                                 ↘ RECHAZADA
PENDIENTE o ENVIADA → VENCIDA (cuando ya pasó la vigencia)
PENDIENTE → BORRADOR (administrador, con observación)
```

El empleado puede pasar sus borradores a pendientes. Solo el administrador puede marcar una pendiente como enviada o devolverla a borrador; para devolverla debe indicar una observación. La aprobación, rechazo y vencimiento pueden realizarlos el empleado o administrador que tenga acceso a esa cotización. Cada transición guarda el estado anterior y nuevo, actor, fecha y, cuando se indica, la observación. Solo los borradores pueden editarse. Para cambiar una cotización ya emitida, crea una revisión; queda como nuevo borrador enlazado a su antecedente.

## Historial, dashboard y reportes

- **Dashboard** presenta conteos y valores almacenados, cotizaciones recientes y actividad disponible para el usuario.
- **Historial** permite buscar cotizaciones autorizadas y revisar su estado, fechas y detalle.
- **Informes** permite filtrar por periodo y exportar CSV. El valor mostrado es valor cotizado; el sistema no registra facturación ni calcula ventas.
- Los empleados consultan las cotizaciones propias y las funciones habilitadas para su rol. Usuarios, configuración e informes están restringidos al administrador.

## Sesión y acceso

La sesión se renueva automáticamente mientras el refresh token sea válido. **Cerrar sesión** revoca la sesión actual. Si el token expira o la cuenta se desactiva, inicia sesión nuevamente o solicita al administrador que revise el estado de la cuenta.

## Ayuda operativa

- Si un producto no aparece al crear una cotización, confirma que esté activo.
- Si no puedes editar una cotización, verifica que siga en estado `BORRADOR`; usa **Duplicar/Revisar** cuando ya fue emitida.
- Un error de identificación duplicada indica que el cliente ya está registrado.
- Si el PDF muestra campos comerciales vacíos, completa **Configuración** y genera el documento desde la cotización almacenada.
- Para errores de conexión, confirma que PostgreSQL, API y frontend estén iniciados y que `DATABASE_URL` y `CORS_ORIGIN` correspondan al entorno.
