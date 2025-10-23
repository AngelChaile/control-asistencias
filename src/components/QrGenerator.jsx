// src/components/QrGenerator.jsx
import React, { useState } from "react";
import { makeToken } from "../utils/tokens";
import { db, collection, addDoc, serverTimestamp } from "../firebase";

export default function QrGenerator({ area = "", user }) {
  const [loading, setLoading] = useState(false);
  const [qrLink, setQrLink] = useState(null);
  const [token, setToken] = useState(null);

  async function generarQR() {
    setLoading(true);
    try {
      const t = makeToken();
      const validMs = 1000 * 60 * 2; // 2 minutos
      const expiresAt = new Date(Date.now() + validMs).toISOString();

      await addDoc(collection(db, "tokens"), {
        token: t,
        area: area || "",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        used: false
      });

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/scan?token=${encodeURIComponent(t)}&area=${encodeURIComponent(area)}`;
      const quickUrl = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=300&margin=1&dark=1e293b&light=ffffff`;

      setToken(t);
      setQrLink({ link, quickUrl, expiresAt });
    } catch (err) {
      console.error(err);
      alert("Error generando QR: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Contenedor del botón - Siempre centrado */}
      <div className="flex justify-center">
        <button 
          onClick={generarQR} 
          disabled={loading}
          className="btn-primary w-full sm:w-auto px-8 py-3 text-base"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
              Generando QR...
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>🎯</span>
              <span>Generar QR (2 minutos)</span>
            </div>
          )}
        </button>
      </div>

      {/* QR Generado - Se muestra debajo del botón sin afectar su posición */}
      {qrLink && (
        <div className="card p-6 space-y-6 animate-fade-in">
          {/* Header del QR */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-2xl">✅</span>
            </div>
            <h4 className="text-xl font-semibold text-gray-900">QR Generado Exitosamente</h4>
            <p className="text-sm text-gray-600">
              Válido hasta: <span className="font-medium">{new Date(qrLink.expiresAt).toLocaleString('es-AR')}</span>
            </p>
          </div>
          
          {/* Imagen del QR */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-300 hover:shadow-md">
              <img 
                src={qrLink.quickUrl} 
                alt="Código QR para registro de asistencia" 
                className="w-64 h-64 sm:w-72 sm:h-72"
              />
            </div>
          </div>
          
          {/* Información adicional */}
          <div className="text-center space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Enlace directo para escanear:</p>
              <a 
                href={qrLink.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-municipio-600 hover:text-municipio-700 text-sm break-all inline-block max-w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                {qrLink.link}
              </a>
            </div>
            
            {/* Instrucciones */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-1">📱 ¿Cómo usar este QR?</p>
              <p className="text-xs text-blue-700">
                1. Muestre este código en pantalla<br/>
                2. Los empleados escanean con su celular<br/>
                3. Ingresan su legajo para registrar asistencia
              </p>
            </div>

            {/* Token (opcional - comentado por ahora) */}
            {/* <div className="text-xs text-gray-500">
              <span className="font-medium">Token:</span>{' '}
              <code className="bg-gray-100 px-2 py-1 rounded border">{token}</code>
            </div> */}
          </div>
        </div>
      )}

      {/* Estado cuando no hay QR generado */}
      {!qrLink && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-3">📱</div>
          <p className="text-gray-600">Presione el botón para generar un código QR</p>
          <p className="text-sm text-gray-500 mt-1">Cada QR es válido por 2 minutos</p>
        </div>
      )}
    </div>
  );
}