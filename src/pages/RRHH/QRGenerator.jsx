import React from "react";
import QrGenerator from "../../components/QrGenerator";

export default function QRPage({ user }) {
  return (
    <div className="app-container">
      <h2 className="text-2xl font-semibold mb-4">Generar QR de asistencia</h2>
      <div className="card">
        <QrGenerator user={user} />
      </div>
    </div>
  );
}
