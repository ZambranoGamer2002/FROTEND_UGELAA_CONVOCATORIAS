import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const ConvocatoriasPublicasPage = () => {
    const history = useHistory()

    // Obtener token desde Redux
    const auth = useSelector((state) => state.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

    const [convocatoria, setConvocatoria] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (token) {
            cargarConvocatoriaActiva()
        }
    }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

    const cargarConvocatoriaActiva = async () => {
        try {
            setLoading(true)
            setError(null)

            const resp = await fetch(`${API_BASE}/convocatorias/activa`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (resp.status === 404) {
                // No hay convocatoria activa
                setConvocatoria(null)
                setError('No hay convocatorias disponibles en este momento')
            } else if (resp.ok) {
                const data = await resp.json()
                setConvocatoria(data)
            } else {
                const data = await resp.json()
                throw new Error(data.detail || 'Error al cargar convocatoria')
            }
        } catch (err) {
            console.error('Error:', err)
            setError(err.message || 'No se pudo cargar la convocatoria')
        } finally {
            setLoading(false)
        }
    }

    const handlePostular = () => {
        if (convocatoria) {
            history.push('/seleccion-plaza');
        }
    }

    if (loading) {
        return (
            <div className='d-flex justify-content-center align-items-center' style={{ minHeight: '400px' }}>
                <div className='spinner-border text-primary' role='status'>
                    <span className='sr-only'>Cargando...</span>
                </div>
            </div>
        )
    }

    // No hay convocatoria activa
    if (!convocatoria) {
        return (
            <div className='row'>
                <div className='col-12'>
                    <div className='card card-custom'>
                        <div className='card-body text-center py-20'>
                            <i className='fas fa-calendar-times fa-5x text-muted mb-5' />
                            <h3 className='text-dark-75 font-weight-bold mb-3'>
                                No hay convocatorias disponibles
                            </h3>
                            <p className='text-muted font-size-lg'>
                                {error || 'Las convocatorias aparecerán aquí cuando sean publicadas'}
                            </p>
                            <p className='text-muted font-size-sm mt-5'>
                                Vuelve a revisar próximamente
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Hay convocatoria activa
    return (
        <div className='row'>
            <div className='col-12'>
                {/* Header con código */}
                <div className='card card-custom mb-5 bg-primary'>
                    <div className='card-body py-5'>
                        <div className='d-flex justify-content-between align-items-center'>
                            <div>
                                <span className='badge badge-light badge-lg mb-2'>
                                    {convocatoria.codigo}
                                </span>
                                <h2 className='text-white font-weight-bolder m-0'>
                                    {convocatoria.titulo}
                                </h2>
                            </div>
                            {convocatoria.dias_restantes > 0 && (
                                <div className='text-right'>
                                    <div className='text-white font-size-sm'>Quedan</div>
                                    <div className='text-white font-size-h1 font-weight-boldest'>
                                        {convocatoria.dias_restantes}
                                    </div>
                                    <div className='text-white font-size-sm'>días</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Información principal */}
                <div className='card card-custom mb-5'>
                    <div className='card-header'>
                        <div className='card-title'>
                            <h3 className='card-label'>Información General</h3>
                        </div>
                    </div>
                    <div className='card-body'>
                        {convocatoria.descripcion && (
                            <div className='mb-5'>
                                <p className='text-dark-75 font-size-lg'>
                                    {convocatoria.descripcion}
                                </p>
                            </div>
                        )}

                        <div className='row'>
                            <div className='col-md-6'>
                                <div className='d-flex align-items-center mb-5'>
                                    <i className='fas fa-calendar-alt text-success font-size-h3 mr-3' />
                                    <div>
                                        <div className='text-muted font-size-sm'>Inicio Postulaciones</div>
                                        <div className='font-weight-bolder font-size-h6'>
                                            {convocatoria.fecha_inicio_postulacion}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='col-md-6'>
                                <div className='d-flex align-items-center mb-5'>
                                    <i className='fas fa-calendar-times text-danger font-size-h3 mr-3' />
                                    <div>
                                        <div className='text-muted font-size-sm'>Cierre Postulaciones</div>
                                        <div className='font-weight-bolder font-size-h6'>
                                            {convocatoria.fecha_fin_postulacion}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Documentos requeridos */}
                {convocatoria.documentos_requeridos && (
                    <div className='card card-custom mb-5'>
                        <div className='card-header'>
                            <div className='card-title'>
                                <h3 className='card-label'>Documentos Requeridos</h3>
                            </div>
                        </div>
                        <div className='card-body'>
                            <div className='mb-5'>
                                <h5 className='font-weight-bold text-dark mb-3'>
                                    <i className='fas fa-exclamation-circle text-danger mr-2' />
                                    Documentos Obligatorios
                                </h5>
                                <div className='row'>
                                    {convocatoria.documentos_requeridos.obligatorios?.map((doc, idx) => (
                                        <div key={idx} className='col-md-6 mb-3'>
                                            <div className='d-flex align-items-center'>
                                                <i className='fas fa-check-circle text-success mr-2' />
                                                <span className='font-weight-bold'>{doc.nombre}</span>
                                                <span className='badge badge-light-info ml-2'>
                                                    {doc.formato} - Máx {doc.tamaño_max_mb}MB
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {convocatoria.documentos_requeridos.opcionales &&
                                convocatoria.documentos_requeridos.opcionales.length > 0 && (
                                    <div>
                                        <h5 className='font-weight-bold text-dark mb-3'>
                                            <i className='fas fa-info-circle text-primary mr-2' />
                                            Documentos Opcionales (Para mayor puntaje)
                                        </h5>
                                        <div className='row'>
                                            {convocatoria.documentos_requeridos.opcionales.map((doc, idx) => (
                                                <div key={idx} className='col-md-6 mb-3'>
                                                    <div className='d-flex align-items-center'>
                                                        <i className='fas fa-file-alt text-primary mr-2' />
                                                        <span>{doc.nombre}</span>
                                                        <span className='badge badge-light-info ml-2'>
                                                            {doc.formato} - Máx {doc.tamaño_max_mb}MB
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* Botón postular */}
                <div className='card card-custom bg-light-success'>
                    <div className='card-body text-center py-10'>
                        <h3 className='text-dark-75 font-weight-bold mb-5'>
                            ¿Listo para postular?
                        </h3>
                        <button
                            className='btn btn-success btn-lg font-weight-bolder px-10'
                            onClick={handlePostular}
                        >
                            <i className='fas fa-file-upload mr-2' />
                            Postular Ahora
                        </button>
                        <p className='text-muted font-size-sm mt-5'>
                            Asegúrate de tener todos los documentos requeridos antes de iniciar
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ConvocatoriasPublicasPage