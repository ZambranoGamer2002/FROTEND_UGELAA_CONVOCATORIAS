import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

// Cambia esta ruta si tu selección de plaza está registrada con otro path.
const NEXT_ROUTE = '/seleccion-plaza'

const AUTH_SET_USER_ACTION = '[Set User] Action'

const IconCheck = ({ size = 26, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2.5'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
)

const IconAlert = ({ size = 22, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <line x1='12' y1='8' x2='12' y2='12' />
    <line x1='12' y1='16' x2='12.01' y2='16' />
  </svg>
)

const IconFile = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
    <polyline points='14 2 14 8 20 8' />
    <line x1='16' y1='13' x2='8' y2='13' />
    <line x1='16' y1='17' x2='8' y2='17' />
    <polyline points='10 9 9 9 8 9' />
  </svg>
)

const IconInfo = ({ size = 22, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <circle cx='12' cy='12' r='10' />
    <line x1='12' y1='16' x2='12' y2='12' />
    <line x1='12' y1='8' x2='12.01' y2='8' />
  </svg>
)

const IconArrowRight = ({ size = 20, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2.3'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='5' y1='12' x2='19' y2='12' />
    <polyline points='12 5 19 12 12 19' />
  </svg>
)

const IconUser = ({ size = 24, color = 'currentColor' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke={color}
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M20 21a8 8 0 0 0-16 0' />
    <circle cx='12' cy='7' r='4' />
  </svg>
)

const getErrorMessage = (data) => {
  if (!data) return 'Ocurrió un error inesperado.'

  if (typeof data.detail === 'string') return data.detail

  if (data.detail?.mensaje) return data.detail.mensaje

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item?.msg || item?.message || 'Error de validación')
      .join(', ')
  }

  if (data.message) return data.message

  return 'No se pudo completar el perfil.'
}

const updateLocalStorageUser = (updatedUser) => {
  try {
    localStorage.setItem('user', JSON.stringify(updatedUser))
  } catch (err) {
    console.warn('No se pudo actualizar el usuario en localStorage:', err)
  }
}

const pickValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return ''
}

const normalizeProfileResponse = (data) => {
  const root = data || {}
  const perfil = root.perfil || root.data || root
  const datosPersonales = perfil.datos_personales || perfil.datosPersonales || {}
  const ubicacion = perfil.ubicacion || {}
  const usuario = perfil.usuario || {}

  return {
    ...perfil,
    ...datosPersonales,
    usuario,
    ubicacion,
  }
}

const ErrorNotice = ({ message }) => {
  if (!message) return null

  return (
    <div
      className='mb-8'
      style={{
        border: '1px solid #F5C6CB',
        background: '#FFF5F5',
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <div className='d-flex align-items-start'>
        <div
          className='d-flex align-items-center justify-content-center mr-4'
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: '#DC3545',
            color: '#fff',
            flex: '0 0 42px',
          }}
        >
          <IconAlert size={22} color='#fff' />
        </div>

        <div>
          <div className='font-weight-bolder text-danger mb-1'>
            No se pudo guardar el perfil
          </div>
          <div className='text-dark-75 font-size-sm'>
            {message}
          </div>
        </div>
      </div>
    </div>
  )
}

const InfoNotice = () => (
  <div className='alert alert-custom alert-light-primary mb-8'>
    <div className='alert-icon'>
      <IconInfo size={24} color='#3699FF' />
    </div>
    <div className='alert-text'>
      <strong>Importante:</strong> Debes completar estos datos para poder acceder a las convocatorias y postulaciones.
      Todos los campos son obligatorios.
    </div>
  </div>
)

const PerfilCompletoNotice = ({ onContinue }) => {
  return (
    <div
      className='mb-8'
      style={{
        border: '1px solid #D1FAE5',
        background: 'linear-gradient(135deg, #ECFDF5 0%, #F8FFFC 100%)',
        borderRadius: 16,
        padding: '22px 24px',
        boxShadow: '0 10px 25px rgba(16, 185, 129, 0.12)',
      }}
    >
      <div className='d-flex align-items-start flex-wrap'>
        <div
          className='d-flex align-items-center justify-content-center mr-4 mb-3'
          style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: '#10B981',
            color: '#fff',
            flex: '0 0 54px',
            boxShadow: '0 8px 18px rgba(16, 185, 129, 0.22)',
          }}
        >
          <IconUser size={26} color='#fff' />
        </div>

        <div className='flex-grow-1 mb-3'>
          <div className='font-weight-bolder text-dark mb-1' style={{ fontSize: 17 }}>
            Tu perfil ya se encuentra completo
          </div>

          <div className='text-muted font-size-sm'>
            Puedes revisar o actualizar tus datos. También puedes continuar directamente con la selección de plaza.
          </div>
        </div>

        <button
          type='button'
          className='btn btn-success font-weight-bold px-6 py-3'
          onClick={onContinue}
        >
          <span className='mr-2'>Continuar a selección de plaza</span>
          <IconArrowRight size={18} color='#fff' />
        </button>
      </div>
    </div>
  )
}

const SuccessActionModal = ({ archivo, modo }) => {
  const esActualizacion = modo === 'actualizacion'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 24, 39, 0.58)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: '#fff',
          borderRadius: 18,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 8,
            background: 'linear-gradient(90deg, #1E3A5F 0%, #10B981 100%)',
          }}
        />

        <div style={{ padding: '34px 34px 30px' }}>
          <div className='d-flex justify-content-center mb-6'>
            <div
              className='d-flex align-items-center justify-content-center'
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                border: '2px solid #A7F3D0',
                color: '#059669',
              }}
            >
              <IconCheck size={36} color='#059669' />
            </div>
          </div>

          <div className='text-center mb-5'>
            <h3 className='font-weight-bolder text-dark mb-3'>
              {esActualizacion ? 'Perfil actualizado correctamente' : 'Perfil guardado correctamente'}
            </h3>

            <p className='text-muted font-size-lg mb-0'>
              {esActualizacion
                ? 'Los datos del perfil fueron actualizados correctamente.'
                : 'El documento fue validado y los datos del perfil fueron actualizados.'}
            </p>
          </div>

          {archivo && (
            <div
              className='d-flex align-items-center mb-6'
              style={{
                backgroundColor: '#F3F6F9',
                borderRadius: 12,
                padding: '13px 15px',
              }}
            >
              <div
                className='d-flex align-items-center justify-content-center mr-3'
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: '#E1F0FF',
                  color: '#1E3A5F',
                  flex: '0 0 38px',
                }}
              >
                <IconFile size={20} color='#1E3A5F' />
              </div>

              <div>
                <div className='font-weight-bold text-dark font-size-sm'>
                  Documento validado
                </div>
                <div className='text-muted font-size-sm'>
                  {archivo}
                </div>
              </div>
            </div>
          )}

          <div
            className='mb-4'
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            <div className='font-weight-bolder text-dark mb-1'>
              Siguiente paso
            </div>
            <div className='text-muted font-size-sm'>
              Serás dirigido automáticamente a la selección de plaza.
            </div>
          </div>

          <div
            className='progress'
            style={{
              height: 7,
              borderRadius: 20,
              backgroundColor: '#E5E7EB',
              overflow: 'hidden',
            }}
          >
            <div
              className='progress-bar progress-bar-striped progress-bar-animated'
              role='progressbar'
              style={{
                width: '100%',
                backgroundColor: '#10B981',
              }}
            />
          </div>

          <div className='text-center text-success font-size-sm font-weight-bold mt-4'>
            Redirigiendo a selección de plaza
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompletarPerfilPage() {
  const history = useHistory()
  const dispatch = useDispatch()

  const auth = useSelector((s) => s.auth)
  const token = auth?.authToken || ''
  const user = auth?.user || {}

  const [celular, setCelular] = useState('')
  const [departamentoId, setDepartamentoId] = useState('')
  const [provinciaId, setProvinciaId] = useState('')
  const [distritoId, setDistritoId] = useState('')
  const [direccion, setDireccion] = useState('')
  const [documentoDNI, setDocumentoDNI] = useState(null)

  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])

  const [cargando, setCargando] = useState(false)
  const [cargandoPerfil, setCargandoPerfil] = useState(false)
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true)
  const [cargandoProvincias, setCargandoProvincias] = useState(false)
  const [cargandoDistritos, setCargandoDistritos] = useState(false)

  const [error, setError] = useState('')
  const [successInfo, setSuccessInfo] = useState(null)
  const [perfilCompleto, setPerfilCompleto] = useState(
    Boolean(user?.perfil_completo || user?.registro_completo)
  )

  const headers = { Authorization: `Bearer ${token}` }

  const irASeleccionPlaza = (replace = false) => {
    const navigationState = {
      desdePerfil: true,
      perfilCompletado: true,
    }

    if (replace) {
      history.replace({
        pathname: NEXT_ROUTE,
        state: navigationState,
      })
    } else {
      history.push({
        pathname: NEXT_ROUTE,
        state: navigationState,
      })
    }

    window.setTimeout(() => {
      if (window.location.pathname !== NEXT_ROUTE) {
        window.location.assign(NEXT_ROUTE)
      }
    }, 300)
  }

  const continuarASeleccionPlaza = () => {
    irASeleccionPlaza(false)
  }

  const cargarProvinciasPorDepartamento = async (deptId) => {
    if (!deptId) return []

    setCargandoProvincias(true)

    try {
      const resp = await fetch(`${API_BASE}/ubigeo/provincias/${deptId}`, { headers })
      const data = await resp.json().catch(() => ({}))
      const lista = Array.isArray(data) ? data : data.data || []

      setProvincias(lista)

      return lista
    } catch (err) {
      console.error('Error al cargar provincias:', err)
      setError('No se pudieron cargar las provincias.')
      return []
    } finally {
      setCargandoProvincias(false)
    }
  }

  const cargarDistritosPorProvincia = async (provId) => {
    if (!provId) return []

    setCargandoDistritos(true)

    try {
      const resp = await fetch(`${API_BASE}/ubigeo/distritos/${provId}`, { headers })
      const data = await resp.json().catch(() => ({}))
      const lista = Array.isArray(data) ? data : data.data || []

      setDistritos(lista)

      return lista
    } catch (err) {
      console.error('Error al cargar distritos:', err)
      setError('No se pudieron cargar los distritos.')
      return []
    } finally {
      setCargandoDistritos(false)
    }
  }

  const cargarDatosPerfil = async () => {
    if (!token) return

    setCargandoPerfil(true)

    try {
      const resp = await fetch(`${API_BASE}/perfil/mi-perfil`, { headers })
      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) return

      const perfil = normalizeProfileResponse(data)

      const celularValue = pickValue(
        perfil.celular,
        perfil.telefono,
        perfil.numero_celular
      )

      const direccionValue = pickValue(
        perfil.direccion,
        perfil.direccion_actual,
        perfil.domicilio
      )

      const departamentoValue = pickValue(
        perfil.departamento_id,
        perfil.ubicacion?.departamento_id,
        perfil.departamento?.id
      )

      const provinciaValue = pickValue(
        perfil.provincia_id,
        perfil.ubicacion?.provincia_id,
        perfil.provincia?.id
      )

      const distritoValue = pickValue(
        perfil.distrito_id,
        perfil.ubicacion?.distrito_id,
        perfil.distrito?.id
      )

      if (celularValue) setCelular(String(celularValue))
      if (direccionValue) setDireccion(String(direccionValue))

      if (departamentoValue) {
        setDepartamentoId(String(departamentoValue))
        await cargarProvinciasPorDepartamento(String(departamentoValue))
      }

      if (provinciaValue) {
        setProvinciaId(String(provinciaValue))
        await cargarDistritosPorProvincia(String(provinciaValue))
      }

      if (distritoValue) {
        setDistritoId(String(distritoValue))
      }

      const completo = Boolean(
        data?.perfil_completo ||
        data?.registro_completo ||
        perfil?.perfil_completo ||
        perfil?.registro_completo
      )

      if (completo) {
        setPerfilCompleto(true)
      }
    } catch (err) {
      console.warn('No se pudo cargar el perfil actual:', err)
    } finally {
      setCargandoPerfil(false)
    }
  }

  const verificarPerfilCompleto = async () => {
    if (!token) return

    try {
      const resp = await fetch(`${API_BASE}/perfil/verificar-completo`, { headers })
      const data = await resp.json().catch(() => ({}))

      if (resp.ok && data?.perfil_completo) {
        setPerfilCompleto(true)
      }
    } catch (err) {
      console.warn('No se pudo verificar si el perfil está completo:', err)
    }
  }

  useEffect(() => {
    const inicializar = async () => {
      if (!token) return

      setCargandoDepartamentos(true)

      try {
        const resp = await fetch(`${API_BASE}/ubigeo/departamentos`, { headers })
        const data = await resp.json().catch(() => ({}))
        setDepartamentos(Array.isArray(data) ? data : data.data || [])
      } catch (err) {
        console.error('Error al cargar departamentos:', err)
        setError('No se pudieron cargar los departamentos.')
      } finally {
        setCargandoDepartamentos(false)
      }

      await cargarDatosPerfil()
      await verificarPerfilCompleto()
    }

    inicializar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleDepartamentoChange = async (e) => {
    const deptId = e.target.value

    setDepartamentoId(deptId)
    setProvinciaId('')
    setDistritoId('')
    setProvincias([])
    setDistritos([])
    setError('')

    if (!deptId) return

    await cargarProvinciasPorDepartamento(deptId)
  }

  const handleProvinciaChange = async (e) => {
    const provId = e.target.value

    setProvinciaId(provId)
    setDistritoId('')
    setDistritos([])
    setError('')

    if (!provId) return

    await cargarDistritosPorProvincia(provId)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]

    setError('')
    setSuccessInfo(null)

    if (!file) {
      setDocumentoDNI(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar 5 MB.')
      e.target.value = ''
      setDocumentoDNI(null)
      return
    }

    const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png']
    const extension = file.name.split('.').pop().toLowerCase()

    if (!extensionesPermitidas.includes(extension)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.')
      e.target.value = ''
      setDocumentoDNI(null)
      return
    }

    setDocumentoDNI(file)
  }

  const actualizarUsuarioAutenticado = () => {
    const updatedUser = {
      ...user,
      perfil_completo: true,
      registro_completo: true,
      estado: 'activo',
    }

    dispatch({
      type: AUTH_SET_USER_ACTION,
      payload: {
        user: updatedUser,
      },
    })

    updateLocalStorageUser(updatedUser)
    setPerfilCompleto(true)
  }

  const redirigirASeleccionPlaza = () => {
    window.setTimeout(() => {
      irASeleccionPlaza(true)
    }, 1700)
  }

  const completarPerfilConDocumento = async () => {
    const formData = new FormData()
    formData.append('celular', celular)
    formData.append('departamento_id', departamentoId)
    formData.append('provincia_id', provinciaId)
    formData.append('distrito_id', distritoId)
    formData.append('direccion', direccion.toUpperCase())
    formData.append('documento_dni', documentoDNI)

    const resp = await fetch(`${API_BASE}/perfil/completar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      throw new Error(getErrorMessage(data))
    }

    return data
  }

  const actualizarPerfilSinDocumento = async () => {
    const resp = await fetch(`${API_BASE}/perfil/mi-perfil`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        celular,
        departamento_id: Number(departamentoId),
        provincia_id: Number(provinciaId),
        distrito_id: Number(distritoId),
        direccion: direccion.toUpperCase(),
      }),
    })

    const data = await resp.json().catch(() => ({}))

    if (!resp.ok) {
      throw new Error(getErrorMessage(data))
    }

    return data
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setSuccessInfo(null)

    if (!celular || celular.length < 9) {
      setError('Ingresa un número de celular válido.')
      return
    }

    if (!departamentoId || !provinciaId || !distritoId) {
      setError('Debes seleccionar departamento, provincia y distrito.')
      return
    }

    if (!direccion.trim()) {
      setError('Ingresa tu dirección completa.')
      return
    }

    if (!perfilCompleto && !documentoDNI) {
      setError('Debes subir tu documento de identidad DNI.')
      return
    }

    setCargando(true)

    try {
      const usarDocumento = Boolean(documentoDNI)
      const data = usarDocumento
        ? await completarPerfilConDocumento()
        : await actualizarPerfilSinDocumento()

      const nombreArchivo = usarDocumento
        ? data?.documento_dni?.nombre_archivo || documentoDNI?.name || 'Documento DNI'
        : null

      actualizarUsuarioAutenticado()

      setSuccessInfo({
        archivo: nombreArchivo,
        data,
        modo: usarDocumento ? 'documento' : 'actualizacion',
      })

      redirigirASeleccionPlaza()
    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar el perfil.')
    } finally {
      setCargando(false)
    }
  }

  const formularioBloqueado = cargando || cargandoPerfil || Boolean(successInfo)

  return (
    <div className='card card-custom'>
      {successInfo && (
        <SuccessActionModal
          archivo={successInfo.archivo}
          modo={successInfo.modo}
        />
      )}

      <div
        className='card-header border-0 pt-5'
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
        }}
      >
        <h3 className='card-title align-items-start flex-column'>
          <span className='card-label font-weight-bolder text-white font-size-h3'>
            Completar Perfil
          </span>
          <span className='text-white opacity-70 mt-1 font-weight-bold font-size-sm'>
            Por favor, completa los siguientes datos para activar tu cuenta
          </span>
        </h3>
      </div>

      <form onSubmit={handleSubmit} className='form'>
        <div className='card-body'>
          <ErrorNotice message={error} />

          {perfilCompleto && !successInfo && (
            <PerfilCompletoNotice onContinue={continuarASeleccionPlaza} />
          )}

          {!successInfo && !perfilCompleto && <InfoNotice />}

          {cargandoPerfil && (
            <div className='alert alert-custom alert-light mb-8'>
              <div className='alert-icon'>
                <span className='spinner spinner-primary' />
              </div>
              <div className='alert-text'>
                Cargando datos del perfil...
              </div>
            </div>
          )}

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Datos Registrados</h5>

            <div className='row'>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>Nombres completos</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.fullname || user?.nombre_completo || ''}
                    disabled
                  />
                </div>
              </div>

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>DNI</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.numero_documento || ''}
                    disabled
                  />
                </div>
              </div>

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>Correo electrónico</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Datos Adicionales</h5>

            <div className='row'>
              <div className='col-md-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    Celular <span className='text-danger'>*</span>
                  </label>
                  <input
                    type='tel'
                    className='form-control form-control-lg'
                    placeholder='965 123 456'
                    value={celular}
                    onChange={(e) => {
                      setCelular(e.target.value.replace(/\D/g, ''))
                      setError('')
                    }}
                    maxLength={15}
                    disabled={formularioBloqueado}
                    required
                  />
                </div>
              </div>
            </div>

            <div className='row'>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    Departamento <span className='text-danger'>*</span>
                  </label>
                  <select
                    className='form-control form-control-lg'
                    value={departamentoId}
                    onChange={handleDepartamentoChange}
                    disabled={formularioBloqueado || cargandoDepartamentos}
                    required
                  >
                    <option value=''>
                      {cargandoDepartamentos ? 'Cargando...' : 'Selecciona...'}
                    </option>

                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    Provincia <span className='text-danger'>*</span>
                  </label>
                  <select
                    className='form-control form-control-lg'
                    value={provinciaId}
                    onChange={handleProvinciaChange}
                    disabled={formularioBloqueado || !departamentoId || cargandoProvincias}
                    required
                  >
                    <option value=''>
                      {cargandoProvincias ? 'Cargando...' : 'Selecciona...'}
                    </option>

                    {provincias.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    Distrito <span className='text-danger'>*</span>
                  </label>
                  <select
                    className='form-control form-control-lg'
                    value={distritoId}
                    onChange={(e) => {
                      setDistritoId(e.target.value)
                      setError('')
                    }}
                    disabled={formularioBloqueado || !provinciaId || cargandoDistritos}
                    required
                  >
                    <option value=''>
                      {cargandoDistritos ? 'Cargando...' : 'Selecciona...'}
                    </option>

                    {distritos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className='row'>
              <div className='col-12'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    Dirección exacta <span className='text-danger'>*</span>
                  </label>
                  <textarea
                    className='form-control form-control-lg'
                    rows={2}
                    placeholder='Calle, número, urbanización, referencia...'
                    value={direccion}
                    onChange={(e) => {
                      setDireccion(e.target.value)
                      setError('')
                    }}
                    disabled={formularioBloqueado}
                    required
                    style={{ resize: 'none' }}
                  />
                  <span className='form-text text-muted'>
                    Ejemplo: Jr. Los Pinos 123, Urb. Las Flores, frente al parque
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Documento de Identidad</h5>

            <div className='row'>
              <div className='col-md-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>
                    {perfilCompleto ? 'Actualizar DNI (PDF, JPG o PNG)' : 'Subir DNI (PDF, JPG o PNG)'}
                    {!perfilCompleto && <span className='text-danger'> *</span>}
                  </label>

                  <div className='custom-file'>
                    <input
                      type='file'
                      className='custom-file-input'
                      id='documentoDNI'
                      accept='.pdf,.jpg,.jpeg,.png'
                      onChange={handleFileChange}
                      disabled={formularioBloqueado}
                      required={!perfilCompleto}
                    />
                    <label className='custom-file-label' htmlFor='documentoDNI'>
                      {documentoDNI ? documentoDNI.name : 'Seleccionar archivo...'}
                    </label>
                  </div>

                  <span className='form-text text-muted'>
                    {perfilCompleto
                      ? 'Opcional. Solo adjunta un nuevo archivo si necesitas reemplazar o actualizar tu DNI.'
                      : 'Tamaño máximo: 5 MB. Formatos permitidos: PDF, JPG, PNG.'}
                  </span>

                  {documentoDNI && !successInfo && (
                    <div className='mt-3'>
                      <span className='label label-light-primary label-inline font-weight-bold mr-2'>
                        Archivo seleccionado
                      </span>
                      <span className='text-dark-50 font-size-sm'>
                        {documentoDNI.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='card-footer border-top py-5'>
          <div className='d-flex justify-content-between'>
            <button
              type='button'
              className='btn btn-light-secondary font-weight-bold px-8'
              onClick={() => history.push('/dashboard')}
              disabled={formularioBloqueado}
            >
              Cancelar
            </button>

            <div className='d-flex'>
              {perfilCompleto && !successInfo && (
                <button
                  type='button'
                  className='btn btn-light-success font-weight-bold px-8 mr-3'
                  onClick={continuarASeleccionPlaza}
                  disabled={formularioBloqueado}
                >
                  Continuar
                </button>
              )}

              <button
                type='submit'
                className='btn btn-primary font-weight-bold px-8'
                disabled={formularioBloqueado}
              >
                {cargando ? (
                  <>
                    <span className='spinner-border spinner-border-sm mr-2' />
                    Validando y guardando...
                  </>
                ) : successInfo ? (
                  'Documento validado'
                ) : perfilCompleto ? (
                  documentoDNI ? 'Actualizar perfil y DNI' : 'Actualizar perfil'
                ) : (
                  'Guardar y continuar'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}