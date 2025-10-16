export default function HomeAdmin() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Panel del Administrador de Área</h1>
      <p className="text-gray-700 mb-6">
        Desde aquí podés generar códigos QR, ver empleados de tu área, y revisar asistencias o ausencias.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold mb-2">Generar QR</h2>
          <p className="text-gray-600">Crea un código QR para fichar asistencia en tu área.</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-yellow-500">
          <h2 className="text-lg font-semibold mb-2">Empleados del Área</h2>
          <p className="text-gray-600">Gestión de empleados de tu sector.</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-5 border-l-4 border-red-500">
          <h2 className="text-lg font-semibold mb-2">Reportes</h2>
          <p className="text-gray-600">Generá reportes de asistencia y ausencias del área.</p>
        </div>
      </div>
    </div>
  );
}
