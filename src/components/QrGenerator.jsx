import React, { useState } from "react";
import { makeToken } from "../utils/tokens";
import { addDoc, collection, serverTimestamp } from "../firebase";
import { db } from "../firebase";

export default function QrGenerator({ area }) {
  const [loading, setLoading] = useState(false);
  const [qrLink, setQrLink] = useState(null);
  const [token, setToken] = useState(null);

  // Genera token, lo guarda en Firestore en collection 'tokens' con expiry (1h)
  async function generarQR() {
    setLoading(true);
    try {
      const t = makeToken();
      const validForMs = 1000 * 60 * 60; // 1 hora
      const expiresAt = new Date(Date.now() + validForMs);

      // Guardar token
      await addDoc(collection(db, "tokens"), {
        token: t,
        area,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt.toISOString(),
        used: false
      });

      // link que escanea el empleado -> desplegará la pantalla Scan que validará token
      const baseUrl = window.location.origin; // deploy en Vercel
      const link = `${baseUrl}/scan?token=${encodeURIComponent(t)}&area=${encodeURIComponent(area)}`;

      // quickchart image (opcional mostrar imagen)
      const quickUrl = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=400`;

      setToken(t);
      setQrLink({ link, quickUrl, expiresAt: expiresAt.toISOString() });
    } catch (err) {
      console.error(err);
      alert("Error generando QR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={generarQR} disabled={loading}>
        {loading ? "Generando..." : "Generar QR por 1 hora"}
      </button>

      {qrLink && (
        <div style={{ marginTop: 12 }}>
          <p>Escaneá este QR (válido hasta {new Date(qrLink.expiresAt).toLocaleString()})</p>
          <img src={qrLink.quickUrl} alt="QR" style={{ width: 220, height: 220 }} />
          <p><a href={qrLink.link} target="_blank">{qrLink.link}</a></p>
          <p>Token: {token}</p>
        </div>
      )}
    </div>
  );
}
