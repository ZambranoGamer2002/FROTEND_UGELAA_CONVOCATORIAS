import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Swal from 'sweetalert2'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const CrearConvocatoriaPage = () => {
    const history = useHistory()

    // Obtener token
    const auth = useSelector((state) => state.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        año: new Date().getFullYear(),
        numero: '001',
        titulo: '',
        descripcion: '',
        plazas_disponibles: 1,
        fecha_inicio_postulacion: '',
        fecha_fin_postulacion: ''
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validaciones básicas
        if (!formData.titulo || formData.titulo.length < 10) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'El título debe tener al menos 10 caracteres',
                confirmButtonColor: '#F64E60'
            })
            return
        }

        if (!formData.fecha_inicio_postulacion || !formData.fecha_fin_postulacion) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debes configurar las fechas de postulación',
                confirmButtonColor: '#F64E60'
            })
            return
        }

        if (formData.fecha_fin_postulacion < formData.fecha_inicio_postulacion) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'La fecha de fin debe ser posterior a la fecha de inicio',
                confirmButtonColor: '#F64E60'
            })
            return
        }

        try {
            setLoading(true)

            const resp = await fetch(`${API_BASE}/convocatorias`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            const data = await resp.json()

            if (resp.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Convocatoria creada',
                    text: `Se creó la convocatoria ${data.codigo} en estado BORRADOR`,
                    confirmButtonColor: '#1BC5BD'
                }).then(() => {
                    history.push('/convocatorias')
                })
            } else {
                throw new Error(data.detail || 'Error al crear convocatoria')
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message,
                confirmButtonColor: '#F64E60'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCancelar = () => {
        history.push('/convocatorias')
    }

    return (
        <div className='card card-custom'>
            <div className='card-header'>
                <h3 className='card-title'>
                    <span className='card-label font-weight-bolder text-dark'>
                        Nueva Convocatoria
                    </span>
                </h3>
            </div>

            <form onSubmit={handleSubmit}>
                <div className='card-body'>

                    {/* Año y Número */}
                    <div className='row'>
                        <div className='col-md-4'>
                            <div className='form-group'>
                                <label className='font-weight-bold'>
                                    Año <span className='text-danger'>*</span>
                                </label>
                                <input
                                    type='number'
                                    name='año'
                                    className='form-control'
                                    value={formData.año}
                                    onChange={handleChange}
                                    min='2020'
                                    max='2100'
                                    required
                                />
                                <small className='form-text text-muted'>Año de la convocatoria</small>
                            </div>
                        </div>

                        <div className='col-md-4'>
                            <div className='form-group'>
                                <label className='font-weight-bold'>
                                    Número <span className='text-danger'>*</span>
                                </label>
                                <input
                                    type='text'
                                    name='numero'
                                    className='form-control'
                                    value={formData.numero}
                                    onChange={handleChange}
                                    placeholder='001'
                                    maxLength='10'
                                    required
                                />
                                <small className='form-text text-muted'>Número correlativo (001, 002...)</small>
                            </div>
                        </div>

                        <div className='col-md-4'>
                            <div className='form-group'>
                                <label className='font-weight-bold'>
                                    Plazas Disponibles <span className='text-danger'>*</span>
                                </label>
                                <input
                                    type='number'
                                    name='plazas_disponibles'
                                    className='form-control'
                                    value={formData.plazas_disponibles}
                                    onChange={handleChange}
                                    min='1'
                                    required
                                />
                                <small className='form-text text-muted'>Total de plazas a ofertar</small>
                            </div>
                        </div>
                    </div>

                    {/* Título */}
                    <div className='form-group'>
                        <label className='font-weight-bold'>
                            Título <span className='text-danger'>*</span>
                        </label>
                        <input
                            type='text'
                            name='titulo'
                            className='form-control'
                            value={formData.titulo}
                            onChange={handleChange}
                            placeholder='Ej: Contratación Docente 2025 - Educación Básica Regular'
                            minLength='10'
                            maxLength='500'
                            required
                        />
                        <small className='form-text text-muted'>Mínimo 10 caracteres</small>
                    </div>

                    {/* Descripción */}
                    <div className='form-group'>
                        <label className='font-weight-bold'>Descripción</label>
                        <textarea
                            name='descripcion'
                            className='form-control'
                            rows='4'
                            value={formData.descripcion}
                            onChange={handleChange}
                            placeholder='Descripción detallada de la convocatoria...'
                        />
                        <small className='form-text text-muted'>Opcional</small>
                    </div>

                    {/* Fechas de Postulación */}
                    <div className='separator separator-dashed my-7' />
                    <h5 className='font-weight-bold mb-5'>Cronograma de Postulación</h5>

                    <div className='row'>
                        <div className='col-md-6'>
                            <div className='form-group'>
                                <label className='font-weight-bold'>
                                    Fecha Inicio Postulación <span className='text-danger'>*</span>
                                </label>
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
                                <label className='font-weight-bold'>
                                    Fecha Fin Postulación <span className='text-danger'>*</span>
                                </label>
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

                    {/* Nota informativa */}
                    <div className='alert alert-custom alert-light-info'>
                        <div className='alert-icon'>
                            <i className='fas fa-info-circle' />
                        </div>
                        <div className='alert-text'>
                            <strong>Nota:</strong> La convocatoria se creará en estado <strong>BORRADOR</strong>.
                            Podrás editarla y cuando esté lista, cambiar el estado a <strong>PUBLICADA</strong>
                            para que los docentes puedan verla y postular.
                        </div>
                    </div>

                </div>

                <div className='card-footer'>
                    <div className='d-flex justify-content-between'>
                        <button
                            type='button'
                            className='btn btn-light-danger font-weight-bold'
                            onClick={handleCancelar}
                            disabled={loading}
                        >
                            <i className='fas fa-times mr-2' />
                            Cancelar
                        </button>

                        <button
                            type='submit'
                            className='btn btn-primary font-weight-bold'
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className='spinner-border spinner-border-sm mr-2' />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <i className='fas fa-save mr-2' />
                                    Crear Convocatoria
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default CrearConvocatoriaPage