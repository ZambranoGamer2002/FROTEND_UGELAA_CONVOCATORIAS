// src/app/modules/Auth/pages/CreatePassword.js
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useEffect, useState} from 'react'
import {useLocation, useHistory, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

const CreatePassword = () => {
  const query = useQuery()
  const history = useHistory()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const emailParam = query.get('email')
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    } else {
      setError('No se encontró el correo. Vuelve al registro.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email) {
      setError('No se encontró el correo. Vuelve al registro.')
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

      setSuccess(data.message || 'Registro completado. Ya puedes iniciar sesión.')

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
    <div className='login-form login-signin'>
      {/* Título */}
      <div className='text-center mb-10 mb-lg-15'>
        <h3 className='font-size-h1'>Crea tu contraseña</h3>
        <div className='text-muted font-weight-bold'>
          Definirás la contraseña para iniciar sesión con:
          <div className='mt-2'>
            <span className='font-weight-bolder text-dark'>{email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className='alert alert-danger d-flex align-items-center py-3 mb-5'>
          <span role='img' aria-label='advertencia'>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className='form' autoComplete='off'>
        {/* Password */}
        <div className='form-group'>
          <input
            className='form-control form-control-solid h-auto py-5 px-6'
            type='password'
            placeholder='Contraseña'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={enviando}
          />
          <span className='form-text text-muted'>
            Mínimo 8 caracteres. Combina letras y números para mayor seguridad.
          </span>
        </div>

        {/* Confirm */}
        <div className='form-group'>
          <input
            className='form-control form-control-solid h-auto py-5 px-6'
            type='password'
            placeholder='Confirmar contraseña'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={enviando}
          />
        </div>

        {/* Actions */}
        <div className='form-group d-flex flex-wrap justify-content-between align-items-center'>
          <Link to='/auth/login' className='text-muted text-hover-primary'>
            Volver al inicio de sesión
          </Link>
        </div>

        <div className='form-group text-center mt-10'>
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
              'Guardar contraseña'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreatePassword
