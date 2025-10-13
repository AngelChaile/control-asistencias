// src/components/QrGenerator.jsx
import React, { useState } from "react";
import { makeToken } from "../utils/tokens";
import {
  db,
  collection,
  addDoc,
  serverTimestamp
} from "../firebase";

export default function QrGenerator({ area = "" }) {
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
      // link simplificado: sólo token
      const link = `${baseUrl}/scan?token=${encodeURIComponent(t)}`;

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
    <div style={{ marginTop: 12 }}>
      <button onClick={generarQR} disabled={loading}>
        {loading ? "Generando..." : "Generar QR (2 min)"}
      </button>

      {qrLink && (
        <div style={{ marginTop: 12 }}>
          <p>Escaneá este QR (válido hasta {new Date(qrLink.expiresAt).toLocaleString()})</p>
          <img src={qrLink.quickUrl} alt="QR" style={{ width: 220, height: 220 }} />
          <p style={{ wordBreak: "break-all" }}><a href={qrLink.link} target="_blank">{qrLink.link}</a></p>
          <p>Token: {token}</p>
        </div>
      )}
    </div>
  );
}
