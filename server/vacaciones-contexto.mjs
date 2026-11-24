import { empleadoAdministrado } from '../src/utils/alcanceAdmin.mjs';
import { autorizar, errorHttp } from './http.mjs';
import { calcularSaldoVacacional, diasOtorgados, planAprobado, planDeSolicitud } from '../src/utils/vacacionesCalculo.mjs';

async function anularVacaciones(body, usuario, { db, FieldValue }) {
  const { id, estadoAnterior, motivo = '' } = body;
  if (typeof id !== 'string' || !id || id.includes('/') || Buffer.byteLength(id) > 1500 ||
      !['pendiente', 'aprobada'].includes(estadoAnterior) || typeof motivo !== 'string' || motivo.length > 500) {
    throw errorHttp(400, 'Los datos de la anulación son inválidos.');
  }
  const solicitudes = db.collection('solicitudesVacaciones');
  const ref = solicitudes.doc(id);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw errorHttp(404, 'La solicitud ya no existe.');
    const solicitud = snap.data();
    if (solicitud.estado === 'anulada') return { estado: 'anulada' };
    if (solicitud.estado !== estadoAnterior) throw errorHttp(409, 'El estado de la solicitud cambió. Actualizá el listado antes de anularla.');

    const fecha = FieldValue.serverTimestamp();
    if (solicitud.estado === 'aprobada') {
      const legajo = String(solicitud.legajo);
      const anio = Number(solicitud.anioVacacional);
      const saldoRef = db.collection('saldosVacaciones').doc(`vacaciones_${legajo}_${anio}`);
      // Leer el saldo y el historial en la misma transacción que la anulación.
      // También reconstruye los saldos históricos anteriores al régimen por tipo.
      const saldo = await tx.get(saldoRef);
      const claves = String(Number(legajo)) === legajo && Number.isSafeInteger(Number(legajo)) ? [legajo, Number(legajo)] : [legajo];
      const historial = await tx.get(solicitudes.where('legajo', 'in', claves));
      const vigentes = historial.docs.filter(d => d.id !== id).map(d => d.data())
        .filter(s => s.estado === 'aprobada' && Number(s.anioVacacional) === anio)
        .sort((a, b) => (b.fechaAprobacion?.toMillis?.() || 0) - (a.fechaAprobacion?.toMillis?.() || 0));
      const ultima = vigentes[0] || solicitud;
      const plan = planAprobado(vigentes) || (vigentes.length ? planDeSolicitud(ultima) : null);
      const otorgados = plan?.diasPorTipo || diasOtorgados(ultima);
      const { porTipo } = calcularSaldoVacacional(otorgados, vigentes);
      const tipo = ultima.tipoDias;
      tx.set(saldoRef, {
        versionRegimen: 2, legajo, anioVacacional: anio, tipoDias: tipo, planVacacional: plan,
        diasUsadosPorTipo: { habiles: porTipo.habiles.diasUsados, corridos: porTipo.corridos.diasUsados },
        diasDisponiblesPorTipo: { habiles: porTipo.habiles.diasDisponibles, corridos: porTipo.corridos.diasDisponibles },
        diasCorrespondenPorTipo: otorgados, ...porTipo[tipo],
        ...(!saldo.exists ? { createdAt: fecha } : {}), updatedAt: fecha,
      }, { merge: true });
    }
    tx.update(ref, { estado: 'anulada', estadoAntesDeAnular: estadoAnterior, anuladaPor: usuario.uid,
      motivoAnulacion: motivo.trim(), fechaAnulacion: fecha, updatedAt: fecha });
    return { estado: 'anulada' };
  });
}

export async function vacacionesContexto(req, body, s) {
  const usuario = await autorizar(req, s, body.accion === 'anular' ? ['rrhh'] : ['admin','rrhh','subsecretario']);
  if (body.accion === 'anular') return anularVacaciones(body, usuario, s);
  if (body.accion === 'numero') {
    const anio = Number(body.anio);
    if (!Number.isInteger(anio) || anio < 2020 || anio > 2099) throw errorHttp(400, 'Período inválido.');
    const ref = s.db.collection('_contadores').doc(`vacaciones_${anio}`);
    const numero = await s.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const actual = snap.exists ? snap.data().valor : (await tx.get(s.db.collection('solicitudesVacaciones').where('anioVacacional', '==', anio))).size;
      tx.set(ref, { valor: actual + 1 });
      return actual + 1;
    });
    return { numero: `VAC-${anio}-${String(numero).padStart(5,'0')}` };
  }
  if (body.accion !== 'historial' || !/^[0-9]{1,20}$/.test(body.legajo || '')) throw errorHttp(400, 'Legajo inválido.');
  if (usuario.rol === 'admin') {
    const empleados = await s.db.collection('empleados').where('legajo','==',body.legajo).limit(2).get();
    if (empleados.size !== 1 || !empleadoAdministrado(usuario, empleados.docs[0].data()) || empleados.docs[0].data().activo === false) throw errorHttp(403, 'El agente no pertenece a su área.');
    if (empleados.docs[0].data().requiereRevisionCargo) throw errorHttp(409, 'RRHH debe seleccionar el cargo para vacaciones en la ficha del agente.');
  }
  const docs = await s.db.collection('solicitudesVacaciones').where('legajo','==',body.legajo).get();
  return { solicitudes: docs.docs.map(d => ({ ...d.data(), id:d.id,
    fechaAprobacion: d.data().fechaAprobacion ? { seconds: d.data().fechaAprobacion.seconds } : null })) };
}
