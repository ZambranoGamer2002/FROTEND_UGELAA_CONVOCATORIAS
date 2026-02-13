// src/app/modules/Auth/pages/VerifyCode.js
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, {useEffect, useState} from 'react'
import {useLocation, useHistory, Link} from 'react-router-dom'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

const VerifyCode = () => {
  const query = useQuery()
  const history = useHistory()

  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [reenviando, setReenviando] = useState(false)

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

    if (!codigo || codigo.length !== 6) {
      setError('Ingresa el código de 6 dígitos que recibiste en tu correo.')
      return
    }

    setEnviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/verificar-codigo`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, codigo}),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'No se pudo verificar el código.')
      }

      setSuccess(data.message || 'Código verificado correctamente.')

      setTimeout(() => {
        history.push(`/auth/create-password?email=${encodeURIComponent(email)}`)
      }, 900)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const handleReenviar = async () => {
    setError('')
    setSuccess('')

    if (!email) {
      setError('No se encontró el correo del registro.')
      return
    }

    setReenviando(true)
    try {
      const resp = await fetch(`${API_BASE}/auth/reenviar-codigo`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data.detail || data.message || 'No se pudo reenviar el código.')
      }

      setSuccess(data.message || 'Nuevo código enviado a tu correo.')
    } catch (err) {
      setError(err.message)
    } finally {
      setReenviando(false)
    }
  }

  const solidInput = 'form-control form-control-solid h-auto py-5 px-6'

  return (
    <div className='login-form login-signin' style={{width: '100%', maxWidth: 720}}>
      {/* Título */}
      <div className='text-center mb-10 mb-lg-15'>
        <h3 className='font-size-h1'>Verifica tu correo</h3>
        <p className='text-muted font-weight-bold mb-0'>Ingresa el código de 6 dígitos que enviamos a:</p>
        <div className='mt-2'>
          <span className='font-weight-bolder text-dark'>{email || '—'}</span>
        </div>
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
          <div className='col-lg-12'>
            <div className='form-group'>
              <label className='font-weight-bold'>Código de verificación</label>
              <input
                type='text'
                className={`${solidInput} text-center`}
                style={{fontSize: 28, letterSpacing: 10}}
                placeholder='••••••'
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
                disabled={enviando}
              />
              <span className='form-text text-muted'>Si no lo ves, revisa “Spam” o “Promociones”.</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className='d-flex flex-wrap justify-content-between align-items-center'>
          <button
            type='button'
            className='btn btn-link p-0 text-muted text-hover-primary'
            onClick={handleReenviar}
            disabled={reenviando || enviando}
          >
            {reenviando ? (
              <>
                <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                Reenviando...
              </>
            ) : (
              'Reenviar código'
            )}
          </button>

          <button
            type='submit'
            className='btn btn-primary font-weight-bold px-9 py-4 my-3'
            disabled={enviando}
          >
            {enviando ? (
              <>
                <span className='spinner-border spinner-border-sm mr-2' role='status' aria-hidden='true' />
                Verificando...
              </>
            ) : (
              'Verificar código'
            )}
          </button>
        </div>

        <div className='text-center mt-6'>
          <Link to='/auth/registration' className='text-muted text-hover-primary'>
            ¿Te equivocaste al ingresar tu correo? Volver al registro
          </Link>
        </div>
      </form>
    </div>
  )
}

export default VerifyCode
