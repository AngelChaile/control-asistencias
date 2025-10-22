import React from "react";
import QrGenerator from "../../components/QrGenerator";

export default function QRPage({ user }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Generar QR de asistencia</h2>
      <div className="bg-white rounded-lg shadow p-4">
        <QrGenerator user={user} />
      </div>
    </div>
  );
}
