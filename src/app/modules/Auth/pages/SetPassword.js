// src/app/modules/Auth/pages/SetPassword.js
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useEffect, useState} from 'react'
import {useHistory, useLocation, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const SetPassword = () => {
  const history = useHistory()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const emailParam = params.get('email')
    if (emailParam) setEmail(emailParam)
  }, [location.search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('Falta el correo electrónico.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/completar-registro`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email,
          password,
          confirm_password: confirmPassword,
        }),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'No se pudo completar el registro.')
      }

      setSuccess(data.message || 'Registro completado. Ahora puedes iniciar sesión.')

      setTimeout(() => {
        history.push('/auth/login')
      }, 1200)
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
        <h3 className='font-size-h1'>Crear contraseña</h3>
        <p className='text-muted font-weight-bold mb-0'>Define tu contraseña para acceder al sistema.</p>
        {email && (
          <div className='text-muted mt-2'>
            Correo: <span className='font-weight-bolder text-dark'>{email}</span>
          </div>
        )}
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
        <div className='row'>
          {/* Email */}
          <div className='col-lg-12'>
            <div className='form-group'>
              <label className='font-weight-bold'>Correo electrónico</label>
              <input
                type='email'
                className={solidInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={enviando}
                placeholder='ejemplo@correo.com'
              />
            </div>
          </div>

          {/* Password */}
          <div className='col-lg-6'>
            <div className='form-group'>
              <label className='font-weight-bold'>Contraseña</label>
              <input
                type='password'
                className={solidInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={enviando}
                placeholder='Ingresa tu contraseña'
              />
              <span className='form-text text-muted'>Mínimo 8 caracteres.</span>
            </div>
          </div>

          {/* Confirm */}
          <div className='col-lg-6'>
            <div className='form-group'>
              <label className='font-weight-bold'>Confirmar contraseña</label>
              <input
                type='password'
                className={solidInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={enviando}
                placeholder='Repite tu contraseña'
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className='d-flex flex-wrap justify-content-between align-items-center mt-2'>
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
                Guardando...
              </>
            ) : (
              'Finalizar registro'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SetPassword
