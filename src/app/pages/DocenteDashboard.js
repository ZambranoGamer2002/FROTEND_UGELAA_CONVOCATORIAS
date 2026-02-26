/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function DocenteDashboard() {
    const auth = useSelector((s) => s.auth)
    const user = auth?.user || {}

    const hora = new Date().getHours()
    const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
    const nombreUsuario = user?.fullname || 'Docente'

    return (
        <div className='container-fluid px-0'>
            {/* Bienvenida */}
            <div
                className='card card-custom mb-7'
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', border: 'none' }}
            >
                <div className='card-body py-8 px-8'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <div>
                            <h2 className='text-white font-weight-bolder mb-1'>
                                {saludo}, {nombreUsuario.split(' ')[0]}
                            </h2>
                            <p className='text-white opacity-70 mb-0'>
                                Portal de Contratación Docente — UGELAA
                            </p>
                        </div>
                        <div className='text-right d-none d-md-block'>
                            <div className='text-white opacity-70' style={{ fontSize: 13 }}>
                                {new Date().toLocaleDateString('es-PE', {
                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accesos rápidos */}
            <div className='row'>
                <div className='col-lg-4 col-md-6 mb-5'>
                    <Link to='/convocatorias' className='text-decoration-none'>
                        <div className='card card-custom card-stretch gutter-b'>
                            <div className='card-body text-center py-10'>
                                <i className='fas fa-bullhorn' style={{ fontSize: 48, color: '#FFA800' }} />
                                <h4 className='mt-5 font-weight-bolder text-dark'>Convocatorias Activas</h4>
                                <p className='text-muted mb-5'>Ver convocatorias disponibles</p>
                                <span className='btn btn-light-warning font-weight-bold px-6'>
                                    Ver Convocatorias
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className='col-lg-4 col-md-6 mb-5'>
                    <Link to='/mis-postulaciones' className='text-decoration-none'>
                        <div className='card card-custom card-stretch gutter-b'>
                            <div className='card-body text-center py-10'>
                                <i className='fas fa-file-alt' style={{ fontSize: 48, color: '#1BC5BD' }} />
                                <h4 className='mt-5 font-weight-bolder text-dark'>Mis Postulaciones</h4>
                                <p className='text-muted mb-5'>Gestionar mis postulaciones</p>
                                <span className='btn btn-light-success font-weight-bold px-6'>
                                    Ver Postulaciones
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className='col-lg-4 col-md-6 mb-5'>
                    <Link to='/mi-perfil' className='text-decoration-none'>
                        <div className='card card-custom card-stretch gutter-b'>
                            <div className='card-body text-center py-10'>
                                <i className='fas fa-user-circle' style={{ fontSize: 48, color: '#3699FF' }} />
                                <h4 className='mt-5 font-weight-bolder text-dark'>Mi Perfil</h4>
                                <p className='text-muted mb-5'>Actualizar mis datos personales</p>
                                <span className='btn btn-light-primary font-weight-bold px-6'>
                                    Ver Perfil
                                </span>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Información útil */}
            <div className='row'>
                <div className='col-12'>
                    <div className='card card-custom'>
                        <div className='card-header border-0 pt-5'>
                            <h3 className='card-title font-weight-bolder text-dark'>
                                <i className='fas fa-info-circle mr-2 text-primary' />
                                Información Importante
                            </h3>
                        </div>
                        <div className='card-body pt-2'>
                            <div className='alert alert-custom alert-light-info mb-5'>
                                <div className='alert-icon'>
                                    <i className='flaticon-information text-info' />
                                </div>
                                <div className='alert-text'>
                                    <strong>Recuerda:</strong> Mantén tu perfil actualizado para poder postular a las convocatorias.
                                    Asegúrate de tener todos tus documentos en regla.
                                </div>
                            </div>

                            <div className='timeline timeline-3'>
                                <div className='timeline-items'>
                                    <div className='timeline-item'>
                                        <div className='timeline-media bg-light-primary'>
                                            <i className='fas fa-file-upload text-primary' />
                                        </div>
                                        <div className='timeline-desc timeline-desc-light-primary'>
                                            <span className='font-weight-bolder text-primary'>Paso 1</span>
                                            <p className='font-weight-normal text-dark-50 pb-2'>
                                                Completa tu perfil con todos tus datos personales
                                            </p>
                                        </div>
                                    </div>

                                    <div className='timeline-item'>
                                        <div className='timeline-media bg-light-warning'>
                                            <i className='fas fa-search text-warning' />
                                        </div>
                                        <div className='timeline-desc timeline-desc-light-warning'>
                                            <span className='font-weight-bolder text-warning'>Paso 2</span>
                                            <p className='font-weight-normal text-dark-50 pb-2'>
                                                Revisa las convocatorias activas y selecciona las que te interesen
                                            </p>
                                        </div>
                                    </div>

                                    <div className='timeline-item'>
                                        <div className='timeline-media bg-light-success'>
                                            <i className='fas fa-check text-success' />
                                        </div>
                                        <div className='timeline-desc timeline-desc-light-success'>
                                            <span className='font-weight-bolder text-success'>Paso 3</span>
                                            <p className='font-weight-normal text-dark-50 pb-2'>
                                                Completa tu postulación subiendo todos los documentos requeridos
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}