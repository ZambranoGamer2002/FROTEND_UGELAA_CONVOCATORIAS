/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useState, useEffect, useCallback} from 'react'
import {useSelector} from 'react-redux'
import GestionUsuarios from './pages/GestionUsuarios'

const API_BASE = 'http://localhost:8000/api/v1'

const BADGE_ROL = {
  1: 'badge-danger',
  2: 'badge-warning',
  3: 'badge-info',
  4: 'badge-success',
}
const ICONO_ROL = {1: '👑', 2: '🔧', 3: '📋', 4: '👤'}

export default function GestionUsuarios() {
  const auth    = useSelector((s) => s.auth)
  const token   = auth?.authToken || ''

  const [usuarios, setUsuarios] = useState([])
  const [roles,    setRoles]    = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [toast, setToast]      = useState(null)  // {tipo, mensaje}

  const headers = {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}

  const mostrarToast = (tipo, mensaje) => {
    setToast({tipo, mensaje})
    setTimeout(() => setToast(null), 3500)
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [resU, resR] = await Promise.all([
        fetch(`${API_BASE}/usuarios/`, {headers}),
        fetch(`${API_BASE}/roles/`,   {headers}),
      ])
      const [dataU, dataR] = await Promise.all([resU.json(), resR.json()])
      setUsuarios(Array.isArray(dataU) ? dataU : [])
      setRoles(Array.isArray(dataR) ? dataR : [])
    } catch {
      mostrarToast('danger', 'Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const cambiarRol = async (userId, roleId) => {
    try {
      const resp = await fetch(`${API_BASE}/usuarios/${userId}/rol`, {
        method: 'PUT', headers,
        body: JSON.stringify({role_id: parseInt(roleId)}),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Error')
      mostrarToast('success', data.message)
      cargarDatos()
    } catch (err) {
      mostrarToast('danger', err.message)
    }
  }

  const toggleActivo = async (userId, activo) => {
    try {
      const resp = await fetch(`${API_BASE}/usuarios/${userId}/toggle-activo`, {
        method: 'PUT', headers,
        body: JSON.stringify({activo}),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.detail || 'Error')
      mostrarToast('success', data.message)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? {...u, activo} : u))
      )
    } catch (err) {
      mostrarToast('danger', err.message)
    }
  }

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = busqueda.toLowerCase()
    const coincideTexto =
      !texto ||
      u.username.toLowerCase().includes(texto) ||
      u.nombres.toLowerCase().includes(texto) ||
      u.apellidos.toLowerCase().includes(texto) ||
      u.email.toLowerCase().includes(texto)
    const coincideRol = !filtroRol || String(u.role_id) === filtroRol
    return coincideTexto && coincideRol
  })

  return (
    <div className='container-fluid px-0'>

      {/* Toast */}
      {toast && (
        <div
          className={`alert alert-${toast.tipo} alert-dismissible`}
          style={{position: 'fixed', top: 80, right: 20, zIndex: 9999, minWidth: 300, boxShadow: '0 4px 15px rgba(0,0,0,0.15)'}}
        >
          {toast.tipo === 'success' ? '✅' : '⚠️'} {toast.mensaje}
        </div>
      )}

      {/* Header */}
      <div className='d-flex align-items-center justify-content-between mb-6'>
        <div>
          <h3 className='font-weight-bolder text-dark mb-1'>Gestión de Usuarios</h3>
          <span className='text-muted font-size-sm'>
            {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button className='btn btn-light-primary font-weight-bold' onClick={cargarDatos}>
          <i className='fas fa-sync-alt mr-2' />Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className='card card-custom mb-5'>
        <div className='card-body py-4'>
          <div className='row align-items-center'>
            <div className='col-lg-6 col-md-8'>
              <div className='input-group'>
                <div className='input-group-prepend'>
                  <span className='input-group-text border-0 bg-light'>
                    <i className='fas fa-search text-muted' />
                  </span>
                </div>
                <input
                  type='text'
                  className='form-control form-control-solid border-0'
                  placeholder='Buscar por nombre, usuario o correo...'
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
            <div className='col-lg-3 col-md-4 mt-3 mt-md-0'>
              <select
                className='form-control form-control-solid'
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
              >
                <option value=''>Todos los roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className='card card-custom'>
        <div className='card-body p-0'>
          {cargando ? (
            <div className='d-flex justify-content-center align-items-center py-20'>
              <span className='spinner-border text-primary mr-3' />
              <span className='text-muted'>Cargando usuarios...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className='text-center py-20'>
              <i className='fas fa-users fa-3x text-muted mb-4' />
              <p className='text-muted'>No se encontraron usuarios</p>
            </div>
          ) : (
            <div className='table-responsive'>
              <table className='table table-head-custom table-vertical-center'>
                <thead>
                  <tr>
                    <th style={{minWidth: 200}}>USUARIO</th>
                    <th style={{minWidth: 180}}>CORREO</th>
                    <th style={{minWidth: 160}}>ROL</th>
                    <th style={{minWidth: 100}}>ESTADO</th>
                    <th style={{minWidth: 80}}>PERFIL</th>
                    <th style={{minWidth: 120}} className='text-right'>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id}>
                      {/* Usuario */}
                      <td>
                        <div className='d-flex align-items-center'>
                          <div
                            className='symbol symbol-40 mr-3 d-flex align-items-center justify-content-center rounded-circle font-weight-bold text-white'
                            style={{
                              width: 40, height: 40, flexShrink: 0,
                              background: u.role_nivel === 1 ? '#F64E60' :
                                          u.role_nivel === 2 ? '#FFA800' :
                                          u.role_nivel === 3 ? '#3699FF' : '#1BC5BD'
                            }}
                          >
                            {(u.nombres?.[0] || u.username?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <span className='font-weight-bolder text-dark d-block'>
                              {u.nombres || u.username}
                            </span>
                            <span className='text-muted font-size-sm'>@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td>
                        <span className='text-dark-75 font-size-sm'>{u.email || '—'}</span>
                        {u.email_verificado ? (
                          <span className='label label-light-success label-inline ml-2'>✓</span>
                        ) : (
                          <span className='label label-light-warning label-inline ml-2'>Pendiente</span>
                        )}
                      </td>

                      {/* Rol - editable */}
                      <td>
                        {u.role_nivel === 1 ? (
                          <span className={`badge ${BADGE_ROL[u.role_nivel]} badge-pill px-3 py-2`}>
                            {ICONO_ROL[u.role_nivel]} {u.role_nombre}
                          </span>
                        ) : (
                          <select
                            className='form-control form-control-sm form-control-solid'
                            style={{minWidth: 150}}
                            value={u.role_id || ''}
                            onChange={(e) => cambiarRol(u.id, e.target.value)}
                          >
                            <option value=''>Sin rol</option>
                            {roles
                              .filter((r) => r.nivel > 1)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {ICONO_ROL[r.nivel]} {r.nombre}
                                </option>
                              ))}
                          </select>
                        )}
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={`label label-lg label-inline font-weight-bold ${u.activo ? 'label-light-success' : 'label-light-danger'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Perfil */}
                      <td>
                        <span className={`label label-inline ${u.perfil_completo ? 'label-light-success' : 'label-light-warning'}`}>
                          {u.perfil_completo ? 'Completo' : 'Incompleto'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className='text-right'>
                        {u.role_nivel !== 1 && (
                          <button
                            className={`btn btn-icon btn-sm ${u.activo ? 'btn-light-danger' : 'btn-light-success'}`}
                            title={u.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => toggleActivo(u.id, !u.activo)}
                          >
                            <i className={`fas ${u.activo ? 'fa-user-slash' : 'fa-user-check'}`} />
                          </button>
                        )}
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
  )
}