# Padrón de la Secretaría de Salud

La cuenta de administración de Salud usa el rol **Admin**. En Usuarios, RRHH puede elegir **Todas las áreas de Salud** en el alcance del administrador. Las dependencias se identifican por el código del organigrama, que comienza con `1.9.`. El legajo conserva su área de trabajo. Las vacaciones se envían a RRHH para su resolución.

## Revisar el Excel

Desde la carpeta del proyecto, con las dependencias instaladas, ejecutar en PowerShell:

```powershell
$padron = Read-Host "Ruta del archivo Excel"
node scripts/importar-salud.mjs $padron
```

La revisión local informa las filas pendientes, las bajas y las categorías activas sin régimen vacacional. El padrón guarda un empleado por legajo y conserva los cargos de cada persona. La fecha de baja 01/01/2100 identifica a los cargos sin baja registrada. Para las bajas efectivas se conserva la fecha y se marca al empleado inactivo.

Los tres legajos con regímenes simultáneos se importan con sus dos cargos. En **RRHH → Empleados**, marcar **Cargos por revisar**, buscar y abrir **Editar**. Elegir el cargo para vacaciones y guardar la ficha para habilitar la solicitud. RRHH confirmó que el código `1.9.2.7.` corresponde a Dirección de Epidemiología. División Suministros usa el código corregido `1.9.2.2.7.1.`. Se omiten los cuatro registros municipales de baja correspondientes a Enfermera Profesional A 40 HS, Jefe de Departamento 40 HS y Temp Administrativo A 30 HS.

## Cargar en Firebase

Para limitar el acceso en producción deben estar activos los perfiles por UID, la API de vacaciones y las reglas del repositorio. La guía [Seguridad de Firestore](seguridad-firestore.md) indica el orden para conservar el fichaje por QR al activar las reglas.

Configurar una cuenta de servicio del proyecto con acceso a Authentication y Firestore. El Excel y la credencial se leen localmente. El comando valida el ID de proyecto contra la credencial.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = Read-Host "Ruta local del JSON de servicio"
$proyecto = Read-Host "ID del proyecto Firebase"
$env:SALUD_ADMIN_EMAIL = Read-Host "Correo de la administradora"
$env:SALUD_ADMIN_NOMBRE = Read-Host "Nombre"
$env:SALUD_ADMIN_APELLIDO = Read-Host "Apellido"
node scripts/importar-salud.mjs $padron "--proyecto=$proyecto"
```

La vista previa cruza documentos, legajos y áreas con Firebase y muestra los códigos cuyos nombres difieren. Una vez que RRHH confirme la fuente, usar `--nombres=excel` para actualizar el organigrama o `--nombres=firebase` para usar los nombres vigentes. Usar la misma opción en la vista previa y al aplicar. Para los reportes, incorpora al alcance las fichadas y ausencias anteriores que ya identifican a Salud y a una dependencia del padrón. Un conflicto con una ficha existente se informa por número de fila. Al aplicar, se conservan los historiales, los saldos y los datos de contacto existentes. Los lotes tienen control de versión. Si un lote falla, se puede volver a ejecutar la misma carga.

En PowerShell 7, ingresar la contraseña inicial sin mostrarla y aplicar los mismos parámetros revisados en la vista previa:

```powershell
$env:SALUD_ADMIN_PASSWORD = Read-Host "Contraseña inicial" -MaskInput
try {
  node scripts/importar-salud.mjs $padron "--proyecto=$proyecto" --aplicar
} finally {
  Remove-Item Env:SALUD_ADMIN_PASSWORD
}
```

La cuenta se habilita después de guardar los legajos. Si ya existe una identidad distinta con el mismo correo, el importador se detiene para que RRHH revise la cuenta existente.
