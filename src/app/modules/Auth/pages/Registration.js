/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useState} from 'react'
import {useHistory, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const Registration = () => {
  const history = useHistory()

  // Datos personales BÁSICOS
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

  // Estados UI
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    setEnviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/iniciar-registro`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento,
          nombres: nombres.toUpperCase(),
          apellido_paterno: apellidoPaterno.toUpperCase(),
          apellido_materno: apellidoMaterno.toUpperCase(),
          fecha_nacimiento: fechaNacimiento,
          sexo,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
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
    <div className='login-form login-signin' style={{width: '100%', maxWidth: 760}}>

      {/* Título */}
      <div className='text-center mb-10 mb-lg-15'>
        <h3 className='font-size-h1'>Registro de docente</h3>
        <p className='text-muted font-weight-bold mb-0'>
          Completa tus datos básicos para crear tu cuenta
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

        {/* Documento */}
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
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  maxLength={tipoDocumento === 'DNI' ? 8 : 12}
                  required
                  disabled={enviando}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Datos personales */}
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

        {/* Datos de acceso */}
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
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
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

        {/* Botones */}
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