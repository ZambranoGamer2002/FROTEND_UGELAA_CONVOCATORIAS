/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'

const API_BASE = 'http://localhost:8000/api/v1'

const BADGE_ROL = {
  1: { bg: '#FFE2E5', color: '#F64E60' },
  2: { bg: '#FFF4DE', color: '#FFA800' },
  3: { bg: '#EEF6FF', color: '#3699FF' },
  4: { bg: '#E8FFF3', color: '#1BC5BD' },
  5: { bg: '#E8FFF3', color: '#1BC5BD' },
}

const MODO = { VER_EDITAR: 'editar', CREAR: 'crear' }
const PESTANA = { GENERAL: 'general', UBICACION: 'ubicacion', CONTRASENA: 'contrasena' }

// ── Modal de edición / creación ───────────────────────────────────────────────
function ModalUsuario({ modo, usuario, roles, token, onGuardado, onCerrar }) {
  const [pestana, setPestana] = useState(PESTANA.GENERAL)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [formPass, setFormPass] = useState({ nueva: '', confirmar: '' })
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [errorPass, setErrorPass] = useState('')
  const [exitoPass, setExitoPass] = useState('')

  // Departamentos / Provincias / Distritos
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])
  const [loadingProv, setLoadingProv] = useState(false)
  const [loadingDist, setLoadingDist] = useState(false)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // ── Estado del formulario ─────────────────────────────────────────────
  const [form, setForm] = useState({
    role_id: usuario?.role_id ?? '',
    activo: usuario?.activo ?? true,
    departamento_id: usuario?.departamento_id || '',
    provincia_id: usuario?.provincia_id || '',
    distrito_id: usuario?.distrito_id || '',
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    sexo: '',
    email: '',
    username: '',
    password: '',
    confirmar_password: '',
  })
  const [mostrarPassword, setMostrarPassword] = useState(false)

  // ── Cargar departamentos ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/ubigeo/departamentos`, { headers })
      .then(r => r.json())
      .then(d => setDepartamentos(d.data || []))
      .catch(() => { })
  }, []) // eslint-disable-line

  // ── Cargar provincias al cambiar departamento ─────────────────────────

  // Ref para saber si es la carga inicial o un cambio manual
  const esInicializacion = useRef(true)

  useEffect(() => {
    if (!form.departamento_id) {
      setProvincias([])
      setDistritos([])
      setForm(p => ({ ...p, provincia_id: '', distrito_id: '' }))
      esInicializacion.current = false
      return
    }
    setLoadingProv(true)
    fetch(`${API_BASE}/ubigeo/provincias?departamento_id=${form.departamento_id}`, { headers })
      .then(r => r.json())
      .then(d => {
        setProvincias(d.data || [])
        // Solo resetear si NO es la carga inicial
        if (!esInicializacion.current) {
          setForm(p => ({ ...p, provincia_id: '', distrito_id: '' }))
        }
        esInicializacion.current = false
      })
      .catch(() => { })
      .finally(() => setLoadingProv(false))
  }, [form.departamento_id]) // eslint-disable-line

  // ── Cargar distritos al cambiar provincia ─────────────────────────────
  useEffect(() => {
    if (!form.provincia_id || form.provincia_id === '') {
      setDistritos([])
      setForm(p => ({ ...p, distrito_id: '' }))
      return
    }
    setLoadingDist(true)
    fetch(`${API_BASE}/ubigeo/distritos/${form.provincia_id}`, { headers })
      .then(r => r.json())
      .then(d => {
        setDistritos(d.data || [])
      })
      .catch(() => { })
      .finally(() => setLoadingDist(false))
  }, [form.provincia_id]) // eslint-disable-line

  // ── Precargar ubigeo si estamos editando ──────────────────────────────
  useEffect(() => {
    if (modo !== MODO.VER_EDITAR || !usuario?.departamento_id) return

    // Cargar provincias del departamento del usuario
    setLoadingProv(true)
    fetch(`${API_BASE}/ubigeo/provincias?departamento_id=${usuario.departamento_id}`, { headers })
      .then(r => r.json())
      .then(d => {
        setProvincias(d.data || [])
        // Cargar distritos de la provincia del usuario
        if (usuario.provincia_id) {
          setLoadingDist(true)
          return fetch(`${API_BASE}/ubigeo/distritos/${usuario.provincia_id}`, { headers })
            .then(r => r.json())
            .then(d2 => setDistritos(d2.data || []))
            .finally(() => setLoadingDist(false))
        }
      })
      .catch(() => { })
      .finally(() => setLoadingProv(false))
  }, []) // eslint-disable-line

  const handleChange = (e) => {
    const name = e.target.name
    const value = e.target.value
    const type = e.target.type
    const checked = e.target.checked

    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  // ── Guardar ───────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setError('')

    if (modo === MODO.CREAR) {
      // Validaciones básicas
      if (!form.numero_documento || !form.nombres || !form.apellido_paterno ||
        !form.fecha_nacimiento || !form.sexo || !form.email ||
        !form.username || !form.password) {
        setError('Completa todos los campos obligatorios')
        return
      }
      if (form.password !== form.confirmar_password) {
        setError('Las contraseñas no coinciden')
        return
      }
      if (form.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres')
        return
      }
      if (!form.departamento_id || !form.provincia_id || !form.distrito_id) {
        setError('Debes seleccionar departamento, provincia y distrito')
        setPestana(PESTANA.UBICACION)
        return
      }

      setGuardando(true)
      try {
        const resp = await fetch(`${API_BASE}/usuarios/crear`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            tipo_documento: form.tipo_documento,
            numero_documento: form.numero_documento,
            nombres: form.nombres,
            apellido_paterno: form.apellido_paterno,
            apellido_materno: form.apellido_materno,
            fecha_nacimiento: form.fecha_nacimiento,
            sexo: form.sexo,
            email: form.email,
            username: form.username,
            password: form.password,
            departamento_id: parseInt(form.departamento_id),
            provincia_id: parseInt(form.provincia_id),
            distrito_id: parseInt(form.distrito_id),
            role_id: form.role_id ? parseInt(form.role_id) : null,
          }),
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.detail || 'Error al crear usuario')
        onGuardado('success', data.message)
      } catch (err) {
        setError(err.message)
      } finally {
        setGuardando(false)
      }

    } else {
      // Modo edición — dos llamadas independientes
      setGuardando(true)
      try {
        const promesas = []

        // ── Cambiar rol si cambió ─────────────────────────────────────────
        if (form.role_id && parseInt(form.role_id) !== usuario.role_id) {
          promesas.push(
            fetch(`${API_BASE}/usuarios/${usuario.id}/rol`, {
              method: 'PUT', headers,
              body: JSON.stringify({
                role_id: parseInt(form.role_id),
                provincia_id: form.provincia_id ? parseInt(form.provincia_id) : null,
                // ↑ Si el nuevo rol es Admin (nivel 2), el backend usará este valor.
                // Si es null, el backend intentará resolverlo desde datos_personales.
              }),
            }).then(r => r.json())
          )
        }

        // ── Cambiar activo si cambió ──────────────────────────────────────
        if (form.activo !== usuario.activo) {
          promesas.push(
            fetch(`${API_BASE}/usuarios/${usuario.id}/toggle-activo`, {
              method: 'PUT', headers,
              body: JSON.stringify({ activo: form.activo }),
            }).then(r => r.json())
          )
        }

        // ── Cambiar ubicación si cambió algo ──────────────────────────────
        const ubigeoChanged =
          parseInt(form.departamento_id) !== usuario.departamento_id ||
          parseInt(form.provincia_id) !== usuario.provincia_id ||
          parseInt(form.distrito_id) !== usuario.distrito_id

        if (ubigeoChanged) {
          promesas.push(
            fetch(`${API_BASE}/usuarios/${usuario.id}/ubicacion`, {
              method: 'PUT', headers,
              body: JSON.stringify({
                departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
                provincia_id: form.provincia_id ? parseInt(form.provincia_id) : null,
                distrito_id: form.distrito_id ? parseInt(form.distrito_id) : null,
              }),
            }).then(r => r.json())
          )
        }

        if (promesas.length === 0) {
          onCerrar()
          return
        }

        const resultados = await Promise.all(promesas)
        const falló = resultados.find(r => r.detail || r.success === false)
        if (falló) throw new Error(falló.detail || falló.error || 'Error desconocido')

        onGuardado('success', 'Usuario actualizado correctamente')

      } catch (err) {
        setError(err.message)
      } finally {
        setGuardando(false)
      }
    }
  }

  const esCrear = modo === MODO.CREAR

  return (
    <div
      className='modal fade show d-block'
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        className='modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable'
        onClick={e => e.stopPropagation()}
      >
        <div className='modal-content'>

          {/* Header */}
          <div className='modal-header' style={{ borderBottom: '1px solid #EBEDF3' }}>
            <div className='d-flex align-items-center' style={{ gap: 12 }}>
              <div
                className='d-flex align-items-center justify-content-center rounded-circle'
                style={{
                  width: 42, height: 42,
                  background: esCrear ? '#E8FFF3' : '#EEF6FF',
                  flexShrink: 0
                }}
              >
                <i
                  className={`fas ${esCrear ? 'fa-user-plus' : 'fa-user-edit'}`}
                  style={{ color: esCrear ? '#1BC5BD' : '#3699FF', fontSize: 16 }}
                />
              </div>
              <div>
                <h5 className='modal-title font-weight-bolder mb-0'>
                  {esCrear ? 'Nuevo Usuario' : `Editar: ${usuario?.username}`}
                </h5>
                <span className='text-muted font-size-sm'>
                  {esCrear
                    ? 'El docente podrá verificar su correo después del primer inicio de sesión'
                    : `${usuario?.nombres} ${usuario?.apellidos}`
                  }
                </span>
              </div>
            </div>
            <button
              type='button'
              className='close'
              onClick={onCerrar}
              style={{ outline: 'none' }}
            >
              <i className='fas fa-times' />
            </button>
          </div>

          {/* Pestañas */}
          <ul className='nav nav-tabs px-6 border-bottom-0'>
            <li className='nav-item'>
              <button
                className={`nav-link border-0 font-weight-bold ${pestana === PESTANA.GENERAL ? 'active' : ''}`}
                onClick={() => setPestana(PESTANA.GENERAL)}
                style={{ background: 'none', cursor: 'pointer' }}
              >
                <i className='fas fa-user mr-2' />
                General
              </button>
            </li>
            <li className='nav-item'>
              <button
                className={`nav-link border-0 font-weight-bold ${pestana === PESTANA.UBICACION ? 'active' : ''}`}
                onClick={() => setPestana(PESTANA.UBICACION)}
                style={{ background: 'none', cursor: 'pointer' }}
              >
                <i className='fas fa-map-marker-alt mr-2' />
                Ubicación
              </button>
            </li>

            {/* Solo visible en modo edición */}
            {!esCrear && (
              <li className='nav-item'>
                <button
                  className={`nav-link border-0 font-weight-bold ${pestana === PESTANA.CONTRASENA ? 'active' : ''}`}
                  onClick={() => setPestana(PESTANA.CONTRASENA)}
                  style={{ background: 'none', cursor: 'pointer' }}
                >
                  <i className='fas fa-key mr-2' />
                  Contraseña
                </button>
              </li>
            )}
          </ul>

          {/* Body */}
          <div className='modal-body' style={{ padding: '24px' }}>

            {error && (
              <div
                className='alert d-flex align-items-center mb-5'
                style={{ background: '#FFF5F8', border: '1px solid #F64E60', borderRadius: 8 }}
              >
                <i className='fas fa-exclamation-circle mr-3' style={{ color: '#F64E60' }} />
                <span style={{ color: '#F64E60', fontSize: 13 }}>{error}</span>
              </div>
            )}

            {/* ── PESTAÑA GENERAL ── */}
            {pestana === PESTANA.GENERAL && (
              <div>
                {/* Solo en creación: datos personales */}
                {esCrear && (
                  <>
                    <div className='row'>
                      <div className='col-md-4'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Tipo documento <span className='text-danger'>*</span>
                          </label>
                          <select
                            name='tipo_documento'
                            className='form-control'
                            value={form.tipo_documento}
                            onChange={handleChange}
                          >
                            <option value='DNI'>DNI</option>
                            <option value='CE'>Carnet de extranjería</option>
                          </select>
                        </div>
                      </div>
                      <div className='col-md-8'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Número de documento <span className='text-danger'>*</span>
                          </label>
                          <input
                            type='text'
                            name='numero_documento'
                            className='form-control'
                            value={form.numero_documento}
                            onChange={handleChange}
                            placeholder='Ej: 12345678'
                            maxLength={form.tipo_documento === 'DNI' ? 8 : 12}
                          />
                        </div>
                      </div>
                    </div>

                    <div className='form-group'>
                      <label className='font-weight-bold font-size-sm'>
                        Nombres <span className='text-danger'>*</span>
                      </label>
                      <input
                        type='text'
                        name='nombres'
                        className='form-control'
                        value={form.nombres}
                        onChange={handleChange}
                        placeholder='Nombres completos'
                      />
                    </div>

                    <div className='row'>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Apellido paterno <span className='text-danger'>*</span>
                          </label>
                          <input
                            type='text'
                            name='apellido_paterno'
                            className='form-control'
                            value={form.apellido_paterno}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Apellido materno
                          </label>
                          <input
                            type='text'
                            name='apellido_materno'
                            className='form-control'
                            value={form.apellido_materno}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className='row'>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Fecha de nacimiento <span className='text-danger'>*</span>
                          </label>
                          <input
                            type='date'
                            name='fecha_nacimiento'
                            className='form-control'
                            value={form.fecha_nacimiento}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Sexo <span className='text-danger'>*</span>
                          </label>
                          <select
                            name='sexo'
                            className='form-control'
                            value={form.sexo}
                            onChange={handleChange}
                          >
                            <option value=''>Seleccionar...</option>
                            <option value='M'>Masculino</option>
                            <option value='F'>Femenino</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className='separator separator-dashed my-5' />
                    <div className='font-weight-bold text-muted font-size-sm mb-4 text-uppercase'>
                      Datos de acceso
                    </div>

                    <div className='row'>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Correo electrónico <span className='text-danger'>*</span>
                          </label>
                          <input
                            type='email'
                            name='email'
                            className='form-control'
                            value={form.email}
                            onChange={handleChange}
                            placeholder='ejemplo@correo.com'
                          />
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Nombre de usuario <span className='text-danger'>*</span>
                          </label>
                          <input
                            type='text'
                            name='username'
                            className='form-control'
                            value={form.username}
                            onChange={handleChange}
                            placeholder='Ej: jperez'
                          />
                        </div>
                      </div>
                    </div>

                    <div className='row'>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Contraseña <span className='text-danger'>*</span>
                          </label>
                          <div className='input-group'>
                            <input
                              type={mostrarPassword ? 'text' : 'password'}
                              name='password'
                              className='form-control'
                              value={form.password}
                              onChange={handleChange}
                              placeholder='Mínimo 8 caracteres'
                            />
                            <div className='input-group-append'>
                              <button
                                type='button'
                                className='btn btn-light border'
                                onClick={() => setMostrarPassword(p => !p)}
                              >
                                <i className={`fas ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='form-group'>
                          <label className='font-weight-bold font-size-sm'>
                            Confirmar contraseña <span className='text-danger'>*</span>
                          </label>
                          <input
                            type={mostrarPassword ? 'text' : 'password'}
                            name='confirmar_password'
                            className='form-control'
                            value={form.confirmar_password}
                            onChange={handleChange}
                            placeholder='Repite la contraseña'
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Rol — siempre visible */}
                <div className='form-group'>
                  <label className='font-weight-bold font-size-sm'>Rol</label>
                  <select
                    name='role_id'
                    className='form-control'
                    value={form.role_id}
                    onChange={handleChange}
                  >
                    <option value=''>Sin rol</option>
                    {roles.filter(r => r.nivel > 1).map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Activo — solo en edición */}
                {!esCrear && (
                  <div
                    className='d-flex align-items-center justify-content-between rounded p-4'
                    style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}
                  >
                    <div>
                      <div className='font-weight-bold font-size-sm'>Estado de la cuenta</div>
                      <div className='text-muted font-size-sm mt-1'>
                        {form.activo
                          ? 'El usuario puede iniciar sesión normalmente'
                          : 'El usuario no puede acceder al sistema'
                        }
                      </div>
                    </div>
                    <div className='d-flex align-items-center' style={{ gap: 10 }}>
                      <span
                        className='font-size-sm font-weight-bold'
                        style={{ color: form.activo ? '#1BC5BD' : '#F64E60' }}
                      >
                        {form.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <div
                        onClick={() => setForm(p => ({ ...p, activo: !p.activo }))}
                        style={{
                          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                          background: form.activo ? '#1BC5BD' : '#D1D3E0',
                          position: 'relative', transition: 'background 0.2s'
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3,
                          left: form.activo ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PESTAÑA UBICACIÓN ── */}
            {pestana === PESTANA.UBICACION && (
              <div>
                <div
                  className='rounded p-4 mb-5 d-flex align-items-start'
                  style={{ background: '#EEF6FF', border: '1px solid #3699FF20' }}
                >
                  <i className='fas fa-info-circle mr-3 mt-1' style={{ color: '#3699FF' }} />
                  <span className='text-muted font-size-sm'>
                    {usuario?.role_nivel === 2 ? (
                      <>
                        Ubicación geográfica del <strong>Administrador</strong>.
                        Al guardar, también se actualizará la <strong>provincia UGEL</strong> que administra.
                      </>
                    ) : (
                      <>
                        Ubicación geográfica del usuario{' '}
                        <strong>(departamento / provincia / distrito)</strong>.
                      </>
                    )}
                  </span>
                </div>

                {/* Departamento */}
                <div className='form-group'>
                  <label className='font-weight-bold font-size-sm'>
                    Departamento <span className='text-danger'>*</span>
                  </label>
                  <select
                    name='departamento_id'
                    className='form-control'
                    value={form.departamento_id}
                    onChange={handleChange}
                  >
                    <option value=''>Seleccionar departamento...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Provincia */}
                <div className='form-group'>
                  <label
                    className='font-weight-bold font-size-sm'
                    style={{ color: form.departamento_id ? '#3F4254' : '#B5B5C3' }}
                  >
                    Provincia <span className='text-danger'>*</span>
                  </label>
                  {loadingProv ? (
                    <div className='d-flex align-items-center' style={{ gap: 8, height: 38 }}>
                      <span className='spinner-border spinner-border-sm text-primary' />
                      <span className='text-muted font-size-sm'>Cargando provincias...</span>
                    </div>
                  ) : (
                    <select
                      name='provincia_id'
                      className='form-control'
                      value={form.provincia_id}
                      onChange={handleChange}
                      disabled={!form.departamento_id}
                      style={{ background: !form.departamento_id ? '#F3F6F9' : '#fff' }}
                    >
                      <option value=''>
                        {form.departamento_id
                          ? 'Seleccionar provincia...'
                          : 'Primero selecciona un departamento'}
                      </option>
                      {provincias.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Distrito */}
                <div className='form-group mb-0'>
                  <label
                    className='font-weight-bold font-size-sm'
                    style={{ color: form.provincia_id ? '#3F4254' : '#B5B5C3' }}
                  >
                    Distrito <span className='text-danger'>*</span>
                  </label>
                  {loadingDist ? (
                    <div className='d-flex align-items-center' style={{ gap: 8, height: 38 }}>
                      <span className='spinner-border spinner-border-sm text-primary' />
                      <span className='text-muted font-size-sm'>Cargando distritos...</span>
                    </div>
                  ) : (
                    <select
                      name='distrito_id'
                      className='form-control'
                      value={form.distrito_id}
                      onChange={handleChange}
                      disabled={!form.provincia_id}
                      style={{ background: !form.provincia_id ? '#F3F6F9' : '#fff' }}
                    >
                      <option value=''>
                        {form.provincia_id
                          ? 'Seleccionar distrito...'
                          : 'Primero selecciona una provincia'}
                      </option>
                      {distritos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* ── PESTAÑA CONTRASEÑA ── */}
            {pestana === PESTANA.CONTRASENA && !esCrear && (
              <div>
                <div
                  className='rounded p-4 mb-5 d-flex align-items-start'
                  style={{ background: '#FFF4DE', border: '1px solid #FFA80030' }}
                >
                  <i className='fas fa-exclamation-triangle mr-3 mt-1' style={{ color: '#FFA800' }} />
                  <span className='font-size-sm' style={{ color: '#7E6300' }}>
                    Estás cambiando la contraseña de <strong>{usuario?.username}</strong> directamente.
                    El docente deberá usar esta nueva contraseña en su próximo inicio de sesión.
                  </span>
                </div>

                {errorPass && (
                  <div
                    className='alert d-flex align-items-center mb-4'
                    style={{ background: '#FFF5F8', border: '1px solid #F64E60', borderRadius: 8 }}
                  >
                    <i className='fas fa-exclamation-circle mr-3' style={{ color: '#F64E60' }} />
                    <span style={{ color: '#F64E60', fontSize: 13 }}>{errorPass}</span>
                  </div>
                )}

                {exitoPass && (
                  <div
                    className='alert d-flex align-items-center mb-4'
                    style={{ background: '#E8FFF3', border: '1px solid #1BC5BD', borderRadius: 8 }}
                  >
                    <i className='fas fa-check-circle mr-3' style={{ color: '#1BC5BD' }} />
                    <span style={{ color: '#1BC5BD', fontSize: 13 }}>{exitoPass}</span>
                  </div>
                )}

                {/* Nueva contraseña */}
                <div className='form-group'>
                  <label className='font-weight-bold font-size-sm'>
                    Nueva contraseña <span className='text-danger'>*</span>
                  </label>
                  <div className='input-group'>
                    <input
                      type={mostrarNuevaPass ? 'text' : 'password'}
                      className='form-control'
                      value={formPass.nueva}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormPass(p => ({ ...p, nueva: value }))
                        setErrorPass('')
                        setExitoPass('')
                      }}

                      placeholder='Mínimo 8 caracteres'
                    />
                    <div className='input-group-append'>
                      <button
                        type='button'
                        className='btn btn-light border'
                        onClick={() => setMostrarNuevaPass(p => !p)}
                      >
                        <i className={`fas ${mostrarNuevaPass ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Indicador de fortaleza */}
                  {formPass.nueva && (
                    <div className='mt-2'>
                      {(() => {
                        const v = formPass.nueva
                        const fuerte = v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v)
                        const media = v.length >= 8
                        return (
                          <div className='d-flex align-items-center' style={{ gap: 8 }}>
                            <div style={{
                              height: 4, flex: 1, borderRadius: 2,
                              background: v.length > 0 ? (fuerte ? '#1BC5BD' : media ? '#FFA800' : '#F64E60') : '#EBEDF3'
                            }} />
                            <span className='font-size-xs font-weight-bold' style={{
                              color: fuerte ? '#1BC5BD' : media ? '#FFA800' : '#F64E60'
                            }}>
                              {fuerte ? 'Fuerte' : media ? 'Media' : 'Débil'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                {/* Confirmar contraseña */}
                <div className='form-group'>
                  <label className='font-weight-bold font-size-sm'>
                    Confirmar contraseña <span className='text-danger'>*</span>
                  </label>
                  <input
                    type={mostrarNuevaPass ? 'text' : 'password'}
                    className='form-control'
                    value={formPass.confirmar}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormPass(p => ({ ...p, confirmar: value }))
                      setErrorPass('')
                      setExitoPass('')
                    }}
                    placeholder='Repite la nueva contraseña'
                    style={{
                      borderColor: formPass.confirmar
                        ? formPass.nueva === formPass.confirmar ? '#1BC5BD' : '#F64E60'
                        : ''
                    }}
                  />
                  {formPass.confirmar && formPass.nueva !== formPass.confirmar && (
                    <small style={{ color: '#F64E60' }}>Las contraseñas no coinciden</small>
                  )}
                  {formPass.confirmar && formPass.nueva === formPass.confirmar && (
                    <small style={{ color: '#1BC5BD' }}>
                      <i className='fas fa-check mr-1' />Las contraseñas coinciden
                    </small>
                  )}
                </div>

                {/* Botón propio de esta pestaña */}
                <button
                  type='button'
                  className='btn btn-warning font-weight-bold w-100 mt-2'
                  disabled={guardandoPass || !formPass.nueva || formPass.nueva !== formPass.confirmar}
                  onClick={async () => {
                    if (formPass.nueva.length < 8) {
                      setErrorPass('La contraseña debe tener al menos 8 caracteres')
                      return
                    }
                    setGuardandoPass(true)
                    setErrorPass('')
                    setExitoPass('')
                    try {
                      const resp = await fetch(`${API_BASE}/usuarios/${usuario.id}/password`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify({ nueva_password: formPass.nueva }),
                      })
                      const data = await resp.json()
                      if (!resp.ok) throw new Error(data.detail || 'Error al actualizar')
                      setExitoPass(data.message)
                      setFormPass({ nueva: '', confirmar: '' })
                    } catch (err) {
                      setErrorPass(err.message)
                    } finally {
                      setGuardandoPass(false)
                    }
                  }}
                >
                  {guardandoPass ? (
                    <>
                      <span className='spinner-border spinner-border-sm mr-2' />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <i className='fas fa-key mr-2' />
                      Actualizar contraseña
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

          {/* Footer */}
          <div
            className='modal-footer d-flex justify-content-between'
            style={{ borderTop: '1px solid #EBEDF3' }}
          >
            <button
              type='button'
              className='btn btn-light font-weight-bold'
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type='button'
              className='btn btn-primary font-weight-bold px-8'
              onClick={handleGuardar}
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span className='spinner-border spinner-border-sm mr-2' />
                  Guardando...
                </>
              ) : (
                <>
                  <i className={`fas ${esCrear ? 'fa-user-plus' : 'fa-save'} mr-2`} />
                  {esCrear ? 'Crear usuario' : 'Guardar cambios'}
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}


// ── Componente principal ──────────────────────────────────────────────────────
export default function GestionUsuarios() {
  const auth = useSelector((s) => s.auth)
  const token = auth?.authToken || ''

  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)   // { modo, usuario }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const mostrarToast = (tipo, mensaje) => {
    setToast({ tipo, mensaje })
    setTimeout(() => setToast(null), 3500)
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [resU, resR] = await Promise.all([
        fetch(`${API_BASE}/usuarios/`, { headers }),
        fetch(`${API_BASE}/roles/`, { headers }),
      ])
      const [dataU, dataR] = await Promise.all([resU.json(), resR.json()])
      setUsuarios(Array.isArray(dataU) ? dataU : [])
      setRoles(Array.isArray(dataR) ? dataR : [])
    } catch {
      mostrarToast('danger', 'Error al cargar usuarios')
    } finally {
      setCargando(false)
    }
  }, [token]) // eslint-disable-line

  useEffect(() => { cargarDatos() }, [cargarDatos])

  const abrirEditar = (usuario) => setModal({ modo: MODO.VER_EDITAR, usuario })
  const abrirCrear = () => setModal({ modo: MODO.CREAR, usuario: null })
  const cerrarModal = () => setModal(null)

  const onGuardado = (tipo, mensaje) => {
    cerrarModal()
    mostrarToast(tipo, mensaje)
    cargarDatos()
  }

  // ── Filtrar ───────────────────────────────────────────────────────────
  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = busqueda.toLowerCase()
    const coincideTexto =
      !texto ||
      u.username?.toLowerCase().includes(texto) ||
      u.nombres?.toLowerCase().includes(texto) ||
      u.apellidos?.toLowerCase().includes(texto) ||
      u.email?.toLowerCase().includes(texto) ||
      u.numero_documento?.toLowerCase().includes(texto)
    const coincideRol = !filtroRol || String(u.role_id) === filtroRol
    return coincideTexto && coincideRol
  })

  return (
    <div className='container-fluid px-0'>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`alert alert-${toast.tipo}`}
          style={{
            position: 'fixed', top: 80, right: 20, zIndex: 9999,
            minWidth: 300, boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            borderRadius: 8
          }}
        >
          {toast.tipo === 'success' ? '✅' : '⚠️'} {toast.mensaje}
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <ModalUsuario
          modo={modal.modo}
          usuario={modal.usuario}
          roles={roles}
          token={token}
          onGuardado={onGuardado}
          onCerrar={cerrarModal}
        />
      )}

      {/* ── Header ── */}
      <div className='d-flex align-items-center justify-content-between mb-6'>
        <div>
          <h3 className='font-weight-bolder text-dark mb-1'>Gestión de Usuarios</h3>
          <span className='text-muted font-size-sm'>
            {usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''} encontrado{usuariosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className='d-flex' style={{ gap: 8 }}>
          <button className='btn btn-light-primary font-weight-bold' onClick={cargarDatos}>
            <i className='fas fa-sync-alt mr-2' />Actualizar
          </button>
          <button className='btn btn-primary font-weight-bold' onClick={abrirCrear}>
            <i className='fas fa-user-plus mr-2' />Nuevo usuario
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
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
                  placeholder='Buscar por nombre, usuario, DNI o correo...'
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

      {/* ── Tabla ── */}
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
                    <th style={{ minWidth: 220 }}>USUARIO</th>
                    <th style={{ minWidth: 180 }}>CORREO</th>
                    <th style={{ minWidth: 140 }}>ROL</th>
                    <th style={{ minWidth: 180 }}>UBICACIÓN</th>
                    <th style={{ minWidth: 100 }}>ESTADO</th>
                    <th style={{ minWidth: 80 }}>PERFIL</th>
                    <th style={{ minWidth: 80 }} className='text-right'>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => {
                    const badgeStyle = BADGE_ROL[u.role_nivel] || BADGE_ROL[5]
                    return (
                      <tr key={u.id}>

                        {/* ── Usuario ── */}
                        <td>
                          <div className='d-flex align-items-center'>
                            <div
                              className='d-flex align-items-center justify-content-center rounded-circle font-weight-bold text-white mr-3'
                              style={{
                                width: 40, height: 40, flexShrink: 0,
                                background:
                                  u.role_nivel === 1 ? '#F64E60' :
                                    u.role_nivel === 2 ? '#FFA800' :
                                      u.role_nivel === 3 ? '#3699FF' : '#1BC5BD',
                              }}
                            >
                              {(u.nombres?.[0] || u.username?.[0] || '?').toUpperCase()}
                            </div>
                            <div>
                              <span className='font-weight-bolder text-dark d-block'>
                                {u.nombres
                                  ? `${u.nombres} ${u.apellidos}`
                                  : u.username
                                }
                              </span>
                              <span className='text-muted font-size-sm'>
                                @{u.username}
                                {u.numero_documento && (
                                  <span className='ml-2 text-muted'>
                                    · {u.numero_documento}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ── Email ── */}
                        <td>
                          <span className='text-dark-75 font-size-sm d-block'>
                            {u.email || '—'}
                          </span>
                          {u.email_verificado ? (
                            <span className='label label-light-success label-inline font-size-xs'>
                              Verificado
                            </span>
                          ) : (
                            <span className='label label-light-warning label-inline font-size-xs'>
                              Pendiente
                            </span>
                          )}
                        </td>

                        {/* ── Rol ── */}
                        <td>
                          <span
                            className='label label-inline font-weight-bold font-size-sm px-3 py-2'
                            style={{
                              background: badgeStyle.bg,
                              color: badgeStyle.color,
                              borderRadius: 6
                            }}
                          >
                            {u.role_nombre || 'Sin rol'}
                          </span>
                        </td>

                        {/* ── Ubicación ── */}
                        <td>
                          {u.distrito || u.provincia || u.departamento ? (
                            <div>
                              <span className='font-weight-bold text-dark font-size-sm d-block'>
                                {u.distrito || '—'}
                              </span>
                              <span className='text-muted font-size-xs'>
                                {[u.provincia, u.departamento]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </div>
                          ) : (
                            <span className='text-muted font-size-sm'>Sin ubicación</span>
                          )}
                        </td>

                        {/* ── Estado ── */}
                        <td>
                          <span
                            className={`label label-lg label-inline font-weight-bold ${u.activo ? 'label-light-success' : 'label-light-danger'
                              }`}
                          >
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>

                        {/* ── Perfil ── */}
                        <td>
                          <span
                            className={`label label-inline ${u.perfil_completo
                              ? 'label-light-success'
                              : 'label-light-warning'
                              }`}
                          >
                            {u.perfil_completo ? 'Completo' : 'Incompleto'}
                          </span>
                        </td>

                        {/* ── Acciones ── */}
                        <td className='text-right'>
                          <button
                            className='btn btn-icon btn-sm btn-light-primary'
                            title='Editar usuario'
                            onClick={() => abrirEditar(u)}
                          >
                            <i className='fas fa-pen' />
                          </button>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}