# Asistente de trabajo

Primera versión local, sin proveedor de IA, claves de IA ni envío de consultas o legajos a terceros. Las consultas de datos generan lecturas habituales de Firestore. No se guardan conversaciones.

## Consultas disponibles

- Convenios: búsqueda de pasajes por tema, sinónimos comunes o número de artículo municipal. Se cita convenio y página PDF y se permite leer el pasaje completo. Se mantienen separados los convenios.
- Personal: área exacta, situación de revista (`tipoCargo`), función y localidad de residencia explícita (`localidad`). Activos por defecto. Los resultados se paginan de 25 en 25.
- Ausencias: días únicos por legajo y fecha en `ausencias`, para el mes seleccionado. Incluye ausencias justificadas e injustificadas y conserva empates. No equipara falta de fichada con inasistencia ni calcula días no cargados.

RRHH y Subsecretaría consultan todas las áreas. Admin consulta sólo su `lugarTrabajo` asignado, con filtro en la consulta a Firestore. Los coordinadores de traspasos sólo consultan convenios. Empleados no tienen habilitado este módulo.

Antes de leer datos se vuelve a consultar el perfil autenticado en `users`. Las reglas de Firestore siguen siendo la autoridad de seguridad: deben permitir lectura global de `empleados` y `ausencias` a RRHH/Subsecretaría y lectura por `lugarTrabajo` a admin, protegiendo además la edición de roles en `users`. La protección de ruta y los filtros del cliente no sustituyen esas reglas. Este repositorio no contiene las reglas desplegadas; no se modifican desde este módulo.

La consulta se detiene si excede 5.000 registros del ámbito consultado para no mostrar conteos incompletos. En ese caso se pide acotar por área. Si el volumen requiere consultar más de 5.000 ausencias de una sola área, el siguiente paso es normalizar `fecha` a ISO e indexar/paginar por mes en servidor.

## Fuentes y mantenimiento

`src/data/convenios/municipal.json`: 57 páginas extraídas del PDF entregado.
`src/data/convenios/medico.json`: 26 páginas reconocidas con OCR local de Windows en español. El OCR puede confundir letras, cifras y ordinales; se cita la página, sin deducir numeración de artículos médicos. Las respuestas son pasajes del documento, no interpretaciones ni certificaciones de vigencia.

Cada índice conserva nombre y SHA-256 del PDF fuente. Los PDF originales no se copian a la carpeta pública. Para contrastar el texto, consultar la misma página en el original de RRHH. Las copias aportadas deben ser las versiones vigentes; para ampliar la base se necesita el convenio docente y las modificaciones/anexos que RRHH confirme aplicables.

Para actualizar un PDF con texto, usando Python con `pypdf`:

```powershell
python scripts/importar_convenio.py "ruta/al/convenio.pdf" src/data/convenios/municipal.json --id municipal --titulo "Convenio Colectivo Municipal"
```

Para actualizar el escaneo médico, Windows PowerShell 5.1 y OCR español de Windows:

```powershell
powershell.exe -NoProfile -File scripts/importar_convenio_ocr.ps1 -Pdf "C:\ruta\CONVENIO MEDICO.pdf" -Salida "$PWD\src\data\convenios\medico.json"
```

La localidad no se infiere del domicilio libre. Se agregó el campo opcional al alta/edición de empleados de RRHH y Admin. Los registros existentes sin ese dato se informan como incompletos al consultar; no se modifican automáticamente.

## Verificación

```powershell
node --test scripts/asistente.test.mjs
node node_modules/vite/bin/vite.js build
```

Prueba con usuarios reales: RRHH consulta temporarios de un área; admin verifica que sólo ve la propia; coordinador accede únicamente a convenios. Comparar el ranking con las ausencias registradas del mes, incluyendo empates. Repetir sin permisos de lectura para comprobar que se informa el error y no un resultado vacío.
