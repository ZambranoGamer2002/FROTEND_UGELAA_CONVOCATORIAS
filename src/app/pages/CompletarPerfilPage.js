import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

export default function CompletarPerfilPage() {
  const history = useHistory()
  const auth = useSelector((s) => s.auth)
  const token = auth?.authToken || ''
  const user = auth?.user || {}

  // Estados del formulario
  const [celular, setCelular] = useState('')
  const [departamentoId, setDepartamentoId] = useState('')
  const [provinciaId, setProvinciaId] = useState('')
  const [distritoId, setDistritoId] = useState('')
  const [direccion, setDireccion] = useState('')
  const [documentoDNI, setDocumentoDNI] = useState(null)

  // Ubigeo
  const [departamentos, setDepartamentos] = useState([])
  const [provincias, setProvincias] = useState([])
  const [distritos, setDistritos] = useState([])

  // Estados UI
  const [cargando, setCargando] = useState(false)
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true)
  const [cargandoProvincias, setCargandoProvincias] = useState(false)
  const [cargandoDistritos, setCargandoDistritos] = useState(false)

  const headers = { Authorization: `Bearer ${token}` }

  // Cargar departamentos
  useEffect(() => {
    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE}/ubigeo/departamentos`, { headers })
        const data = await resp.json()
        setDepartamentos(Array.isArray(data) ? data : data.data || [])
      } catch (err) {
        console.error('Error al cargar departamentos:', err)
      } finally {
        setCargandoDepartamentos(false)
      }
    }
    if (token) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Cargar provincias cuando cambia departamento
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
      const resp = await fetch(`${API_BASE}/ubigeo/provincias/${deptId}`, { headers })
      const data = await resp.json()
      setProvincias(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Error al cargar provincias:', err)
    } finally {
      setCargandoProvincias(false)
    }
  }

  // Cargar distritos cuando cambia provincia
  const handleProvinciaChange = async (e) => {
    const provId = e.target.value
    setProvinciaId(provId)
    setDistritoId('')
    setDistritos([])

    if (!provId) return

    setCargandoDistritos(true)
    try {
      const resp = await fetch(`${API_BASE}/ubigeo/distritos/${provId}`, { headers })
      const data = await resp.json()
      setDistritos(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Error al cargar distritos:', err)
    } finally {
      setCargandoDistritos(false)
    }
  }

  // Manejar cambio de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ El archivo no debe superar 5 MB')
      e.target.value = ''
      return
    }

    // Validar formato
    const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png']
    const extension = file.name.split('.').pop().toLowerCase()
    if (!extensionesPermitidas.includes(extension)) {
      alert('❌ Solo se permiten archivos PDF, JPG o PNG')
      e.target.value = ''
      return
    }

    setDocumentoDNI(file)
  }

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validaciones
    if (!celular || celular.length < 9) {
      alert('⚠️ Ingresa un número de celular válido')
      return
    }

    if (!departamentoId || !provinciaId || !distritoId) {
      alert('⚠️ Debes seleccionar departamento, provincia y distrito')
      return
    }

    if (!direccion.trim()) {
      alert('⚠️ Ingresa tu dirección completa')
      return
    }

    if (!documentoDNI) {
      alert('⚠️ Debes subir tu documento de identidad (DNI)')
      return
    }

    setCargando(true)

    try {
      // Preparar FormData
      const formData = new FormData()
      formData.append('celular', celular)
      formData.append('departamento_id', departamentoId)
      formData.append('provincia_id', provinciaId)
      formData.append('distrito_id', distritoId)
      formData.append('direccion', direccion.toUpperCase())
      formData.append('documento_dni', documentoDNI)

      // Enviar
      const resp = await fetch(`${API_BASE}/perfil/completar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const data = await resp.json()

      if (!resp.ok) {
        throw new Error(data.detail || 'Error al completar perfil')
      }

      alert('✅ ¡Perfil completado exitosamente!')

      // Actualizar usuario en Redux (opcional - requiere dispatch)
      // dispatch(actions.updateUser({ perfil_completo: true, estado: 'activo' }))

      // Redireccionar al dashboard
      setTimeout(() => {
        history.push('/dashboard')
        window.location.reload() // Forzar recarga para actualizar menú
      }, 1500)

    } catch (err) {
      alert('❌ ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className='card card-custom'>
      <div className='card-header border-0 pt-5' style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
        <h3 className='card-title align-items-start flex-column'>
          <span className='card-label font-weight-bolder text-white font-size-h3'>
            Completar Perfil
          </span>
          <span className='text-white opacity-70 mt-1 font-weight-bold font-size-sm'>
            Por favor, completa los siguientes datos para activar tu cuenta
          </span>
        </h3>
      </div>

      <form onSubmit={handleSubmit} className='form'>
        <div className='card-body'>

          {/* Alerta informativa */}
          <div className='alert alert-custom alert-light-primary mb-8'>
            <div className='alert-icon'>
              <i className='flaticon-information text-primary' />
            </div>
            <div className='alert-text'>
              <strong>Importante:</strong> Debes completar estos datos para poder acceder a las convocatorias y postulaciones.
              Todos los campos son obligatorios.
            </div>
          </div>

          {/* Datos de usuario (solo lectura) */}
          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Datos Registrados</h5>
            <div className='row'>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>Nombres completos</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.fullname || ''}
                    disabled
                  />
                </div>
              </div>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>DNI</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.numero_documento || ''}
                    disabled
                  />
                </div>
              </div>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='text-muted font-size-sm'>Correo electrónico</label>
                  <input
                    type='text'
                    className='form-control form-control-solid'
                    value={user?.email || ''}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Datos adicionales */}
          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Datos Adicionales</h5>
            
            {/* Celular */}
            <div className='row'>
              <div className='col-md-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Celular <span className='text-danger'>*</span></label>
                  <input
                    type='tel'
                    className='form-control form-control-lg'
                    placeholder='965 123 456'
                    value={celular}
                    onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                    maxLength={15}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className='row'>
              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Departamento <span className='text-danger'>*</span></label>
                  <select
                    className='form-control form-control-lg'
                    value={departamentoId}
                    onChange={handleDepartamentoChange}
                    disabled={cargandoDepartamentos}
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

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Provincia <span className='text-danger'>*</span></label>
                  <select
                    className='form-control form-control-lg'
                    value={provinciaId}
                    onChange={handleProvinciaChange}
                    disabled={!departamentoId || cargandoProvincias}
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

              <div className='col-md-4'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Distrito <span className='text-danger'>*</span></label>
                  <select
                    className='form-control form-control-lg'
                    value={distritoId}
                    onChange={(e) => setDistritoId(e.target.value)}
                    disabled={!provinciaId || cargandoDistritos}
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

            {/* Dirección */}
            <div className='row'>
              <div className='col-12'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Dirección exacta <span className='text-danger'>*</span></label>
                  <textarea
                    className='form-control form-control-lg'
                    rows={2}
                    placeholder='Calle, número, urbanización, referencia...'
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    required
                    style={{ resize: 'none' }}
                  />
                  <span className='form-text text-muted'>
                    Ejemplo: Jr. Los Pinos 123, Urb. Las Flores, frente al parque
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upload DNI */}
          <div className='mb-8'>
            <h5 className='font-weight-bolder mb-4 text-dark'>Documento de Identidad</h5>
            <div className='row'>
              <div className='col-md-6'>
                <div className='form-group'>
                  <label className='font-weight-bold'>Subir DNI (PDF, JPG o PNG) <span className='text-danger'>*</span></label>
                  <div className='custom-file'>
                    <input
                      type='file'
                      className='custom-file-input'
                      id='documentoDNI'
                      accept='.pdf,.jpg,.jpeg,.png'
                      onChange={handleFileChange}
                      required
                    />
                    <label className='custom-file-label' htmlFor='documentoDNI'>
                      {documentoDNI ? documentoDNI.name : 'Seleccionar archivo...'}
                    </label>
                  </div>
                  <span className='form-text text-muted'>
                    Tamaño máximo: 5 MB. Formatos permitidos: PDF, JPG, PNG
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className='card-footer border-top py-5'>
          <div className='d-flex justify-content-between'>
            <button
              type='button'
              className='btn btn-light-secondary font-weight-bold px-8'
              onClick={() => history.push('/dashboard')}
              disabled={cargando}
            >
              Cancelar
            </button>

            <button
              type='submit'
              className='btn btn-primary font-weight-bold px-8'
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className='spinner-border spinner-border-sm mr-2' />
                  Guardando...
                </>
              ) : (
                'Completar Perfil'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}