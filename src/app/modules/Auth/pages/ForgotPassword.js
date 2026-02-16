import React, {useState} from 'react'
import {Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const resp = await fetch(`${API_BASE}/auth/recordar-credenciales`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })

      const data = await resp.json().catch(() => ({}))

      if (!resp.ok) {
        throw new Error(data.detail || 'Error al procesar la solicitud.')
      }

      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-form login-forgot' style={{display: 'block'}}>
      <div className='text-center mb-10 mb-lg-20'>
        <h3 className='font-size-h1'>¿Olvidaste tu contraseña?</h3>
        <div className='text-muted font-weight-bold'>
          Ingresa tu correo electrónico para recibir tus credenciales de acceso
        </div>
      </div>

      {success && (
        <div className='alert alert-success d-flex align-items-center mb-10'>
          <span role='img' aria-label='éxito' className='mr-2'>✅</span>
          <div>
            <strong>¡Correo enviado!</strong>
            <div className='mt-2 font-size-sm'>
              Si existe una cuenta con ese correo, recibirás un email con tu nombre de usuario.
              Revisa tu bandeja de entrada y carpeta de spam.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className='alert alert-danger d-flex align-items-center mb-10'>
          <span role='img' aria-label='error' className='mr-2'>⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className='form'>
        <div className='form-group'>
          <input
            className='form-control form-control-solid h-auto py-5 px-6'
            type='email'
            placeholder='Correo electrónico'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete='email'
            required
            disabled={loading}
          />
        </div>

        <div className='form-group d-flex flex-wrap flex-center'>
          <button
            type='submit'
            className='btn btn-primary font-weight-bold px-9 py-4 my-3 mx-4'
            disabled={loading}
          >
            {loading ? (
              <>
                <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                Enviando...
              </>
            ) : (
              'Enviar credenciales'
            )}
          </button>

          <Link to='/auth/login'>
            <button
              type='button'
              className='btn btn-light-primary font-weight-bold px-9 py-4 my-3 mx-4'
            >
              Cancelar
            </button>
          </Link>
        </div>
      </form>

      <div className='mt-10'>
        <div className='text-muted font-weight-bold font-size-sm text-center'>
          <p className='mb-2'>
            <span role='img' aria-label='correo'>📧</span>{' '}
            <strong>¿Qué recibirás?</strong>
          </p>
          <p className='mb-0'>
            Un correo con tu nombre de usuario para que puedas iniciar sesión.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword