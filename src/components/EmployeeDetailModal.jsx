import React from "react";
import { formatearFecha } from "../utils/fechas";

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

export default function EmployeeDetailModal({ empleado, onClose }) {
  if (!empleado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">Ficha de personal</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{empleado.nombre} {empleado.apellido}</h2>
            <p className="mt-1 text-sm text-slate-500">Legajo {empleado.legajo || "-"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar detalle">
            ×
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <section>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Datos personales</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Documento" value={empleado.documento} />
              <DetailItem label="Email" value={empleado.email} />
              <DetailItem label="Teléfono" value={empleado.telefono} />
              <DetailItem label="Domicilio" value={empleado.domicilio} />
              <DetailItem label="Fecha de nacimiento" value={formatearFecha(empleado.fechaNacimiento)} />
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Situación laboral</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Área" value={empleado.area?.nombre || empleado.lugarTrabajo} />
              <DetailItem label="Secretaría" value={empleado.secretaria} />
              <DetailItem label="Función" value={empleado.funcion} />
              <DetailItem label="Categoría" value={empleado.categoria} />
              <DetailItem label="Tipo de cargo" value={empleado.tipoCargo} />
              <DetailItem label="Horario" value={empleado.horario} />
              <DetailItem label="Estado" value={empleado.estado || (empleado.activo === false ? "inactivo" : "activo")} />
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">Historial de fechas</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DetailItem label="Fecha de ingreso" value={formatearFecha(empleado.fechaIngreso)} />
              <DetailItem label="Fecha de reingreso" value={formatearFecha(empleado.fechaReingreso)} />
              <DetailItem label="Fecha de baja" value={formatearFecha(empleado.fechaBaja)} />
            </div>
          </section>

          <button type="button" onClick={onClose} className="btn-secondary w-full py-2.5">Cerrar ficha</button>
        </div>
      </div>
    </div>
  );
}