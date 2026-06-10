/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useState } from 'react'
import { useHistory, Link } from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const ENDPOINTS_DEPARTAMENTOS = [
  `${API_BASE}/ubigeo/departamentos`,
  `${API_BASE}/departamentos`,
]

const getEndpointsProvincias = (departamentoId) => [
  `${API_BASE}/ubigeo/provincias?departamento_id=${departamentoId}`,
  `${API_BASE}/ubigeo/departamentos/${departamentoId}/provincias`,
  `${API_BASE}/provincias?departamento_id=${departamentoId}`,
]

const getErrorMessage = (data, fallback = 'Ocurrió un error inesperado.') => {
  if (!data) return fallback

  if (typeof data.detail === 'string') return data.detail

  if (data.detail && typeof data.detail === 'object') {
    return data.detail.mensaje || data.detail.message || data.detail.error || fallback
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item.msg || item.message || JSON.stringify(item))
      .join(', ')
  }

  if (typeof data.message === 'string') return data.message
  if (typeof data.error === 'string') return data.error

  return fallback
}

const normalizarLista = (data, key) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data[key])) return data[key]
  if (data && Array.isArray(data.data)) return data.data
  if (data && Array.isArray(data.items)) return data.items
  return []
}

const fetchPrimerEndpointOk = async (urls) => {
  let ultimoError = null

  for (const url of urls) {
    try {
      const resp = await fetch(url)
      const data = await resp.json().catch(() => ({}))

      if (resp.ok) return data

      ultimoError = getErrorMessage(data, `No respondió correctamente: ${url}`)
    } catch (error) {
      ultimoError = error.message
    }
  }

  throw new Error(ultimoError || 'No se pudo consultar el servidor.')
}

const Registration = () => {
  const history = useHistory()

  const [paso, setPaso] = useState('ubicacion')

  // Intención de postulación
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [departamentoId, setDepartamentoId] = useState('')
  const [provinciaId, setProvinciaId] = useState('')
  const [departamentoNombre, setDepartamentoNombre] = useState('')
  const [provinciaNombre, setProvinciaNombre] = useState('')

  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
  const [cargandoProvincias, setCargandoProvincias] = useState(false)
  const [verificandoConvocatoria, setVerificandoConvocatoria] = useState(false)
  const [convocatoriaActiva, setConvocatoriaActiva] = useState(null)
  const [mensajeConvocatoria, setMensajeConvocatoria] = useState('')

  // Datos personales
  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState('')

  // Datos de acceso
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

  // UI
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const solidInput = 'form-control form-control-solid h-auto py-5 px-6'

  useEffect(() => {
    const cargarDepartamentos = async () => {
      setCargandoDepartamentos(true)
      setError('')

      try {
        const data = await fetchPrimerEndpointOk(ENDPOINTS_DEPARTAMENTOS)
        setDepartamentos(normalizarLista(data, 'departamentos'))
      } catch (err) {
        setError(
          'No se pudo cargar la lista de departamentos. Verifica el endpoint de ubigeo.'
        )
      } finally {
        setCargandoDepartamentos(false)
      }
    }

    cargarDepartamentos()
  }, [])

  useEffect(() => {
    const cargarProvincias = async () => {
      setProvincias([])
      setProvinciaId('')
      setProvinciaNombre('')
      setConvocatoriaActiva(null)
      setMensajeConvocatoria('')

      if (!departamentoId) return

      setCargandoProvincias(true)
      setError('')

      try {
        const data = await fetchPrimerEndpointOk(getEndpointsProvincias(departamentoId))
        setProvincias(normalizarLista(data, 'provincias'))
      } catch (err) {
        setError(
          'No se pudo cargar la lista de provincias. Verifica el endpoint de provincias.'
        )
      } finally {
        setCargandoProvincias(false)
      }
    }

    cargarProvincias()
  }, [departamentoId])

  const handleDepartamentoChange = (e) => {
    const value = e.target.value
    setDepartamentoId(value)

    const dep = departamentos.find((item) => String(item.id) === String(value))
    setDepartamentoNombre(dep ? dep.nombre : '')

    setProvinciaId('')
    setProvinciaNombre('')
    setConvocatoriaActiva(null)
    setMensajeConvocatoria('')
  }

  const handleProvinciaChange = (e) => {
    const value = e.target.value
    setProvinciaId(value)

    const prov = provincias.find((item) => String(item.id) === String(value))
    setProvinciaNombre(prov ? prov.nombre : '')

    setConvocatoriaActiva(null)
    setMensajeConvocatoria('')
    setError('')
  }

  const verificarConvocatoria = async () => {
    setError('')
    setSuccess('')
    setMensajeConvocatoria('')
    setConvocatoriaActiva(null)

    if (!departamentoId) {
      setError('Selecciona el departamento donde deseas postular.')
      return
    }

    if (!provinciaId) {
      setError('Selecciona la provincia / UGEL donde deseas postular.')
      return
    }

    setVerificandoConvocatoria(true)

    try {
      const resp = await fetch(
        `${API_BASE}/convocatorias/publica/activa-por-provincia/${provinciaId}`
      )

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(
          getErrorMessage(data, 'No se pudo verificar la convocatoria activa.')
        )
      }

      if (!data.existe || !data.convocatoria) {
        setMensajeConvocatoria(
          data.mensaje ||
          'Actualmente no existe una convocatoria activa para la provincia seleccionada.'
        )
        return
      }

      setConvocatoriaActiva(data.convocatoria)
      setMensajeConvocatoria(
        `Convocatoria activa encontrada: ${data.convocatoria.codigo || ''} ${data.convocatoria.titulo || ''}`
      )
      setPaso('registro')
    } catch (err) {
      setError(err.message || 'No se pudo verificar la convocatoria activa.')
    } finally {
      setVerificandoConvocatoria(false)
    }
  }

  const volverUbicacion = () => {
    setPaso('ubicacion')
    setSuccess('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!convocatoriaActiva) {
      setPaso('ubicacion')
      setError(
        'Primero debes verificar que exista una convocatoria activa para la provincia seleccionada.'
      )
      return
    }

    setEnviando(true)

    try {
      const resp = await fetch(`${API_BASE}/auth/iniciar-registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento_id_intencion: Number(departamentoId),
          provincia_id_intencion: Number(provinciaId),

          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.trim(),
          nombres: nombres.trim().toUpperCase(),
          apellido_paterno: apellidoPaterno.trim().toUpperCase(),
          apellido_materno: apellidoMaterno.trim().toUpperCase(),
          fecha_nacimiento: fechaNacimiento,
          sexo,
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
        }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(getErrorMessage(data, 'No se pudo iniciar el registro.'))
      }

      setSuccess(
        data.message ||
        `Código enviado a ${email}. Revisa tu bandeja de entrada.`
      )

      setTimeout(() => {
        history.push(`/auth/verify-code?email=${encodeURIComponent(email.trim().toLowerCase())}`)
      }, 1500)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el registro.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className='login-form login-signin' style={{ width: '100%', maxWidth: 760 }}>

      <div className='text-center mb-10 mb-lg-15'>
        <h3 className='font-size-h1'>Registro de docente</h3>
        <p className='text-muted font-weight-bold mb-0'>
          {paso === 'ubicacion'
            ? 'Primero selecciona la UGEL donde deseas postular'
            : 'Completa tus datos básicos para crear tu cuenta'}
        </p>
      </div>

      {error && (
        <div className='alert alert-danger d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='alerta'>⚠️</span>
          <span className='ml-2'>{error}</span>
        </div>
      )}

      {success && (
        <div className='alert alert-success d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='ok'>✅</span>
          <span className='ml-2'>{success}</span>
        </div>
      )}

      {mensajeConvocatoria && (
        <div
          className={`alert ${convocatoriaActiva ? 'alert-success' : 'alert-warning'
            } py-3 mb-5`}
        >
          {mensajeConvocatoria}
        </div>
      )}

      {paso === 'ubicacion' && (
        <div className='form'>
          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4'>UGEL donde deseas postular</h5>

            <div className='alert alert-light border py-3 mb-5'>
              Esta selección solo se usará para verificar si existe una convocatoria activa.
              Tu dirección real se completará después en tu perfil.
            </div>

            <div className='row'>
              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Departamento</label>
                  <select
                    className={solidInput}
                    value={departamentoId}
                    onChange={handleDepartamentoChange}
                    disabled={cargandoDepartamentos || verificandoConvocatoria}
                    required
                  >
                    <option value=''>
                      {cargandoDepartamentos ? 'Cargando...' : 'Seleccione departamento'}
                    </option>

                    {departamentos.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Provincia / UGEL</label>
                  <select
                    className={solidInput}
                    value={provinciaId}
                    onChange={handleProvinciaChange}
                    disabled={!departamentoId || cargandoProvincias || verificandoConvocatoria}
                    required
                  >
                    <option value=''>
                      {cargandoProvincias ? 'Cargando...' : 'Seleccione provincia'}
                    </option>

                    {provincias.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.nombre}
                      </option>
                    ))}
                  </select>
                  <span className='form-text text-muted'>
                    Si no existe convocatoria activa, no podrás continuar el registro.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='d-flex flex-wrap justify-content-between align-items-center mt-5'>
            <Link to='/auth/login' className='text-muted text-hover-primary'>
              ¿Ya tienes cuenta? Inicia sesión
            </Link>

            <button
              type='button'
              className='btn btn-primary font-weight-bold px-9 py-4 my-3'
              disabled={
                verificandoConvocatoria ||
                cargandoDepartamentos ||
                cargandoProvincias ||
                !departamentoId ||
                !provinciaId
              }
              onClick={verificarConvocatoria}
            >
              {verificandoConvocatoria ? (
                <>
                  <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                  Verificando...
                </>
              ) : (
                'Verificar convocatoria'
              )}
            </button>
          </div>
        </div>
      )}

      {paso === 'registro' && (
        <form onSubmit={handleSubmit} className='form' autoComplete='off'>

          <div className='alert alert-success py-3 mb-8'>
            Estás registrándote para postular en:
            <strong> {provinciaNombre}</strong>
            {departamentoNombre ? `, ${departamentoNombre}` : ''}.
            <br />
            Convocatoria:
            <strong> {convocatoriaActiva?.codigo}</strong>
          </div>

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4'>Documento de identidad</h5>

            <div className='row'>
              <div className='col-lg-4 col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Tipo</label>
                  <select
                    className={solidInput}
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    disabled={enviando}
                    required
                  >
                    <option value='DNI'>DNI</option>
                    <option value='Carnet de Extranjería'>Carnet de Extranjería</option>
                  </select>
                </div>
              </div>

              <div className='col-lg-8 col-md-8'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Número de documento</label>
                  <input
                    type='text'
                    className={solidInput}
                    placeholder='Ingresa tu número de documento'
                    value={numeroDocumento}
                    onChange={(e) => {
                      const value =
                        tipoDocumento === 'DNI'
                          ? e.target.value.replace(/\D/g, '')
                          : e.target.value.trim()

                      setNumeroDocumento(value)
                    }}
                    maxLength={tipoDocumento === 'DNI' ? 8 : 12}
                    required
                    disabled={enviando}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4'>Datos personales</h5>

            <div className='row'>
              <div className='col-lg-12'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Nombres</label>
                  <input
                    type='text'
                    className={solidInput}
                    placeholder='Nombres completos'
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                    disabled={enviando}
                  />
                </div>
              </div>

              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Apellido paterno</label>
                  <input
                    type='text'
                    className={solidInput}
                    placeholder='Apellido paterno'
                    value={apellidoPaterno}
                    onChange={(e) => setApellidoPaterno(e.target.value)}
                    required
                    disabled={enviando}
                  />
                </div>
              </div>

              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Apellido materno</label>
                  <input
                    type='text'
                    className={solidInput}
                    placeholder='Apellido materno'
                    value={apellidoMaterno}
                    onChange={(e) => setApellidoMaterno(e.target.value)}
                    required
                    disabled={enviando}
                  />
                </div>
              </div>
            </div>

            <div className='row'>
              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Fecha de nacimiento</label>
                  <input
                    type='date'
                    className={solidInput}
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    disabled={enviando}
                  />
                </div>
              </div>

              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Sexo</label>
                  <select
                    className={solidInput}
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    disabled={enviando}
                    required
                  >
                    <option value=''>Seleccione...</option>
                    <option value='M'>Masculino</option>
                    <option value='F'>Femenino</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4'>Datos de acceso</h5>

            <div className='row'>
              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Correo electrónico</label>
                  <input
                    type='email'
                    className={solidInput}
                    placeholder='ejemplo@correo.com'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={enviando}
                  />
                  <span className='form-text text-muted'>
                    Recibirás tu código de verificación aquí
                  </span>
                </div>
              </div>

              <div className='col-lg-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Nombre de usuario</label>
                  <input
                    type='text'
                    className={solidInput}
                    placeholder='Ej: jperez'
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))
                    }
                    minLength={4}
                    maxLength={50}
                    required
                    disabled={enviando}
                  />
                  <span className='form-text text-muted'>
                    Mínimo 4 caracteres, sin espacios
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className='d-flex flex-wrap justify-content-between align-items-center mt-5'>
            <button
              type='button'
              className='btn btn-light-primary font-weight-bold px-9 py-4 my-3'
              onClick={volverUbicacion}
              disabled={enviando}
            >
              Cambiar UGEL
            </button>

            <button
              type='submit'
              className='btn btn-primary font-weight-bold px-9 py-4 my-3'
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                  Enviando código...
                </>
              ) : (
                'Enviar código de verificación'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Registration