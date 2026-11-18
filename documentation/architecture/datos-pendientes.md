# Datos empresariales pendientes

No se inventan datos legales ni de contacto. Estos valores deben configurarse antes de generar cotizaciones para clientes o desplegar el sistema en producción.

| Dato | Tratamiento provisional |
|---|---|
| Razón social / nombre comercial oficial | Se muestra el nombre de producto TEKNOPIPE hasta que un administrador configure el nombre comercial autorizado. |
| NIT o identificación fiscal | Vacío; no se imprime un valor ficticio. |
| Logotipo | Sin imagen predeterminada; el PDF omite el espacio o muestra un marcador configurable, nunca un logo inventado. |
| Teléfono, correo, dirección, ciudad y departamento | Vacíos hasta ser configurados. |
| Moneda | Propuesta inicial: COP, conforme al formato monetario colombiano solicitado; debe confirmarse antes de operación comercial. |
| Tasa de IVA | 19 % inicial, definida en el requerimiento y administrable; cada cotización conserva la tasa aplicada. |
| Vigencia predeterminada | Pendiente de decisión del administrador; debe configurarse antes de emitir cotizaciones. |
| Condiciones comerciales | Pendientes; no se inventan cláusulas. |
| Prefijo y formato de numeración | Propuesta configurable `COT`; confirmar formato interno antes de producción. |
| Datos de primer administrador | Se suministran solo mediante variables de entorno locales seguras al ejecutar el seed. No se incluyen credenciales en Git ni en documentación. |

## Requisitos para completar

1. Cargar nombre oficial, identificación tributaria y datos de contacto en Configuración.
2. Cargar el logotipo autorizado y validar legibilidad/contraste en el PDF.
3. Confirmar moneda, vigencia, términos comerciales y prefijo de numeración.
4. Crear el primer administrador con credenciales iniciales entregadas por canal seguro y rotarlas tras el primer acceso.
