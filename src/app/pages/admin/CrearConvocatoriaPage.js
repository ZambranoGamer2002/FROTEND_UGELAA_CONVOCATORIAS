import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Swal from 'sweetalert2'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const CrearConvocatoriaPage = () => {
    const history = useHistory()
    const auth = useSelector((state) => state.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

    const user = auth?.user || {}
    const roleNivel = user?.role_nivel ?? 5
    const esSuperAdmin = roleNivel === 1
    const esAdmin = roleNivel === 2

    const [loading, setLoading] = useState(false)

    // ── Año actual — calculado una sola vez, solo para preview visual ─────
    const anioActual = new Date().getFullYear()

    // ── Datos para los selectores encadenados (solo SuperAdmin) ───────────
    const [departamentos, setDepartamentos] = useState([])
    const [provincias, setProvincias] = useState([])
    const [loadingDeptos, setLoadingDeptos] = useState(false)
    const [loadingProvincias, setLoadingProvincias] = useState(false)

    // deptoFiltro solo existe en el frontend para encadenar el selector
    // provincia_id es el valor real que se envía al backend
    const [deptoFiltro, setDeptoFiltro] = useState('')

    // formData sin año ni numero — los calcula el servidor
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        fecha_inicio_postulacion: '',
        fecha_fin_postulacion: '',
        provincia_id: null,
    })

    const tituloLen = formData.titulo.length

    // ── 1. Cargar departamentos al montar (solo SuperAdmin) ───────────────
    useEffect(() => {
        if (!esSuperAdmin) return
        const fetchDeptos = async () => {
            setLoadingDeptos(true)
            try {
                const resp = await fetch(`${API_BASE}/ubigeo/departamentos`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (resp.ok) {
                    const data = await resp.json()
                    setDepartamentos(data.data || [])
                }
            } catch (err) {
                console.error('Error cargando departamentos:', err)
            } finally {
                setLoadingDeptos(false)
            }
        }
        fetchDeptos()
    }, [esSuperAdmin, token]) // eslint-disable-line

    // ── 2. Cargar provincias cuando cambia el departamento filtro ─────────
    useEffect(() => {
        if (!esSuperAdmin) return
        if (!deptoFiltro) {
            setProvincias([])
            setFormData(prev => ({ ...prev, provincia_id: null }))
            return
        }
        const fetchProvincias = async () => {
            setLoadingProvincias(true)
            try {
                const resp = await fetch(
                    `${API_BASE}/ubigeo/provincias?departamento_id=${deptoFiltro}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                if (resp.ok) {
                    const data = await resp.json()
                    setProvincias(data.data || [])
                    setFormData(prev => ({ ...prev, provincia_id: null }))
                }
            } catch (err) {
                console.error('Error cargando provincias:', err)
            } finally {
                setLoadingProvincias(false)
            }
        }
        fetchProvincias()
    }, [deptoFiltro, esSuperAdmin, token]) // eslint-disable-line

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'provincia_id'
                ? (value === '' ? null : parseInt(value))
                : value
        }))
    }

    const handleDeptoFiltro = (e) => {
        setDeptoFiltro(e.target.value)
    }

    // ── Validaciones ──────────────────────────────────────────────────────
    const validar = () => {
        if (!formData.titulo || tituloLen < 10) {
            Swal.fire({
                icon: 'warning',
                title: 'Título incompleto',
                text: 'El título debe tener al menos 10 caracteres.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }
        if (!formData.fecha_inicio_postulacion || !formData.fecha_fin_postulacion) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas requeridas',
                text: 'Debes configurar las fechas de inicio y cierre de postulación.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }
        if (formData.fecha_fin_postulacion <= formData.fecha_inicio_postulacion) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas inválidas',
                text: 'La fecha de cierre debe ser posterior a la fecha de inicio.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }
        return true
    }

    // ── Submit ────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validar()) return

        try {
            setLoading(true)

            // Payload limpio — sin año ni numero (los calcula el servidor)
            const payload = {
                titulo: formData.titulo.trim(),
                descripcion: formData.descripcion.trim() || null,
                fecha_inicio_postulacion: formData.fecha_inicio_postulacion,
                fecha_fin_postulacion: formData.fecha_fin_postulacion,
                // provincia_id: null = nacional, int = provincia específica
                // Admin: el backend fuerza su propia provincia, no se envía
                ...(esSuperAdmin && { provincia_id: formData.provincia_id }),
            }

            const resp = await fetch(`${API_BASE}/convocatorias`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await resp.json()

            if (resp.ok) {
                await Swal.fire({
                    icon: 'success',
                    title: '¡Convocatoria creada!',
                    // ── FIX 1: BORRADOR → EN ESPERA en mensaje de éxito ──
                    html: `
                        <p>Se creó la convocatoria <strong>${data.codigo}</strong> en estado
                        <span style="color:#FFA800;font-weight:700">EN ESPERA</span>.</p>
                        <p class="text-muted" style="font-size:13px">
                            El sistema la publicará automáticamente cuando llegue
                            la fecha de inicio de postulación.
                        </p>
                    `,
                    confirmButtonColor: '#1BC5BD',
                    confirmButtonText: 'Ver convocatorias',
                })
                history.push('/convocatorias')
            } else {
                throw new Error(data.detail || 'Error al crear la convocatoria')
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message,
                confirmButtonColor: '#F64E60',
            })
        } finally {
            setLoading(false)
        }
    }

    // ── Preview duración ──────────────────────────────────────────────────
    const diasPostulacion = (() => {
        if (!formData.fecha_inicio_postulacion || !formData.fecha_fin_postulacion) return null
        const diff = new Date(formData.fecha_fin_postulacion) - new Date(formData.fecha_inicio_postulacion)
        const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
        return dias > 0 ? dias : null
    })()

    // ── Datos para el resumen lateral ─────────────────────────────────────
    const deptoSeleccionado = departamentos.find(d => d.id === parseInt(deptoFiltro))
    const provinciaSeleccionada = provincias.find(p => p.id === formData.provincia_id)

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className='container-fluid px-0'>

            {/* ── Header ── */}
            <div className='d-flex align-items-center mb-7' style={{ gap: 12 }}>
                <button
                    type='button'
                    className='btn btn-sm btn-light font-weight-bold'
                    onClick={() => history.push('/convocatorias')}
                >
                    <i className='fas fa-arrow-left mr-2' />
                    Volver
                </button>
                <div>
                    <h3 className='font-weight-bolder text-dark mb-0'>Nueva Convocatoria</h3>
                    <span className='text-muted font-size-sm'>
                        {esSuperAdmin
                            ? 'SuperAdministrador — puedes asignar cualquier provincia o alcance nacional'
                            : 'La convocatoria se asignará automáticamente a tu provincia (UGEL)'
                        }
                    </span>
                </div>
            </div>

            {/* ── Aviso informativo para Admin ── */}
            {esAdmin && (
                <div
                    className='alert d-flex align-items-center mb-5'
                    style={{ background: '#EEF6FF', border: '1px solid #3699FF', borderRadius: 8 }}
                >
                    <i className='fas fa-info-circle mr-3' style={{ color: '#3699FF', fontSize: 18 }} />
                    <span style={{ color: '#3699FF', fontSize: 13 }}>
                        Esta convocatoria se asignará automáticamente a <strong>tu provincia (UGEL)</strong>.
                        Solo el SuperAdministrador puede cambiar esta asignación.
                    </span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className='row'>

                    {/* ══ COLUMNA PRINCIPAL ══════════════════════════════════ */}
                    <div className='col-xl-8'>

                        {/* ── Sección: Identificación ── */}
                        <div className='card card-custom mb-5'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <span className='card-icon'>
                                        <i className='fas fa-id-card text-primary' />
                                    </span>
                                    <h3 className='card-label font-weight-bolder'>
                                        Identificación
                                    </h3>
                                </div>
                            </div>
                            <div className='card-body'>

                                {/* Año y Código — solo lectura, calculados por el servidor */}
                                <div className='row mb-5'>
                                    <div className='col-md-6'>
                                        <div className='form-group mb-0'>
                                            <label className='font-weight-bold font-size-sm'>
                                                Año
                                            </label>
                                            <div
                                                className='form-control d-flex align-items-center'
                                                style={{ background: '#F3F6F9', color: '#3F4254', fontWeight: 600 }}
                                            >
                                                <i className='fas fa-calendar mr-2 text-muted' />
                                                {anioActual}
                                            </div>
                                            <small className='form-text text-muted'>
                                                Asignado automáticamente por el servidor
                                            </small>
                                        </div>
                                    </div>

                                    <div className='col-md-6'>
                                        <div className='form-group mb-0'>
                                            <label className='font-weight-bold font-size-sm'>
                                                Código que se generará
                                            </label>
                                            <div
                                                className='form-control d-flex align-items-center'
                                                style={{ background: '#F3F6F9', color: '#3699FF', fontWeight: 700 }}
                                            >
                                                <i className='fas fa-hashtag mr-2 text-primary' />
                                                {anioActual}-
                                                <span style={{ color: '#B5B5C3', fontWeight: 400, marginLeft: 2 }}>
                                                    (auto)
                                                </span>
                                            </div>
                                            <small className='form-text text-muted'>
                                                El servidor asigna el correlativo automáticamente (001, 002…)
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Selectores encadenados — SOLO SuperAdmin ── */}
                                {esSuperAdmin && (
                                    <div
                                        className='rounded p-5 mb-5'
                                        style={{ background: '#F8F9FA', border: '1px dashed #D1D3E0' }}
                                    >
                                        <div
                                            className='font-weight-bold font-size-sm mb-4'
                                            style={{ color: '#3F4254' }}
                                        >
                                            <i className='fas fa-map-marker-alt mr-2 text-primary' />
                                            Alcance de la convocatoria
                                        </div>

                                        <div className='row'>
                                            {/* Paso 1 — Departamento (filtro visual) */}
                                            <div className='col-md-6'>
                                                <div className='form-group mb-0'>
                                                    <label className='font-weight-bold font-size-sm'>
                                                        1. Departamento
                                                    </label>
                                                    {loadingDeptos ? (
                                                        <div className='d-flex align-items-center' style={{ gap: 8, height: 38 }}>
                                                            <span className='spinner-border spinner-border-sm text-primary' />
                                                            <span className='text-muted font-size-sm'>Cargando...</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            className='form-control'
                                                            value={deptoFiltro}
                                                            onChange={handleDeptoFiltro}
                                                        >
                                                            <option value=''>Nacional (todos)</option>
                                                            {departamentos.map(d => (
                                                                <option key={d.id} value={d.id}>
                                                                    {d.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <small className='form-text text-muted'>
                                                        Filtra las provincias disponibles
                                                    </small>
                                                </div>
                                            </div>

                                            {/* Paso 2 — Provincia (valor real enviado al backend) */}
                                            <div className='col-md-6'>
                                                <div className='form-group mb-0'>
                                                    <label
                                                        className='font-weight-bold font-size-sm'
                                                        style={{ color: deptoFiltro ? '#3F4254' : '#B5B5C3' }}
                                                    >
                                                        2. Provincia (UGEL)
                                                    </label>
                                                    {loadingProvincias ? (
                                                        <div className='d-flex align-items-center' style={{ gap: 8, height: 38 }}>
                                                            <span className='spinner-border spinner-border-sm text-primary' />
                                                            <span className='text-muted font-size-sm'>Cargando...</span>
                                                        </div>
                                                    ) : (
                                                        <select
                                                            name='provincia_id'
                                                            className='form-control'
                                                            value={formData.provincia_id ?? ''}
                                                            onChange={handleChange}
                                                            disabled={!deptoFiltro}
                                                            style={{
                                                                background: !deptoFiltro ? '#F3F6F9' : '#fff',
                                                                cursor: !deptoFiltro ? 'not-allowed' : 'pointer'
                                                            }}
                                                        >
                                                            <option value=''>
                                                                {deptoFiltro
                                                                    ? 'Todas las provincias del departamento'
                                                                    : 'Primero selecciona un departamento'
                                                                }
                                                            </option>
                                                            {provincias.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    <small className='form-text text-muted'>
                                                        {deptoFiltro
                                                            ? 'Provincia específica que gestionará esta convocatoria'
                                                            : 'Selecciona un departamento primero'
                                                        }
                                                    </small>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Indicador visual del alcance resultante */}
                                        <div className='mt-4 d-flex align-items-center' style={{ gap: 8 }}>
                                            <i className='fas fa-check-circle'
                                                style={{ color: '#1BC5BD', fontSize: 14 }} />
                                            <span className='font-size-sm font-weight-bold' style={{ color: '#3F4254' }}>
                                                Alcance:{' '}
                                                {!deptoFiltro ? (
                                                    <span style={{ color: '#3699FF' }}>Nacional</span>
                                                ) : provinciaSeleccionada ? (
                                                    <span style={{ color: '#1BC5BD' }}>
                                                        {deptoSeleccionado?.nombre} &rsaquo; {provinciaSeleccionada.nombre}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#FFA800' }}>
                                                        {deptoSeleccionado?.nombre} (todas sus provincias)
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Título */}
                                <div className='form-group'>
                                    <label className='font-weight-bold font-size-sm'>
                                        Título <span className='text-danger'>*</span>
                                    </label>
                                    <input
                                        type='text'
                                        name='titulo'
                                        className='form-control'
                                        value={formData.titulo}
                                        onChange={handleChange}
                                        placeholder='Ej: Contratación Docente 2026 — Educación Básica Regular'
                                        minLength='10'
                                        maxLength='500'
                                        required
                                    />
                                    <div className='d-flex justify-content-between mt-1'>
                                        <small className='text-muted'>Mínimo 10 caracteres</small>
                                        <small
                                            className='font-weight-bold'
                                            style={{ color: tituloLen < 10 ? '#F64E60' : '#1BC5BD' }}
                                        >
                                            {tituloLen}/500
                                        </small>
                                    </div>
                                </div>

                                {/* Descripción */}
                                <div className='form-group mb-0'>
                                    <label className='font-weight-bold font-size-sm'>
                                        Descripción
                                        <span className='text-muted font-weight-normal ml-2'>(opcional)</span>
                                    </label>
                                    <textarea
                                        name='descripcion'
                                        className='form-control'
                                        rows='3'
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        placeholder='Descripción detallada de la convocatoria, requisitos generales, etc.'
                                    />
                                </div>

                            </div>
                        </div>

                        {/* ── Sección: Cronograma ── */}
                        <div className='card card-custom mb-5'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <span className='card-icon'>
                                        <i className='fas fa-calendar-alt text-success' />
                                    </span>
                                    <h3 className='card-label font-weight-bolder'>
                                        Cronograma de Postulación
                                    </h3>
                                </div>
                            </div>
                            <div className='card-body'>

                                <div
                                    className='rounded p-4 mb-6 d-flex align-items-start'
                                    style={{ background: '#E8FFF3', borderLeft: '4px solid #1BC5BD' }}
                                >
                                    <i className='fas fa-users mr-3 mt-1' style={{ color: '#1BC5BD', fontSize: 16 }} />
                                    <div>
                                        <div className='font-weight-bold' style={{ color: '#1BC5BD', fontSize: 13 }}>
                                            Sin límite de postulantes
                                        </div>
                                        <div className='text-muted font-size-sm mt-1'>
                                            Todos los docentes <strong>habilitados</strong> podrán postular
                                            durante el período activo. No existe un cupo máximo de postulaciones.
                                        </div>
                                    </div>
                                </div>

                                <div className='row'>
                                    <div className='col-md-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>
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
                                            <small className='form-text text-muted'>
                                                Desde esta fecha los docentes pueden postular
                                            </small>
                                        </div>
                                    </div>

                                    <div className='col-md-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>
                                                Fecha Cierre Postulación <span className='text-danger'>*</span>
                                            </label>
                                            <input
                                                type='date'
                                                name='fecha_fin_postulacion'
                                                className='form-control'
                                                value={formData.fecha_fin_postulacion}
                                                min={formData.fecha_inicio_postulacion || undefined}
                                                onChange={handleChange}
                                                required
                                            />
                                            <small className='form-text text-muted'>
                                                Hasta esta fecha se aceptan postulaciones
                                            </small>
                                        </div>
                                    </div>
                                </div>

                                {diasPostulacion && (
                                    <div
                                        className='rounded p-3 d-flex align-items-center'
                                        style={{ background: '#EEF6FF' }}
                                    >
                                        <i className='fas fa-clock mr-2' style={{ color: '#3699FF' }} />
                                        <span style={{ color: '#3699FF', fontSize: 13 }}>
                                            El período de postulación tendrá una duración de{' '}
                                            <strong>{diasPostulacion} días</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ══ COLUMNA LATERAL ════════════════════════════════════ */}
                    <div className='col-xl-4'>

                        <div className='card card-custom mb-5'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <h3 className='card-label font-weight-bolder font-size-sm'>
                                        Resumen
                                    </h3>
                                </div>
                            </div>
                            <div className='card-body p-5'>

                                {/* Código — preview con (auto) */}
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Código</div>
                                    <div className='font-weight-bolder text-primary'>
                                        {anioActual}-
                                        <span style={{ color: '#B5B5C3', fontWeight: 400 }}>auto</span>
                                    </div>
                                </div>

                                {/* Alcance */}
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Alcance</div>
                                    <div className='font-weight-bold font-size-sm'>
                                        {esSuperAdmin ? (
                                            !deptoFiltro ? (
                                                <span style={{ color: '#3699FF' }}>Nacional</span>
                                            ) : provinciaSeleccionada ? (
                                                <span style={{ color: '#1BC5BD' }}>
                                                    {deptoSeleccionado?.nombre}
                                                    <i className='fas fa-angle-right mx-2' style={{ fontSize: 10 }} />
                                                    {provinciaSeleccionada.nombre}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#FFA800' }}>
                                                    {deptoSeleccionado?.nombre}
                                                </span>
                                            )
                                        ) : (
                                            <span className='text-dark'>Tu provincia (UGEL) asignada</span>
                                        )}
                                    </div>
                                </div>

                                {/* Título */}
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Título</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.titulo || <span className='text-muted'>Sin título</span>}
                                    </div>
                                </div>

                                {/* Inicio postulación */}
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Inicio postulación</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.fecha_inicio_postulacion
                                            ? new Date(formData.fecha_inicio_postulacion + 'T00:00:00')
                                                .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
                                            : <span className='text-muted'>—</span>}
                                    </div>
                                </div>

                                {/* Cierre postulación */}
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Cierre postulación</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.fecha_fin_postulacion
                                            ? new Date(formData.fecha_fin_postulacion + 'T00:00:00')
                                                .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
                                            : <span className='text-muted'>—</span>}
                                    </div>
                                </div>

                                {/* Duración */}
                                {diasPostulacion && (
                                    <div className='mb-4'>
                                        <div className='text-muted font-size-xs mb-1'>Duración</div>
                                        <div className='font-weight-bold' style={{ color: '#3699FF' }}>
                                            {diasPostulacion} días
                                        </div>
                                    </div>
                                )}

                                <div className='separator separator-dashed my-4' />

                                {/* ── FIX 2: badge lateral BORRADOR → EN ESPERA ── */}
                                <div className='d-flex align-items-center'>
                                    <span
                                        className='label label-inline font-weight-bold'
                                        style={{ background: '#FFF4DE', color: '#FFA800', padding: '6px 12px' }}
                                    >
                                        <i className='fas fa-clock mr-1' style={{ fontSize: 10 }} />
                                        Se creará en EN ESPERA
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── FIX 3: card informativa inferior ── */}
                        <div className='card card-custom'>
                            <div className='card-body p-5'>
                                <div className='d-flex align-items-start'>
                                    <i className='fas fa-info-circle text-info mr-3 mt-1' />
                                    <div className='text-muted font-size-sm'>
                                        La convocatoria se creará en estado{' '}
                                        <strong style={{ color: '#FFA800' }}>EN ESPERA</strong>.
                                        El sistema la{' '}
                                        <strong>publicará automáticamente</strong> cuando llegue
                                        la fecha de inicio de postulación, sin necesidad de
                                        intervención manual.
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ── Footer ── */}
                <div className='d-flex justify-content-between mt-2 mb-8'>
                    <button
                        type='button'
                        className='btn btn-light-danger font-weight-bold'
                        onClick={() => history.push('/convocatorias')}
                        disabled={loading}
                    >
                        <i className='fas fa-times mr-2' />
                        Cancelar
                    </button>
                    <button
                        type='submit'
                        className='btn btn-primary font-weight-bold px-8'
                        disabled={loading}
                        style={{ borderRadius: 8 }}
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

            </form>
        </div>
    )
}

export default CrearConvocatoriaPage
