// src/components/QrGenerator.jsx
import React, { useState } from "react";
import { makeToken } from "../utils/tokens";
import {
  db,
  collection,
  addDoc,
  serverTimestamp
} from "../firebase";

export default function QrGenerator({ area = "", user }) {
  const [loading, setLoading] = useState(false);
  const [qrLink, setQrLink] = useState(null);
  const [token, setToken] = useState(null);

  async function generarQR() {
    setLoading(true);
    try {
      const t = makeToken();
      const validMs = 1000 * 60 * 2; // 2 minutos (ajustable)
      const expiresAt = new Date(Date.now() + validMs).toISOString();

      // Guardar token en Firestore (colección tokens)
      await addDoc(collection(db, "tokens"), {
        token: t,
        area: area || "",
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        used: false
      });

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/scan?token=${encodeURIComponent(t)}&area=${encodeURIComponent(area)}`;
      const quickUrl = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=400`;

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
    <div className="mt-3">
      <button onClick={generarQR} disabled={loading} className="px-4 py-2 bg-municipio-500 text-white rounded-lg shadow">
        {loading ? "Generando..." : "Generar QR (2 min)"}
      </button>

      {qrLink && (
        <div className="mt-3 card p-4">
          <p className="text-sm">Escaneá este QR (válido hasta {new Date(qrLink.expiresAt).toLocaleString()})</p>
          <img src={qrLink.quickUrl} alt="QR" className="w-44 h-44 mt-2" />
          <p className="break-all mt-2"><a href={qrLink.link} target="_blank" rel="noreferrer" className="text-municipio-700">{qrLink.link}</a></p>
          <p className="text-xs mt-1">Token: {token}</p>
        </div>
      )}
    </div>
  );
}
