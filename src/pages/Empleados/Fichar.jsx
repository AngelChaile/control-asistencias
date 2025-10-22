import React from "react";
import Scan from "../Public/Scan";

export default function Fichar() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Fichar Asistencia</h2>
      <div className="bg-white rounded-lg shadow p-4">
        <Scan />
      </div>
    </div>
  );
}
