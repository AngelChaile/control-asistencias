import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

export function servicios() {
  if (!getApps().some(app => app.name === '[DEFAULT]')) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIRESTORE_EMULATOR_HOST) {
      const error = new Error('El servicio seguro todavía no está configurado. Comuníquese con RRHH.');
      error.status = 503;
      throw error;
    }
    try {
      initializeApp(raw ? { credential: cert(JSON.parse(raw)) }
        : process.env.FIRESTORE_EMULATOR_HOST ? { projectId: process.env.GCLOUD_PROJECT || 'demo-asistencias' }
          : { credential: applicationDefault() });
    } catch {
      throw Object.assign(new Error('El servicio seguro todavía no está configurado. Comuníquese con RRHH.'), {status:503});
    }
  }
  return { db: getFirestore(), auth: getAuth(), FieldValue, Timestamp };
}
