import React, { useEffect, useState } from "react";
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "../../firebase";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [nuevo, setNuevo] = useState({ 
    email: "", 
    nombre: "", 
    apellido: "", 
    legajo: "", 
    lugarTrabajo: "", 
    contraseña: "", 
    rol: "empleado" 
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  async function fetchUsuarios() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "users", editingId), nuevo);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "users"), nuevo);
      }
      setNuevo({ 
        email: "", 
        nombre: "", 
        apellido: "", 
        legajo: "", 
        lugarTrabajo: "", 
        contraseña: "", 
        rol: "empleado" 
      });
      fetchUsuarios();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleEditar(u) {
    setEditingId(u.id);
    setNuevo(u);
  }

  async function handleEliminar(id) {
    if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
      await deleteDoc(doc(db, "users", id));
      fetchUsuarios();
    }
  }

  const stats = {
    total: usuarios.length,
    empleados: usuarios.filter(u => u.rol === 'empleado').length,
    admins: usuarios.filter(u => u.rol === 'admin').length,
    rrhh: usuarios.filter(u => u.rol === 'rrhh').length
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Usuarios</h1>
        <p className="text-gray-600">Administración de accesos y permisos del sistema</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Usuarios</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-bold text-blue-600">{stats.empleados}</div>
          <div className="text-sm text-gray-600">Empleados</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-bold text-green-600">{stats.admins}</div>
          <div className="text-sm text-gray-600">Administradores</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xl font-bold text-purple-600">{stats.rrhh}</div>
          <div className="text-sm text-gray-600">RRHH</div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Formulario de Usuario */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? "✏️ Editar Usuario" : "👤 Crear Nuevo Usuario"}
          </h3>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input 
                className="input-modern" 
                type="email" 
                placeholder="correo@municipio.com" 
                value={nuevo.email} 
                onChange={e => setNuevo({...nuevo, email: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input 
                className="input-modern" 
                placeholder="Nombre del usuario" 
                value={nuevo.nombre} 
                onChange={e => setNuevo({...nuevo, nombre: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apellido *</label>
              <input 
                className="input-modern" 
                placeholder="Apellido del usuario" 
                value={nuevo.apellido} 
                onChange={e => setNuevo({...nuevo, apellido: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Legajo *</label>
              <input 
                className="input-modern" 
                placeholder="Número de legajo" 
                value={nuevo.legajo} 
                onChange={e => setNuevo({...nuevo, legajo: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lugar de Trabajo *</label>
              <input 
                className="input-modern" 
                placeholder="Área o departamento" 
                value={nuevo.lugarTrabajo} 
                onChange={e => setNuevo({...nuevo, lugarTrabajo: e.target.value})} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña *</label>
              <input 
                className="input-modern" 
                type="password" 
                placeholder="Contraseña temporal" 
                value={nuevo.contraseña} 
                onChange={e => setNuevo({...nuevo, contraseña: e.target.value})} 
                required
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol del Usuario</label>
              <select 
                className="input-modern" 
                value={nuevo.rol} 
                onChange={e => setNuevo({...nuevo, rol: e.target.value})}
              >
                <option value="empleado">👨‍💼 Empleado</option>
                <option value="admin">🛡️ Administrador</option>
                <option value="rrhh">📊 Recursos Humanos</option>
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
              <button type="submit" className="btn-primary flex-1">
                {editingId ? "💾 Guardar Cambios" : "➕ Crear Usuario"}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingId(null); 
                    setNuevo({ 
                      email: "", 
                      nombre: "", 
                      apellido: "", 
                      legajo: "", 
                      lugarTrabajo: "", 
                      contraseña: "", 
                      rol: "empleado" 
                    }); 
                  }} 
                  className="btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Usuarios del Sistema</h3>
              <p className="text-gray-600">Gestión de accesos y permisos</p>
            </div>
            <div className="text-sm text-gray-600">
              {usuarios.length} usuarios registrados
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-municipio-500"></div>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-600">Comienza creando el primer usuario del sistema</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: 900 }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                            u.rol === 'admin' ? 'bg-red-100' :
                            u.rol === 'rrhh' ? 'bg-purple-100' :
                            'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-medium ${
                              u.rol === 'admin' ? 'text-red-600' :
                              u.rol === 'rrhh' ? 'text-purple-600' :
                              'text-blue-600'
                            }`}>
                              {u.nombre?.[0]}{u.apellido?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.nombre} {u.apellido}
                            </div>
                            <div className="text-sm text-gray-500">Legajo: {u.legajo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.rol === 'admin' ? 'bg-red-100 text-red-800' :
                          u.rol === 'rrhh' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.lugarTrabajo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditar(u)} 
                            className="text-municipio-600 hover:text-municipio-700 bg-municipio-50 hover:bg-municipio-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button 
                            onClick={() => handleEliminar(u.id)} 
                            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}