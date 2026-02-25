import React, {useState} from 'react'
import {useHistory, Link} from 'react-router-dom'
import {connect} from 'react-redux'
import {injectIntl} from 'react-intl'
import * as auth from '../_redux/authRedux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const IconEye = ({show}) =>
  show ? (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  ) : (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
      <line x1='1' y1='1' x2='23' y2='23' />
    </svg>
  )

function Login(props) {
  const history = useHistory()
  const {login: loginAction, fulfillUser} = props

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'Credenciales incorrectas.')
      }

      const {access_token, refresh_token, user} = data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))

      if (loginAction) loginAction(access_token)

      // ✅ ACTUALIZADO: Pasar TODOS los campos del usuario a Redux
      if (fulfillUser && user) {
        fulfillUser({
          id: user.id,
          username: user.username,
          email: user.email,
          fullname: user.nombre_completo,
          role: user.role,
          role_id: user.role_id,  // ← AGREGADO
          role_nivel: user.role_nivel,  // ← AGREGADO
          perfil_completo: user.perfil_completo,  // ← AGREGADO
          estado: user.estado,  // ← AGREGADO
          numero_documento: user.numero_documento,  // ← AGREGADO
          pic: '/media/avatars/blank.png',
        })
      }

      setTimeout(() => history.push('/dashboard'), 100)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-form login-signin'>
      {/* Título */}
      <div className='text-center mb-10 mb-lg-20'>
        <h3 className='font-size-h1'>Iniciar sesión</h3>
        <p className='text-muted font-weight-bold'>
          Portal de Contratación Docente · UGEL Alto Amazonas
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className='alert alert-danger d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='advertencia'>
            ⚠️
          </span>
          <span className='ml-2'>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className='form' autoComplete='off'>
        {/* Usuario */}
        <div className='form-group'>
          <input
            className='form-control form-control-solid h-auto py-5 px-6'
            type='text'
            placeholder='Usuario o correo electrónico'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete='username'
            required
          />
        </div>

        {/* Contraseña */}
        <div className='form-group position-relative'>
          <input
            className='form-control form-control-solid h-auto py-5 px-6'
            type={showPassword ? 'text' : 'password'}
            placeholder='Contraseña'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete='current-password'
            required
          />

          <button
            type='button'
            className='btn btn-link position-absolute right-0 top-0 mt-3 mr-4'
            onClick={() => setShowPassword(!showPassword)}
            style={{color: '#a1a5b7'}}
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <IconEye show={showPassword} />
          </button>
        </div>

        {/* Links */}
        <div className='form-group d-flex flex-wrap justify-content-between align-items-center'>
          <Link to='/auth/forgot-password' className='text-muted text-hover-primary'>
            ¿Olvidaste tu contraseña?
          </Link>

          <Link to='/auth/registration' className='text-muted text-hover-primary'>
            ¿No tienes cuenta? <span className='font-weight-bold'>Regístrate</span>
          </Link>
        </div>

        {/* Submit */}
        <div className='form-group text-center mt-10'>
          <button type='submit' className='btn btn-primary font-weight-bold px-9 py-4 my-3' disabled={loading}>
            {loading ? (
              <>
                <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                Ingresando...
              </>
            ) : (
              'Ingresar al sistema'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

const mapDispatchToProps = (dispatch) => ({
  login: (authToken) => dispatch(auth.actions.login(authToken)),
  fulfillUser: (user) => {
    if (auth.actions.fulfillUser) dispatch(auth.actions.fulfillUser(user))
  },
})

export default injectIntl(connect(null, mapDispatchToProps)(Login))