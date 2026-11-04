# Activación de perfiles UID, fichaje por API y reglas

El código se entrega con `VITE_SEGURIDAD_ACTIVA=false` por defecto para no interrumpir los QR mientras se configuran las credenciales. En ese estado el QR todavía usa el acceso anterior: **no es la configuración definitiva**. El modo seguro se activa explícitamente y nunca vuelve al acceso público si falla una API.

## 1. Configurar el servidor en Vercel

En Firebase, Configuración del proyecto → Cuentas de servicio → Firebase Admin SDK, obtener la credencial de una cuenta de servicio con acceso a Firestore y Firebase Authentication. Guardar el archivo fuera del repositorio. Esta credencial es privada; no se comparte por chat ni se sube a GitHub.

En Vercel → proyecto → Settings → Environment Variables:

| Nombre | Valor | Entorno |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenido JSON completo del archivo de la cuenta de servicio | Production y Preview si se van a hacer pruebas allí |
| `VITE_SEGURIDAD_ACTIVA` | `false` durante la preparación | Production |

Conservar las variables `VITE_FIREBASE_*` actuales. La cuenta de servicio debe pertenecer al mismo proyecto que `VITE_FIREBASE_PROJECT_ID`. No llamar a la variable privada `VITE_FIREBASE_SERVICE_ACCOUNT_JSON`: Vite expone las variables con ese prefijo al navegador.

Volver a desplegar después de añadir variables. No habilitar aún las reglas nuevas. Vercel ejecuta las funciones de `api/*.mjs`; `vercel.json` conserva `/api/*` fuera de la ruta del frontend. Para desarrollo con API usar `vercel dev`; `vite` solo sirve el frontend.

## 2. Revisar y migrar perfiles existentes

La migración busca cada correo en Firebase Authentication y utiliza su UID real. No crea cuentas a partir de contraseñas guardadas en documentos. Ante perfiles sin cuenta, roles desconocidos, datos incompletos o duplicados con datos distintos, se detiene antes de escribir: corregir el dato o crear la cuenta correspondiente en Authentication y repetir la simulación.

En PowerShell, en la carpeta del proyecto, con la cuenta de servicio fuera del repositorio:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\ruta\privada\cuenta-firebase.json'
node scripts/migrar-perfiles.mjs
```

La primera ejecución es una simulación. Revisar en Firebase las identidades, áreas y roles, especialmente RRHH y Subsecretario, ya que la base estuvo con escrituras públicas. Sólo después aplicar:

```powershell
node scripts/migrar-perfiles.mjs --aplicar
```

La migración conserva las cuentas y contraseñas de Authentication, los nombres y áreas de los perfiles, y sus avisos. Reubica perfiles en `users/{UID}`; retira los documentos con IDs anteriores y guarda una copia saneada en `_migracionesUsers`. Elimina contraseñas del perfil, sin copiarlas al archivo de migración, y corrige `usuarioId` en las notificaciones antiguas. Es conveniente conservar previamente el respaldo administrativo de la base.

Los perfiles `coordinador_traspasos` pasan a `admin`, conservando **su lugar de trabajo real**; no se convierte RRHH en un rol Admin ni se modifican destinos de empleados. Las responsabilidades se guardan en `avisosTraspasos`:

- `actualizar_sistemas`: aviso para actualizar Major y Portal Empleados.
- `notificar_empleado`: aviso para comunicar el nuevo destino al agente.

La semilla conserva las direcciones que el código usaba al momento del cambio: `registrosdeasistenciasmoron@gmail.com` para actualizar sistemas y `safeguarding740@gmail.com` para notificar al agente. Revisar que correspondan a las personas correctas. RRHH puede ajustar estos avisos desde Usuarios; la entrega posterior sigue al UID y al correo actualizado del perfil, sin depender del rol ni de un correo fijo. Los avisos del área y los específicos se combinan, sin sobrescribir instrucciones.

## 3. Probar el modo seguro y activarlo

Con perfiles migrados, poner `VITE_SEGURIDAD_ACTIVA=true` en Preview y desplegar una vista previa con las credenciales de servidor configuradas. Abrir allí `/scan?token=...` con el token de un QR existente del mismo proyecto. Buscar un legajo y registrar **una fichada de prueba autorizada**, o realizar esa prueba con un proyecto Firebase de prueba. Las vistas previas que apuntan a la base real escriben en la base real.

Comprobar el ingreso de RRHH, Subsecretario y un Admin de área, las solicitudes de vacaciones, el traspaso y los avisos de ambos responsables. El QR nuevo conserva las URLs y los tokens anteriores. Los empleados no necesitan una cuenta. Si un legajo no existe se indica consultar al área: no se permite dar de alta empleados desde un QR público.

Luego poner `VITE_SEGURIDAD_ACTIVA=true` en Production, desplegar y comprobar que el QR usa `/api/fichaje` y no consultas públicas a Firestore. Cerrar/reabrir sesiones con perfiles migrados.

**Finalmente**, publicar el contenido completo de `firestore.rules` en Firebase → Firestore Database → Reglas → Publicar. Alternativamente, con Firebase CLI y el proyecto seleccionado explícitamente:

```powershell
firebase deploy --only firestore:rules --project ID_REAL_DEL_PROYECTO
```

Subir código a GitHub o desplegar en Vercel **no publica las reglas de Firestore**. No publicar primero las reglas mientras haya una versión anterior del frontend en uso: esas versiones dejarán de fichar y deberán recargar la página.

## Alcance de permisos

- Sin sesión: ningún acceso directo a Firestore. El QR sólo accede a la API con un token válido.
- Empleado: lectura de su propio perfil, sin acceso a listados internos.
- Admin: empleados, asistencias y ausencias de su área; sus solicitudes de traspaso; solicitudes de vacaciones de su área; sus notificaciones. No aprueba traspasos ni vacaciones ni modifica saldos o roles.
- RRHH: administración global y primera aprobación de traspasos. Gestión de cuentas exclusivamente por API autenticada.
- Subsecretario: consulta global, aprobación final de traspasos, asignación de destino y gestión de vacaciones. Sin administración de usuarios.
- Las notificaciones sólo permiten al destinatario marcar `leido=true`. No puede modificar su texto, destino ni autor.
- Colecciones de control del servidor y cualquier colección no declarada: acceso del SDK web bloqueado.

El historial de vacaciones de un agente trasladado debe incluir consumos de áreas anteriores: `/api/vacaciones-contexto` comprueba primero que el agente esté actualmente en el área del Admin, y sólo entonces devuelve su historial. La numeración de vacaciones usa un contador transaccional; no requiere que Admin lea todo el año de todas las áreas.

## Fichaje

El servidor valida vencimiento y deshabilitación del QR en cada búsqueda/fichada y vuelve a verificarlos dentro de la transacción. Consulta un único legajo, rechaza duplicados e inactivos, y devuelve sólo nombre, apellido, legajo y lugar de trabajo. Fecha, hora y tipo provienen del servidor en horario de Buenos Aires. Los nuevos tokens usan aleatoriedad criptográfica. Un ID de operación conserva la idempotencia al reintentar; el estado por agente serializa fichadas concurrentes y aplica una separación mínima de un minuto.

Hay un límite compartido entre instancias de 1200 peticiones por IP en cinco minutos. No identifica por sí solo a una persona: un QR y un legajo siguen siendo datos que se pueden compartir. No prueba presencia física ni impide que alguien fiche con un legajo ajeno. Para esa exigencia haría falta otro mecanismo de identificación. Las credenciales del servidor, las reglas y el límite sí evitan el acceso general de los visitantes a la base y la escritura directa de asistencias.

EmailJS se conserva para el envío; también se guardan avisos internos y registros de correo. Un registro en `notificaciones_email` no demuestra entrega de email. Revisar el resultado del proveedor en una prueba de producción.

## Pruebas locales

```powershell
node --test scripts/seguridad.test.mjs
node --experimental-vm-modules --test scripts/regimenVacaciones.test.mjs scripts/vacacionesCalculo.test.mjs scripts/vacacionesFirestore.test.mjs
firebase emulators:start --only firestore --project demo-asistencias
# En otra terminal:
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085'
node --experimental-vm-modules --test scripts/firestoreRules.test.mjs
```

El test de integración exige un host local y fija el proyecto `demo-asistencias`; carga las reglas actuales y crea datos simulados. Nunca se debe ejecutar una migración de producción desde una terminal que conserve `FIRESTORE_EMULATOR_HOST` o `FIREBASE_AUTH_EMULATOR_HOST`: abrir una terminal limpia para migrar y verificar el proyecto de la credencial.

Referencias: [Firebase Admin](https://firebase.google.com/docs/admin/setup), [consultas y reglas](https://firebase.google.com/docs/firestore/security/rules-query), [pruebas con emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator), [Vite y funciones en Vercel](https://vercel.com/docs/frameworks/frontend/vite).
