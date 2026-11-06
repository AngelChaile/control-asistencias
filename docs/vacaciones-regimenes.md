# Vacaciones por planta, partición y categoría

## Reglas

La fuente es `VACACIONES SEGUN CATEGORIAS.xlsx`, hoja `Hoja1`, rango `A1:D132`: 131 combinaciones (82 hábiles y 49 corridas). El catálogo de la aplicación está en `src/data/vacacionesCategorias.json`, con la fila y el SHA-256 del original para trazabilidad. No contiene legajos ni se requiere acceder a Canaima desde producción.

Primero se compara la combinación de planta (`tipoCargo`), partición (`particion`) y categoría (`categoria`). Si la planta es reconocida y no hay una fila exacta, se aplica el formato de esa categoría en la misma partición cuando todas sus filas coinciden, según confirmó RRHH. Se conserva la planta real del agente y la fila consultada. Se normalizan tildes, mayúsculas y espacios y se reconocen los códigos de los formularios.

El selector de Empleados incluye también las categorías informadas para el padrón. Si la categoría carece de una regla aplicable o las referencias de la misma partición tienen formatos distintos, RRHH debe confirmar el régimen antes de calcular.

Confirmación de RRHH del 03/11/2026:

- Municipal conserva 14/21/28/35 días por antigüedad, contados en el formato indicado por la planilla.
- Se mantienen las escalas existentes de Médico, Docente y Radiólogo. El régimen de Radiólogo no figura en este Excel y conserva su configuración previa explícita.
- Los cambios se calculan por tramo: días anuales × meses / 12, redondeando cada tramo al entero más cercano. Por eso dos tramos de 10,5 días se redondean individualmente a 11, como en la lógica anterior.
- Los días hábiles y corridos se acumulan y descuentan por separado.

## Uso

1. Buscar el legajo: se muestran planta, partición, categoría y formato de días. Si los datos están incompletos, corregirlos desde Empleados y buscar de nuevo.
2. Si hubo un cambio durante el año, marcar «Cambio de categoría, planta o convenio», indicar la combinación anterior y los meses de cada situación. El Excel no aporta el historial ni las fechas de cada agente, por lo que no se inventan ni se deducen del cargo actual. Para un agente que trabajó todo el año deben sumar 12 meses.
3. Calcular y consultar saldo. Se muestran por separado el derecho, los días aprobados y los disponibles de cada formato.
4. Cada solicitud usa un único saldo, seleccionado en «Saldo del que se descontará esta solicitud». Para utilizar ambos formatos se generan solicitudes con fechas propias; no se convierten unas unidades en otras.
5. RRHH aprueba o rechaza desde el listado. La aprobación descuenta atómicamente del saldo correspondiente. La solicitud pendiente no reserva días; la aprobación vuelve a validar el saldo.

Al volver a buscar un legajo se recupera la última configuración especial aprobada de ese año. Así una nueva solicitud conserva los meses y los proporcionales aprobados y no vuelve a asignar el año completo al régimen actual. El guardado y la aprobación también comprueban esa configuración para proteger solicitudes abiertas antes de la aprobación del cambio.

El conteo hábil usa un calendario común. Excluye fines de semana, feriados fijos, Carnaval, Jueves y Viernes Santo, feriados trasladados y días turísticos publicados. Se consultan los años de las fechas de la licencia, incluso si el período vacacional es anterior.

Las excepciones están en `src/utils/calendarioVacacional.mjs`. El calendario incluye los puentes nacionales publicados de 2020 a 2026 y las fechas extraordinarias verificadas, entre ellas las del [Decreto 1103/2026](https://www.argentina.gob.ar/normativa/nacional/norma-430580/texto) y el [aniversario de Morón de 2026](https://normas.gba.gob.ar/anexos/descargar/2B3YrlJ0.pdf). Los nuevos puentes, traslados discrecionales y asuetos municipales requieren incorporar la fecha oficial. El formulario identifica los años cuyos puentes aún no están cargados. [Calendario nacional](https://www.argentina.gob.ar/feriados) · [Resolución de días turísticos de 2026](https://www.argentina.gob.ar/normativa/nacional/norma-421799/texto).

Si cambia el conteo de una solicitud hábil pendiente, RRHH ve la cantidad vigente antes de aprobar. La solicitud conserva la cantidad original y registra la cantidad efectivamente descontada. Los saldos históricos usan los días que se descontaron al aprobar.

## Solicitudes anteriores

Se conservan y descuentan según el `tipoDias` con el que fueron registradas, sin reclasificarlas con el cargo actual. En la primera aprobación del esquema nuevo se reconstruyen los usados por tipo desde las solicitudes aprobadas del mismo legajo y año. Si una solicitud histórica carece de formato, se informa para revisión de RRHH, en vez de asumir un saldo completo.

Las solicitudes nuevas guardan `versionRegimen: 2`, los perfiles anterior/actual, meses, desglose y `diasPorTipo`. El campo numérico `diasCorresponden` representa el derecho del formato elegido en esa solicitud. En un cálculo mixto no se genera un total que sume unidades incompatibles.

El documento `saldosVacaciones/vacaciones_<legajo>_<año>` conserva `diasUsadosPorTipo` para serializar las aprobaciones de ambos tipos. No se ejecuta una migración masiva ni se cambian empleados o aprobaciones existentes al desplegar.

## Comprobación

```powershell
npm run test:vacaciones
npm run build
```

Las pruebas cubren catálogo, límites de antigüedad, cambios dentro de Municipal y hacia Docente, redondeos, meses inválidos, rango hábil/corrido, pendientes/rechazadas, saldos agotados, solicitudes históricas y aprobaciones concurrentes con un SDK simulado. Las pruebas no se conectan a Firebase de producción.
