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
    <div className="space-y-4 flex items-center">
      <button 
        onClick={generarQR} 
        disabled={loading}
        className="btn-primary"
      >
        {loading ? (
          <div className="flex items-center">
            <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin mr-2"></div>
            Generando QR...
          </div>
        ) : (
          "🎯 Generar QR (2 minutos)"
        )}
      </button>

      {qrLink && (
        <div className="card p-6 space-y-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">QR Generado</h4>
            <p className="text-sm text-gray-600">
              Válido hasta: {new Date(qrLink.expiresAt).toLocaleString('es-AR')}
            </p>
          </div>
          
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <img 
                src={qrLink.quickUrl} 
                alt="Código QR para registro de asistencia" 
                className="w-64 h-64"
              />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Enlace directo:</p>
            <a 
              href={qrLink.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 text-sm break-all inline-block max-w-md"
            >
              {qrLink.link}
            </a>
{/*             <p className="text-xs text-gray-500 mt-2">
              Token: <code className="bg-gray-100 px-1 py-0.5 rounded">{token}</code>
            </p> */}
          </div>
        </div>
      )}
    </div>
  );
}