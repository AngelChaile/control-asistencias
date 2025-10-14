import React from "react";

export default function EmployeeList({ empleados, onEdit, onDelete }) {
  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Legajo</th><th>Nombre</th><th>Apellido</th><th>Área</th><th>Horario</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map(e => (
            <tr key={e.id}>
              <td>{e.legajo}</td>
              <td>{e.nombre}</td>
              <td>{e.apellido}</td>
              <td>{e.area}</td>
              <td>{e.horario}</td>
              <td>
                <button onClick={() => onEdit(e)}>Editar</button>
                <button onClick={() => onDelete(e)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
