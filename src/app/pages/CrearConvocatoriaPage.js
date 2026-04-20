import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Swal from 'sweetalert2'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const CrearConvocatoriaPage = () => {
    const history = useHistory()
    const auth = useSelector((state) => state.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        año: new Date().getFullYear(),
        numero: '001',
        titulo: '',
        descripcion: '',
        fecha_inicio_postulacion: '',
        fecha_fin_postulacion: '',
    })

    const tituloLen = formData.titulo.length

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
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

            const payload = {
                año: parseInt(formData.año),
                numero: formData.numero.trim(),
                titulo: formData.titulo.trim(),
                descripcion: formData.descripcion.trim() || null,
                fecha_inicio_postulacion: formData.fecha_inicio_postulacion,
                fecha_fin_postulacion: formData.fecha_fin_postulacion,
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
                    html: `
                        <p>Se creó la convocatoria <strong>${data.codigo}</strong> en estado
                        <span style="color:#FFA800;font-weight:700">BORRADOR</span>.</p>
                        <p class="text-muted" style="font-size:13px">
                            Cuando esté lista, cambia el estado a <strong>PUBLICADA</strong>
                            para que los docentes puedan postular.
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
                        Solo SuperAdministrador puede crear convocatorias
                    </span>
                </div>
            </div>

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
                                <div className='row'>
                                    {/* Año */}
                                    <div className='col-md-4'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>
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
                                            <small className='form-text text-muted'>
                                                Año de la convocatoria
                                            </small>
                                        </div>
                                    </div>

                                    {/* Número */}
                                    <div className='col-md-4'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>
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
                                            <small className='form-text text-muted'>
                                                Correlativo (001, 002…)
                                            </small>
                                        </div>
                                    </div>

                                    {/* Código preview */}
                                    <div className='col-md-4'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>
                                                Código generado
                                            </label>
                                            <div
                                                className='form-control d-flex align-items-center'
                                                style={{ background: '#F3F6F9', color: '#3699FF', fontWeight: 700 }}
                                            >
                                                <i className='fas fa-hashtag mr-2 text-primary' />
                                                {formData.año}-{formData.numero || '???'}
                                            </div>
                                            <small className='form-text text-muted'>
                                                Generado automáticamente
                                            </small>
                                        </div>
                                    </div>
                                </div>

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

                                {/* Aviso sin límite */}
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
                                    {/* Fecha inicio */}
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

                                    {/* Fecha cierre */}
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

                                {/* Preview duración */}
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

                        {/* Resumen */}
                        <div className='card card-custom mb-5'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <h3 className='card-label font-weight-bolder font-size-sm'>
                                        Resumen
                                    </h3>
                                </div>
                            </div>
                            <div className='card-body p-5'>
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Código</div>
                                    <div className='font-weight-bolder text-primary'>
                                        {formData.año}-{formData.numero || '???'}
                                    </div>
                                </div>
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Título</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.titulo || <span className='text-muted'>Sin título</span>}
                                    </div>
                                </div>
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Inicio postulación</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.fecha_inicio_postulacion
                                            ? new Date(formData.fecha_inicio_postulacion + 'T00:00:00')
                                                .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
                                            : <span className='text-muted'>—</span>}
                                    </div>
                                </div>
                                <div className='mb-4'>
                                    <div className='text-muted font-size-xs mb-1'>Cierre postulación</div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        {formData.fecha_fin_postulacion
                                            ? new Date(formData.fecha_fin_postulacion + 'T00:00:00')
                                                .toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
                                            : <span className='text-muted'>—</span>}
                                    </div>
                                </div>
                                {diasPostulacion && (
                                    <div className='mb-4'>
                                        <div className='text-muted font-size-xs mb-1'>Duración</div>
                                        <div className='font-weight-bold' style={{ color: '#3699FF' }}>
                                            {diasPostulacion} días
                                        </div>
                                    </div>
                                )}
                                <div className='separator separator-dashed my-4' />
                                <div className='d-flex align-items-center'>
                                    <span
                                        className='label label-inline font-weight-bold'
                                        style={{ background: '#FFF4DE', color: '#FFA800', padding: '6px 12px' }}
                                    >
                                        <i className='fas fa-edit mr-1' style={{ fontSize: 10 }} />
                                        Se creará en BORRADOR
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Nota informativa */}
                        <div className='card card-custom'>
                            <div className='card-body p-5'>
                                <div className='d-flex align-items-start'>
                                    <i className='fas fa-info-circle text-info mr-3 mt-1' />
                                    <div className='text-muted font-size-sm'>
                                        La convocatoria se creará en estado <strong>BORRADOR</strong>.
                                        Podrás revisarla y cuando esté lista, cambiar el estado a{' '}
                                        <strong style={{ color: '#1BC5BD' }}>PUBLICADA</strong> para
                                        que los docentes puedan verla y postular.
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