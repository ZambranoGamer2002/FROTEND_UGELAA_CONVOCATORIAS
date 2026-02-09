import React, {useState} from 'react'
import {useHistory, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const fondoUrl = process.env.PUBLIC_URL + '/media/bg/fondo_sesion.jpg'
const logoUrl = process.env.PUBLIC_URL + '/media/logos/LOGO_UGELAA.png'

const Registration = () => {
  const history = useHistory()

  const [tipoDocumento, setTipoDocumento] = useState('DNI')
  const [numeroDocumento, setNumeroDocumento] = useState('')

  const [nombres, setNombres] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')

  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState('M')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [dniConsultado, setDniConsultado] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleConsultarDni = async () => {
    setError('')
    setSuccess('')

    if (!numeroDocumento || numeroDocumento.length < 8) {
      setError('Ingresa un número de documento válido.')
      return
    }

    setBuscando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/consultar-dni`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail || 'No se encontraron datos para ese documento.')
      }

      const data = await resp.json()
      const d = data.datos || {}

      setNombres(d.nombres || '')
      setApellidoPaterno(d.apellido_paterno || '')
      setApellidoMaterno(d.apellido_materno || '')
      setDniConsultado(true)
      setSuccess('Datos encontrados en RENIEC. Verifica y completa la información.')
    } catch (err) {
      setDniConsultado(false)
      setNombres('')
      setApellidoPaterno('')
      setApellidoMaterno('')
      setError(err.message)
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!dniConsultado) {
      setError('Primero debes buscar y validar tu DNI en RENIEC.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/registro`, {
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
          username,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail || data.message || 'No se pudo completar el registro.')
      }

      const data = await resp.json()
      setSuccess(data.message || 'Registro exitoso. Ahora puedes iniciar sesión.')
      // Redirigir al login después de un pequeño delay
      setTimeout(() => {
        history.push('/auth/login')
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className='d-flex flex-column flex-root'
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${fondoUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className='d-flex flex-center flex-column flex-column-fluid p-10'>
        {/* Card */}
        <div className='card w-100 max-w-600px shadow-lg'>
          <div className='card-body p-10'>
            {/* Logo */}
            <div className='d-flex flex-center mb-5'>
              <img src={logoUrl} alt='UGELAA' style={{maxHeight: 70}} />
            </div>

            {/* Título */}
            <div className='text-center mb-7'>
              <h2 className='fw-bold text-dark mb-2'>Registro de docente</h2>
              <div className='text-muted fs-7'>
                Completa tus datos para crear tu usuario en el portal de contratación.
              </div>
            </div>

            {/* Mensajes */}
            {error && <div className='alert alert-danger py-2 mb-4'>{error}</div>}
            {success && <div className='alert alert-success py-2 mb-4'>{success}</div>}

            <form onSubmit={handleSubmit} className='form w-100'>
              {/* FASE 1: Documento + RENIEC */}
              <div className='mb-6'>
                <h5 className='fw-bold mb-3'>1. Datos de documento</h5>
                <div className='row'>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Tipo documento</label>
                    <select
                      className='form-control'
                      value={tipoDocumento}
                      onChange={(e) => setTipoDocumento(e.target.value)}
                    >
                      <option value='DNI'>DNI</option>
                      <option value='Carnet de Extranjería'>Carnet de Extranjería</option>
                    </select>
                  </div>
                  <div className='col-md-5 mb-3'>
                    <label className='form-label fw-semibold'>N° documento</label>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Ingresa tu documento'
                      value={numeroDocumento}
                      onChange={(e) => setNumeroDocumento(e.target.value)}
                      maxLength={12}
                      required
                    />
                  </div>
                  <div className='col-md-3 mb-3 d-flex align-items-end'>
                    <button
                      type='button'
                      className='btn btn-secondary w-100'
                      onClick={handleConsultarDni}
                      disabled={buscando}
                    >
                      {buscando ? 'Buscando...' : 'Buscar DNI'}
                    </button>
                  </div>
                </div>
              </div>

              {/* FASE 1: Datos autocompletados */}
              <div className='mb-6'>
                <h5 className='fw-bold mb-3'>2. Datos personales (RENIEC)</h5>
                <div className='row'>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Apellido paterno</label>
                    <input
                      type='text'
                      className='form-control'
                      value={apellidoPaterno}
                      readOnly
                    />
                  </div>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Apellido materno</label>
                    <input
                      type='text'
                      className='form-control'
                      value={apellidoMaterno}
                      readOnly
                    />
                  </div>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Nombres</label>
                    <input
                      type='text'
                      className='form-control'
                      value={nombres}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* FASE 2: Datos para validación y credenciales */}
              <div className='mb-6'>
                <h5 className='fw-bold mb-3'>3. Datos para registro</h5>
                <div className='row'>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Fecha de nacimiento</label>
                    <input
                      type='date'
                      className='form-control'
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      required
                    />
                  </div>
                  <div className='col-md-2 mb-3'>
                    <label className='form-label fw-semibold'>Sexo</label>
                    <select
                      className='form-control'
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                    >
                      <option value='M'>M</option>
                      <option value='F'>F</option>
                    </select>
                  </div>
                  <div className='col-md-6 mb-3'>
                    <label className='form-label fw-semibold'>Correo electrónico</label>
                    <input
                      type='email'
                      className='form-control'
                      placeholder='ejemplo@correo.com'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className='row'>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Usuario</label>
                    <input
                      type='text'
                      className='form-control'
                      placeholder='Nombre de usuario'
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Contraseña</label>
                    <input
                      type='password'
                      className='form-control'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className='col-md-4 mb-3'>
                    <label className='form-label fw-semibold'>Confirmar contraseña</label>
                    <input
                      type='password'
                      className='form-control'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className='d-flex justify-content-between align-items-center'>
                <Link to='/auth/login' className='btn btn-light'>
                  Volver al inicio de sesión
                </Link>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={enviando}
                >
                  {enviando ? 'Registrando...' : 'Registrar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className='text-center text-white-50 fs-8 mt-4'>
          UGEL Alto Amazonas &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

export default Registration
