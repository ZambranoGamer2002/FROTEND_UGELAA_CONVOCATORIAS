import React, {useState} from 'react'
import {useHistory, Link} from 'react-router-dom'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

const fondoUrl = process.env.PUBLIC_URL + '/media/bg/fondo_sesion.jpg'
const logoUrl = process.env.PUBLIC_URL + '/media/logos/LOGO_UGELAA.png'

const Login = () => {
  const history = useHistory()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({username, password}),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail || 'No se pudo iniciar sesión')
      }

      const data = await resp.json()

      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_role', data.role || '')

      history.push('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
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
        <div className='card w-100 max-w-450px shadow-lg'>
          <div className='card-body p-10'>
            {/* Logo */}
            <div className='d-flex flex-center mb-5'>
              <img src={logoUrl} alt='UGELAA' style={{maxHeight: 70}} />
            </div>

            {/* Título */}
            <div className='text-center mb-7'>
              <h2 className='fw-bold text-dark mb-2'>Iniciar sesión</h2>
              <div className='text-muted fs-7'>
                Portal de Contratación Docente UGEL Alto Amazonas
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className='alert alert-danger py-2 mb-4'>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className='form w-100'>
              <div className='mb-5'>
                <label className='form-label fw-semibold'>Usuario</label>
                <input
                  type='text'
                  className='form-control form-control-lg'
                  placeholder='Ingresa tu usuario'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className='mb-3'>
                <label className='form-label fw-semibold'>Contraseña</label>
                <input
                  type='password'
                  className='form-control form-control-lg'
                  placeholder='Ingresa tu contraseña'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className='d-flex justify-content-between align-items-center mb-5'>
                <a href='/auth/forgot-password' className='link-primary fs-7'>
                  ¿Olvidaste tu contraseña?
                </a>

                {/* enlace a registro */}
                <span className='fs-7'>
                  ¿No tienes cuenta?{' '}
                  <Link to='/auth/registration' className='link-primary fw-bold'>
                    Regístrate
                  </Link>
                </span>
              </div>

              <div className='d-grid'>
                <button
                  type='submit'
                  className='btn btn-primary btn-lg'
                  disabled={loading}
                >
                  {loading ? 'Validando...' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Texto informativo (si quieres mantenerlo) */}
        <div className='text-center text-white mt-5 fs-7'>
          También puedes acercarte a la UGEL Alto Amazonas – área de
          contratación docente para apoyo en el registro.
        </div>

        <div className='text-center text-white-50 fs-8 mt-3'>
          UGEL Alto Amazonas &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

export default Login
