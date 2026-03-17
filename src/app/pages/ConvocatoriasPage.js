import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import Swal from 'sweetalert2'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const ConvocatoriasPage = () => {
  // Obtener token desde Redux
  const auth = useSelector((state) => state.auth)
  const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

  const [convocatorias, setConvocatorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAño, setFiltroAño] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // ══════════════════════════════════════════════════════
  // ESTADO DEL MODAL
  // ══════════════════════════════════════════════════════
  const [showModal, setShowModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    año: new Date().getFullYear(),
    numero: '001',
    titulo: '',
    descripcion: '',
    fecha_inicio_postulacion: '',
    fecha_fin_postulacion: ''
  })

  useEffect(() => {
    if (token) {
      cargarConvocatorias()
    }
  }, [filtroAño, filtroEstado, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const cargarConvocatorias = async () => {
    try {
      setLoading(true)

      let url = `${API_BASE}/convocatorias?`
      if (filtroAño) url += `año=${filtroAño}&`
      if (filtroEstado) url += `estado=${filtroEstado}&`

      console.log('🔍 Cargando:', url)

      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (resp.status === 401) {
        Swal.fire({
          icon: 'error',
          title: 'Sesión expirada',
          text: 'Por favor, inicia sesión nuevamente'
        })
        return
      }

      const data = await resp.json()

      if (resp.ok) {
        console.log('✅ Convocatorias:', data.convocatorias?.length || 0)
        setConvocatorias(data.convocatorias || [])
      }
    } catch (err) {
      console.error('❌ Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════
  // ABRIR MODAL
  // ══════════════════════════════════════════════════════
  const handleNuevaConvocatoria = () => {
    console.log('🆕 Abriendo modal...')
    setShowModal(true)
    setFormData({
      año: new Date().getFullYear(),
      numero: '001',
      titulo: '',
      descripcion: '',
      fecha_inicio_postulacion: '',
      fecha_fin_postulacion: ''
    })
  }

  const handleCloseModal = () => {
    console.log('❌ Cerrando modal...')
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmitModal = async (e) => {
    e.preventDefault()
    console.log('💾 Guardando convocatoria...', formData)

    try {
      setGuardando(true)

      // Limpiar datos: eliminar campos vacíos/undefined
      const dataToSend = {
        año: formData.año,
        numero: formData.numero,
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        fecha_inicio_postulacion: formData.fecha_inicio_postulacion,
        fecha_fin_postulacion: formData.fecha_fin_postulacion
      }

      console.log('📤 Datos a enviar:', dataToSend)

      const resp = await fetch(`${API_BASE}/convocatorias`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      const data = await resp.json()

      if (resp.ok) {
        console.log('✅ Convocatoria creada:', data.codigo)
        setShowModal(false)
        Swal.fire({
          icon: 'success',
          title: 'Convocatoria creada',
          text: `Se creó la convocatoria ${data.codigo}`
        })
        cargarConvocatorias()
      } else {
        throw new Error(data.detail || 'Error al crear')
      }
    } catch (err) {
      console.error('❌ Error al guardar:', err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message
      })
    } finally {
      setGuardando(false)
    }
  }

  const handleCambiarEstado = async (id, nuevoEstado) => {
    try {
      const resp = await fetch(
        `${API_BASE}/convocatorias/${id}/estado?nuevo_estado=${nuevoEstado}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (resp.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Estado actualizado'
        })
        cargarConvocatorias()
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message
      })
    }
  }

  const handleEliminar = async (id, codigo) => {
    const result = await Swal.fire({
      title: '¿Eliminar?',
      text: `Convocatoria: ${codigo}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    })

    if (!result.isConfirmed) return

    try {
      const resp = await fetch(`${API_BASE}/convocatorias/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (resp.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Eliminada'
        })
        cargarConvocatorias()
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message
      })
    }
  }

  const getBadgeEstado = (estado) => {
    const badges = {
      BORRADOR: 'badge-secondary',
      PUBLICADA: 'badge-success',
      EN_REVISION: 'badge-info',
      EN_EVALUACION: 'badge-warning'
    }
    return badges[estado] || 'badge-light'
  }

  if (loading) {
    return (
      <div className='d-flex justify-content-center align-items-center' style={{ minHeight: '400px' }}>
        <div className='spinner-border text-primary' />
      </div>
    )
  }

  return (
    <>
      <div className='card card-custom'>
        {/* Header */}
        <div className='card-header border-0 pt-5'>
          <h3 className='card-title align-items-start flex-column'>
            <span className='card-label font-weight-bolder text-dark'>
              Gestión de Convocatorias
            </span>
            <span className='text-muted mt-3 font-weight-bold font-size-sm'>
              {convocatorias.length} convocatorias
            </span>
          </h3>
          <div className='card-toolbar'>
            <button
              className='btn btn-primary font-weight-bolder'
              onClick={handleNuevaConvocatoria}
            >
              <i className='fas fa-plus' /> Nueva Convocatoria
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className='card-body pt-0'>
          <div className='row mb-5'>
            <div className='col-md-3'>
              <label>Año</label>
              <select
                className='form-control'
                value={filtroAño}
                onChange={(e) => setFiltroAño(e.target.value)}
              >
                <option value=''>Todos</option>
                <option value='2025'>2025</option>
                <option value='2026'>2026</option>
              </select>
            </div>
            <div className='col-md-3'>
              <label>Estado</label>
              <select
                className='form-control'
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value=''>Todos</option>
                <option value='BORRADOR'>Borrador</option>
                <option value='PUBLICADA'>Publicada</option>
              </select>
            </div>
          </div>

          {/* Tabla */}
          <div className='table-responsive'>
            <table className='table table-head-custom table-vertical-center'>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Fechas</th>
                  <th>Estado</th>
                  <th className='text-right'>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {convocatorias.length === 0 ? (
                  <tr>
                    <td colSpan='5' className='text-center py-10'>
                      <i className='fas fa-inbox fa-3x mb-3 text-muted' />
                      <p className='text-muted'>No hay convocatorias</p>
                    </td>
                  </tr>
                ) : (
                  convocatorias.map((conv) => (
                    <tr key={conv.id}>
                      <td className='font-weight-bold'>{conv.codigo}</td>
                      <td>{conv.titulo}</td>
                      <td className='font-size-sm'>
                        {conv.fecha_inicio_postulacion} / {conv.fecha_fin_postulacion}
                      </td>
                      <td>
                        <span className={`badge ${getBadgeEstado(conv.estado)}`}>
                          {conv.estado}
                        </span>
                      </td>
                      <td className='text-right'>
                        {conv.estado === 'BORRADOR' && (
                          <>
                            <button
                              className='btn btn-sm btn-success mr-2'
                              onClick={() => handleCambiarEstado(conv.id, 'PUBLICADA')}
                            >
                              Publicar
                            </button>
                            <button
                              className='btn btn-sm btn-danger'
                              onClick={() => handleEliminar(conv.id, conv.codigo)}
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL CREAR CONVOCATORIA */}
      {/* ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className='modal fade show d-block' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className='modal-dialog modal-lg modal-dialog-centered'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title'>Nueva Convocatoria</h5>
                <button
                  type='button'
                  className='close'
                  onClick={handleCloseModal}
                >
                  <span>×</span>
                </button>
              </div>

              <form onSubmit={handleSubmitModal}>
                <div className='modal-body'>
                  <div className='row'>
                    <div className='col-md-6'>
                      <div className='form-group'>
                        <label>Año *</label>
                        <input
                          type='number'
                          name='año'
                          className='form-control'
                          value={formData.año}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='form-group'>
                        <label>Número *</label>
                        <input
                          type='text'
                          name='numero'
                          className='form-control'
                          value={formData.numero}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className='form-group'>
                    <label>Título *</label>
                    <input
                      type='text'
                      name='titulo'
                      className='form-control'
                      value={formData.titulo}
                      onChange={handleChange}
                      minLength='10'
                      required
                    />
                  </div>

                  <div className='form-group'>
                    <label>Descripción</label>
                    <textarea
                      name='descripcion'
                      className='form-control'
                      rows='3'
                      value={formData.descripcion}
                      onChange={handleChange}
                    />
                  </div>

                  <div className='row'>
                    <div className='col-md-6'>
                      <div className='form-group'>
                        <label>Fecha Inicio *</label>
                        <input
                          type='date'
                          name='fecha_inicio_postulacion'
                          className='form-control'
                          value={formData.fecha_inicio_postulacion}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='form-group'>
                        <label>Fecha Fin *</label>
                        <input
                          type='date'
                          name='fecha_fin_postulacion'
                          className='form-control'
                          value={formData.fecha_fin_postulacion}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className='modal-footer'>
                  <button
                    type='button'
                    className='btn btn-light'
                    onClick={handleCloseModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ConvocatoriasPage