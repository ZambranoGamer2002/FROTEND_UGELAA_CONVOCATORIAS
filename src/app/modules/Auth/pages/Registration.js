/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useState, useEffect} from 'react'
import {useHistory, Link} from 'react-router-dom'

const API_BASE = 'http://localhost:8000/api/v1'

const Registration = () => {
  const history = useHistory()

  // Datos personales
  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState('M')
  const [celular, setCelular] = useState('')

  // Datos de acceso
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')

  // Ubigeo
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])
  const [departamentoId, setDepartamentoId] = useState('')
  const [provinciaId, setProvinciaId] = useState('')
  const [distritoId, setDistritoId] = useState('')
  const [direccion, setDireccion] = useState('')

  // Estados UI
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true)
  const [cargandoProvincias, setCargandoProvincias] = useState(false)
  const [cargandoDistritos, setCargandoDistritos] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Helpers para normalizar respuesta a array ──
  const toArray = (data) => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.data)) return data.data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.results)) return data.results
    return []
  }

  // ── Cargar departamentos al montar ──
  useEffect(() => {
    let mounted = true
    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE}/ubigeo/departamentos`)
        const data = await resp.json()
        if (mounted) setDepartamentos(toArray(data))
      } catch (err) {
        if (mounted) setError('No se pudieron cargar los departamentos. Verifica la conexión.')
      } finally {
        if (mounted) setCargandoDepartamentos(false)
      }
    }
    cargar()
    return () => { mounted = false }
  }, [])

  // ── Cargar provincias ──
  const handleDepartamentoChange = async (e) => {
    const deptId = e.target.value
    setDepartamentoId(deptId)
    setProvinciaId('')
    setDistritoId('')
    setProvincias([])
    setDistritos([])

    if (!deptId) return

    setCargandoProvincias(true)
    try {
      const resp = await fetch(`${API_BASE}/ubigeo/provincias/${deptId}`)
      const data = await resp.json()
      setProvincias(toArray(data))
    } catch {
      setError('No se pudieron cargar las provincias.')
    } finally {
      setCargandoProvincias(false)
    }
  }

  // ── Cargar distritos ──
  const handleProvinciaChange = async (e) => {
    const provId = e.target.value
    setProvinciaId(provId)
    setDistritoId('')
    setDistritos([])

    if (!provId) return

    setCargandoDistritos(true)
    try {
      const resp = await fetch(`${API_BASE}/ubigeo/distritos/${provId}`)
      const data = await resp.json()
      setDistritos(toArray(data))
    } catch {
      setError('No se pudieron cargar los distritos.')
    } finally {
      setCargandoDistritos(false)
    }
  }

  // ── Enviar formulario ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!departamentoId || !provinciaId || !distritoId) {
      setError('Debes seleccionar departamento, provincia y distrito.')
      return
    }
    if (!celular || celular.length < 9) {
      setError('Ingresa un número de celular válido.')
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/iniciar-registro`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          nombres,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          fecha_nacimiento: fechaNacimiento,
          sexo,
          celular,
          email,
          username,
          departamento_id: parseInt(departamentoId),
          provincia_id: parseInt(provinciaId),
          distrito_id: parseInt(distritoId),
          direccion,
        }),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data.detail || 'No se pudo iniciar el registro.')

      setSuccess(data.message || `Código enviado a ${email}. Revisa tu bandeja de entrada.`)
      setTimeout(() => {
        history.push(`/auth/verify-code?email=${encodeURIComponent(email)}`)
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const solidInput = 'form-control form-control-solid h-auto py-5 px-6'

  return (
    <div className='login-form login-signin' style={{width: '100%', maxWidth: 920}}>

      {/* Título */}
      <div className='text-center mb-10 mb-lg-15'>
        <h3 className='font-size-h1'>Registro de docente</h3>
        <p className='text-muted font-weight-bold mb-0'>
          Completa todos tus datos para crear tu cuenta
        </p>
      </div>

      {/* Mensajes */}
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

      <form onSubmit={handleSubmit} className='form' autoComplete='off'>

        {/* ── 1. Documento ── */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>1) Documento de identidad</h5>
          <div className='row'>
            <div className='col-lg-3 col-md-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Tipo</label>
                <select
                  className={solidInput}
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  disabled={enviando}
                >
                  <option value='DNI'>DNI</option>
                  <option value='Carnet de Extranjería'>Carnet de Extranjería</option>
                </select>
              </div>
            </div>

            <div className='col-lg-9 col-md-8'>
              <div className='form-group'>
                <label className='font-weight-bold'>Número de documento</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Ingresa tu número de documento'
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  maxLength={12}
                  required
                  disabled={enviando}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Datos personales ── */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>2) Datos personales</h5>

          <div className='row'>
            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Nombres</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Nombres completos'
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value.toUpperCase())}
                  required
                  disabled={enviando}
                />
              </div>
            </div>

            <div className='col-lg-4 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Apellido paterno</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Apellido paterno'
                  value={apellidoPaterno}
                  onChange={(e) => setApellidoPaterno(e.target.value.toUpperCase())}
                  required
                  disabled={enviando}
                />
              </div>
            </div>

            <div className='col-lg-4 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Apellido materno</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Apellido materno'
                  value={apellidoMaterno}
                  onChange={(e) => setApellidoMaterno(e.target.value.toUpperCase())}
                  required
                  disabled={enviando}
                />
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-lg-4 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Fecha de nacimiento</label>
                <input
                  type='date'
                  className={solidInput}
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  required
                  disabled={enviando}
                />
              </div>
            </div>

            <div className='col-lg-2 col-md-3'>
              <div className='form-group'>
                <label className='font-weight-bold'>Sexo</label>
                <select
                  className={solidInput}
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  disabled={enviando}
                >
                  <option value='M'>Masculino</option>
                  <option value='F'>Femenino</option>
                </select>
              </div>
            </div>

            <div className='col-lg-6 col-md-9'>
              <div className='form-group'>
                <label className='font-weight-bold'>Celular</label>
                <input
                  type='tel'
                  className={solidInput}
                  placeholder='965 123 456'
                  value={celular}
                  onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                  maxLength={15}
                  required
                  disabled={enviando}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Ubicación ── */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>3) Ubicación</h5>

          <div className='row'>
            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Departamento</label>
                <select
                  className={solidInput}
                  value={departamentoId}
                  onChange={handleDepartamentoChange}
                  disabled={cargandoDepartamentos || enviando}
                  required
                >
                  <option value=''>
                    {cargandoDepartamentos ? 'Cargando...' : 'Selecciona...'}
                  </option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Provincia</label>
                <select
                  className={solidInput}
                  value={provinciaId}
                  onChange={handleProvinciaChange}
                  disabled={!departamentoId || cargandoProvincias || enviando}
                  required
                >
                  <option value=''>
                    {cargandoProvincias ? 'Cargando...' : 'Selecciona...'}
                  </option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Distrito</label>
                <select
                  className={solidInput}
                  value={distritoId}
                  onChange={(e) => setDistritoId(e.target.value)}
                  disabled={!provinciaId || cargandoDistritos || enviando}
                  required
                >
                  <option value=''>
                    {cargandoDistritos ? 'Cargando...' : 'Selecciona...'}
                  </option>
                  {distritos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-12'>
              <div className='form-group'>
                <label className='font-weight-bold'>Dirección exacta</label>
                <textarea
                  className={solidInput}
                  rows={2}
                  placeholder='Calle, número, urbanización, referencia...'
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  required
                  disabled={enviando}
                  style={{resize: 'none'}}
                />
                <span className='form-text text-muted'>
                  Ejemplo: Jr. Los Pinos 123, Urb. Las Flores, frente al parque
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Datos de acceso ── */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>4) Datos de acceso</h5>

          <div className='row'>
            <div className='col-lg-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Correo electrónico</label>
                <input
                  type='email'
                  className={solidInput}
                  placeholder='ejemplo@correo.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
                  placeholder='Ej: pzambrano'
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  minLength={4}
                  maxLength={50}
                  required
                  disabled={enviando}
                />
                <span className='form-text text-muted'>
                  Solo letras, números y guiones. Mín. 4 caracteres.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Botones ── */}
        <div className='d-flex flex-wrap justify-content-between align-items-center mt-5'>
          <Link to='/auth/login' className='text-muted text-hover-primary'>
            ¿Ya tienes cuenta? Inicia sesión
          </Link>

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
    </div>
  )
}

export default Registration