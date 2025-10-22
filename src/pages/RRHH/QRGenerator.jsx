import React from "react";
import QrGenerator from "../../components/QrGenerator";
import { useAuth } from "../../context/AuthContext";

export default function QRPage() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generador de Códigos QR</h1>
        <p className="text-gray-600">Crea códigos QR temporales para registro de asistencias</p>
      </div>

      <div className="card p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-municipio-500 to-municipio-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📱</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Generar Nuevo QR</h3>
          <p className="text-gray-600 mt-1">
            Cada código QR es válido por 2 minutos y puede ser escaneado desde cualquier dispositivo
          </p>
        </div>

        <QrGenerator user={user} />
      </div>
    </div>
  );
}