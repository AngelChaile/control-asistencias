# control-asistencias
control de asistencias de empleados

# Asistencias - React + Firebase (lista para Vercel)

## Resumen
Proyecto frontend (React + Vite) que usa Firebase (Auth + Firestore).  
Admins generan QR (válido 1 hora). Empleados escanean y registran asistencia. RRHH puede exportar CSV.

## Requisitos
- Cuenta Firebase (project)
- Habilitar Firestore (modo de prueba o con reglas)
- Habilitar Authentication -> Email/Password
- Crear usuario admin (desde consola Firebase Auth)

## Configuración
1. Crear repo y subir todos los archivos provistos.
2. Crear proyecto Firebase y obtener credenciales (API key, project id, etc).
3. En la consola Firebase -> Firestore -> crea collections vacías: `empleados`, `asistencias`, `tokens`.
4. Rellenar variables de entorno en Vercel (o local .env):
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_MESSAGING_SENDER_ID
   - VITE_FIREBASE_APP_ID

## Deploy local (si podés usar node):
```bash
npm install
npm run dev
