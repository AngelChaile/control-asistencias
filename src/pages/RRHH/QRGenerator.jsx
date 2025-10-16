import React from "react";
import QrGenerator from "../../components/QrGenerator";

export default function QRPage({ user }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Generar QR de asistencia</h2>
      <QrGenerator user={user} />
    </div>
  );
}
