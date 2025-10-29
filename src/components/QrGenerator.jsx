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

  const imprimirQR = () => {
    if (!qrLink) return;
    
    const ventanaImpresion = window.open('', '_blank');
    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR de Asistencia - ${area || 'Municipio'}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .print-container { 
              max-width: 400px; 
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              margin-bottom: 20px; 
            }
            .title { 
              font-size: 24px; 
              font-weight: bold; 
              color: #333;
              margin-bottom: 10px;
            }
            .subtitle { 
              font-size: 16px; 
              color: #666;
              margin-bottom: 5px;
            }
            .area { 
              font-size: 18px; 
              font-weight: bold; 
              color: #e11d1d;
              margin-bottom: 15px;
            }
            .qr-container { 
              margin: 20px 0; 
              padding: 15px;
              border: 2px solid #333;
              border-radius: 10px;
              display: inline-block;
            }
            .qr-image { 
              width: 250px; 
              height: 250px;
            }
            .info { 
              margin: 15px 0; 
              font-size: 14px;
              color: #555;
            }
            .expires { 
              font-weight: bold; 
              color: #d97706;
            }
            .instructions { 
              margin-top: 20px; 
              padding: 15px;
              background: #f3f4f6;
              border-radius: 8px;
              font-size: 13px;
              text-align: left;
            }
            .footer { 
              margin-top: 20px; 
              font-size: 12px; 
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .print-container { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="header">
              <div class="title">Sistema de Asistencias</div>
              <div class="subtitle">Municipalidad</div>
              ${area ? `<div class="area">Área: ${area}</div>` : ''}
            </div>
            
            <div class="qr-container">
              <img src="${qrLink.quickUrl}" alt="QR de Asistencia" class="qr-image" />
            </div>
            
            <div class="info">
              <div><strong>Válido hasta:</strong> <span class="expires">${new Date(qrLink.expiresAt).toLocaleString('es-AR')}</span></div>
            </div>
            
            <div class="instructions">
              <strong>📱 Instrucciones de uso:</strong><br/>
              1. Mostrar este código QR en pantalla o impreso<br/>
              2. Los empleados escanean con la cámara de su celular<br/>
              3. Ingresan su número de legajo<br/>
              4. Confirman el registro de asistencia
            </div>
            
            <div class="footer">
              Generado el ${new Date().toLocaleString('es-AR')} | Sistema de Control de Asistencias
            </div>
          </div>
        </body>
      </html>
    `);
    
    ventanaImpresion.document.close();
    
    // Esperar a que la imagen cargue antes de imprimir
    setTimeout(() => {
      ventanaImpresion.print();
      // Cerrar la ventana después de imprimir (opcional)
      // ventanaImpresion.close();
    }, 500);
  };

  const copiarEnlace = async () => {
    if (!qrLink) return;
    
    try {
      await navigator.clipboard.writeText(qrLink.link);
      alert('✅ Enlace copiado al portapapeles');
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = qrLink.link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Enlace copiado al portapapeles');
    }
  };

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

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={imprimirQR}
              className="btn-primary flex items-center justify-center space-x-2 py-3 px-6"
            >
              <span>🖨️</span>
              <span>Imprimir QR</span>
            </button>
            
{/*             <button 
              onClick={copiarEnlace}
              className="btn-secondary flex items-center justify-center space-x-2 py-3 px-6"
            >
              <span>📋</span>
              <span>Copiar Enlace</span>
            </button> */}
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
            
            {/* Token para referencia */}
{/*             <div className="p-3 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-600 font-medium mb-1">Token de referencia:</p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-gray-300 font-mono">
                {token}
              </code>
            </div> */}

            {/* Instrucciones */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium mb-1">📱 ¿Cómo usar este QR?</p>
              <p className="text-xs text-blue-700">
                1. Muestre este código en pantalla o imprímalo<br/>
                2. Los empleados escanean con su celular<br/>
                3. Ingresan su legajo para registrar asistencia<br/>
                4. El sistema confirma el registro automáticamente
              </p>
            </div>
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