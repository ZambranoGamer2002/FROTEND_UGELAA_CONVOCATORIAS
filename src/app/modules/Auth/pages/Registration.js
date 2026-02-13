/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useState} from 'react'
import {useHistory, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

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

      const data = await resp.json().catch(() => ({}))
      const d = data.datos || {}

      setNombres(d.nombres || '')
      setApellidoPaterno(d.apellido_paterno || '')
      setApellidoMaterno(d.apellido_materno || '')
      setDniConsultado(true)
      setSuccess('Datos encontrados. Verifica y completa la información.')
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

    if (!fechaNacimiento) {
      setError('Selecciona tu fecha de nacimiento.')
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
          username,
          email,
        }),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data.detail || data.message || 'No se pudo iniciar el registro.')

      setSuccess(data.message || `Código de verificación enviado a ${email}. Revisa tu bandeja.`)

      setTimeout(() => {
        history.push(`/auth/verify-code?email=${encodeURIComponent(email)}`)
      }, 1200)
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
          Completa tus datos para recibir tu código de verificación.
        </p>
      </div>

      {/* Mensajes */}
      {error && (
        <div className='alert alert-danger d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='alerta'>
            ⚠️
          </span>
          <span className='ml-2'>{error}</span>
        </div>
      )}
      {success && (
        <div className='alert alert-success d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='ok'>
            ✅
          </span>
          <span className='ml-2'>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className='form' autoComplete='off'>
        {/* 1. Documento */}
        <div className='mb-10'>
          <div className='d-flex align-items-center justify-content-between mb-4'>
            <h5 className='font-weight-bolder mb-0'>1) Documento</h5>
            <span className={`badge ${dniConsultado ? 'badge-success' : 'badge-light'} badge-pill`}>
              {dniConsultado ? 'Validado' : 'Pendiente'}
            </span>
          </div>

          <div className='row'>
            <div className='col-lg-3 col-md-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Tipo</label>
                <select
                  className={solidInput}
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  disabled={buscando || enviando}
                >
                  <option value='DNI'>DNI</option>
                  <option value='Carnet de Extranjería'>Carnet de Extranjería</option>
                </select>
              </div>
            </div>

            <div className='col-lg-5 col-md-8'>
              <div className='form-group'>
                <label className='font-weight-bold'>N° documento</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Ingresa tu documento'
                  value={numeroDocumento}
                  onChange={(e) => setNumeroDocumento(e.target.value)}
                  maxLength={12}
                  required
                  disabled={buscando || enviando}
                />
              </div>
            </div>

            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold d-none d-lg-block'>&nbsp;</label>
                <button
                  type='button'
                  className='btn btn-secondary font-weight-bold px-9 py-4 w-100'
                  onClick={handleConsultarDni}
                  disabled={buscando || enviando}
                >
                  {buscando ? (
                    <>
                      <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                      Buscando...
                    </>
                  ) : (
                    'Buscar en RENIEC'
                  )}
                </button>
              </div>
            </div>
          </div>

          <span className='form-text text-muted'>
            Consulta tu documento para autocompletar apellidos y nombres.
          </span>
        </div>

        {/* 2. Datos personales (RENIEC) */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>2) Datos personales (RENIEC)</h5>

          <div className='row'>
            <div className='col-lg-4 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Apellido paterno</label>
                <input type='text' className={solidInput} value={apellidoPaterno} readOnly />
              </div>
            </div>

            <div className='col-lg-4 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Apellido materno</label>
                <input type='text' className={solidInput} value={apellidoMaterno} readOnly />
              </div>
            </div>

            <div className='col-lg-4'>
              <div className='form-group'>
                <label className='font-weight-bold'>Nombres</label>
                <input type='text' className={solidInput} value={nombres} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Datos para registro */}
        <div className='mb-10'>
          <h5 className='font-weight-bolder mb-4'>3) Datos para registro</h5>

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

            <div className='col-lg-2 col-md-6'>
              <div className='form-group'>
                <label className='font-weight-bold'>Sexo</label>
                <select
                  className={solidInput}
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  disabled={enviando}
                >
                  <option value='M'>M</option>
                  <option value='F'>F</option>
                </select>
              </div>
            </div>

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
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-lg-6 col-md-8'>
              <div className='form-group'>
                <label className='font-weight-bold'>Usuario</label>
                <input
                  type='text'
                  className={solidInput}
                  placeholder='Nombre de usuario'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={enviando}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className='d-flex flex-wrap justify-content-between align-items-center'>
          <Link to='/auth/login' className='text-muted text-hover-primary'>
            Volver al inicio de sesión
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
