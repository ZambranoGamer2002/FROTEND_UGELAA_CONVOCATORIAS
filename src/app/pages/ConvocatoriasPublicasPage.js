import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const ESTADO_POST = {
    BORRADOR: { label: 'En Progreso', color: '#FFA800', bg: '#FFF4DE', icon: 'fa-edit' },
    EN_REVISION: { label: 'En Revisión', color: '#3699FF', bg: '#EEF6FF', icon: 'fa-search' },
    APROBADO: { label: 'Aprobado', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-check-circle' },
    RECHAZADO: { label: 'Rechazado', color: '#F64E60', bg: '#FFF5F8', icon: 'fa-times-circle' },
    OBSERVADO: { label: 'Observado', color: '#8950FC', bg: '#EEE5FF', icon: 'fa-exclamation-circle' },
}

const MENSAJES_ESTADO = {
    BORRADOR: {
        color: '#FFA800', bg: '#FFF4DE', icon: 'fa-exclamation-triangle',
        texto: 'Tu postulación está en progreso. Sube los documentos requeridos para enviar tu expediente.',
    },
    EN_REVISION: {
        color: '#3699FF', bg: '#EEF6FF', icon: 'fa-search',
        texto: 'Tu expediente está siendo evaluado. Te notificaremos cuando haya novedades.',
    },
    APROBADO: {
        color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-check-circle',
        texto: 'Tu postulación fue aprobada satisfactoriamente.',
    },
    RECHAZADO: {
        color: '#F64E60', bg: '#FFF5F8', icon: 'fa-times-circle',
        texto: 'Tu postulación fue rechazada. Comunícate con la UGEL para más información.',
    },
    OBSERVADO: {
        color: '#8950FC', bg: '#EEE5FF', icon: 'fa-exclamation-circle',
        texto: 'Tu expediente tiene observaciones. Revisa los documentos requeridos.',
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge de estado reutilizable
// ─────────────────────────────────────────────────────────────────────────────
const EstadoBadge = ({ estado }) => {
    const cfg = ESTADO_POST[estado] || { label: estado, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-circle' }
    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ background: cfg.bg, color: cfg.color, padding: '6px 14px', fontSize: 12, borderRadius: 6 }}
        >
            <i className={`fas ${cfg.icon} mr-2`} />
            {cfg.label}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: docente YA postulado
// ─────────────────────────────────────────────────────────────────────────────
function PanelProgreso({ postulacion, convocatoria, onVerDetalle, onModificarPlaza }) {
    const cfg = ESTADO_POST[postulacion.estado] || { label: postulacion.estado, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-circle' }
    const msg = MENSAJES_ESTADO[postulacion.estado] || MENSAJES_ESTADO.BORRADOR

    const docs = Array.isArray(postulacion.documentos) ? postulacion.documentos : []
    const subidos = docs.filter(d => d.archivo_url || d.activo !== false).length
    const total = postulacion.total_documentos_requeridos || Math.max(docs.length, 4)
    const pct = total > 0 ? Math.min(100, Math.round((subidos / total) * 100)) : 0
    const colorBarra = pct === 100 ? '#1BC5BD' : pct >= 50 ? '#3699FF' : '#FFA800'
    const diasRestantes = convocatoria?.dias_restantes ?? 0
    const puedeModificar = postulacion.estado === 'BORRADOR'

    return (
        <div className='card card-custom shadow-sm' style={{ borderLeft: `4px solid ${cfg.color}`, borderRadius: 12 }}>
            <div className='card-body p-8'>

                {/* Header */}
                <div className='d-flex align-items-start justify-content-between mb-6 flex-wrap' style={{ gap: 10 }}>
                    <div>
                        <div className='d-flex align-items-center mb-2' style={{ gap: 8 }}>
                            <i className='fas fa-file-signature text-primary' style={{ fontSize: 18 }} />
                            <h5 className='font-weight-bolder text-dark mb-0'>Mi Postulación</h5>
                        </div>
                        <span className='text-muted font-size-sm'>
                            {convocatoria?.titulo || '—'}
                        </span>
                        <div className='text-muted font-size-xs mt-1'>
                            <i className='fas fa-hashtag mr-1' />
                            {convocatoria?.codigo || '—'}
                        </div>
                    </div>
                    <EstadoBadge estado={postulacion.estado} />
                </div>

                {/* Mensaje de estado */}
                <div className='rounded p-4 mb-6 d-flex align-items-start' style={{ background: msg.bg }}>
                    <i className={`fas ${msg.icon} mr-3 mt-1`} style={{ color: msg.color, fontSize: 16 }} />
                    <span style={{ color: msg.color, fontSize: 13 }}>{msg.texto}</span>
                </div>

                {/* Stats */}
                <div className='row text-center mb-6'>
                    <div className='col-4'>
                        <div className='bg-light rounded p-3'>
                            <div className='text-muted font-size-xs mb-1'>Código</div>
                            <div className='font-weight-bolder text-dark' style={{ fontSize: 12 }}>
                                {postulacion.codigo || `POST-${String(postulacion.id).padStart(5, '0')}`}
                            </div>
                        </div>
                    </div>
                    <div className='col-4'>
                        <div className='bg-light rounded p-3'>
                            <div className='text-muted font-size-xs mb-1'>Días restantes</div>
                            <div className='font-weight-bolder' style={{
                                fontSize: 13,
                                color: diasRestantes <= 3 ? '#F64E60' : diasRestantes <= 7 ? '#FFA800' : '#1BC5BD'
                            }}>
                                {diasRestantes > 0 ? `${diasRestantes} días` : 'Plazo vencido'}
                            </div>
                        </div>
                    </div>
                    <div className='col-4'>
                        <div className='bg-light rounded p-3'>
                            <div className='text-muted font-size-xs mb-1'>Documentos</div>
                            <div className='font-weight-bolder' style={{ fontSize: 13, color: pct === 100 ? '#1BC5BD' : '#3699FF' }}>
                                {subidos} / {total}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plaza seleccionada */}
                <div className='border rounded p-4 mb-6' style={{ borderRadius: 8 }}>
                    <div className='d-flex align-items-center justify-content-between mb-3'>
                        <span className='font-weight-bolder text-dark' style={{ fontSize: 13 }}>
                            <i className='fas fa-map-marker-alt mr-2 text-primary' />
                            Plaza Seleccionada
                        </span>
                        {puedeModificar && (
                            <button
                                className='btn btn-sm btn-light-warning font-weight-bold'
                                onClick={onModificarPlaza}
                                style={{ borderRadius: 6, fontSize: 11 }}
                            >
                                <i className='fas fa-pencil-alt mr-1' />
                                Modificar
                            </button>
                        )}
                    </div>
                    <div className='row'>
                        <div className='col-6'>
                            <div className='text-muted font-size-xs mb-1'>Modalidad</div>
                            <div className='font-weight-bold text-dark font-size-sm mb-3'>
                                {postulacion.modalidad_nombre || '—'}
                            </div>
                            <div className='text-muted font-size-xs mb-1'>Nivel</div>
                            <div className='font-weight-bold text-dark font-size-sm'>
                                {postulacion.nivel_nombre || '—'}
                            </div>
                        </div>
                        <div className='col-6'>
                            <div className='text-muted font-size-xs mb-1'>Especialidad</div>
                            <div className='font-weight-bold text-dark font-size-sm mb-3'>
                                {postulacion.especialidad_nombre || '—'}
                            </div>
                            <div className='text-muted font-size-xs mb-1'>Característica</div>
                            <div className='font-weight-bold text-dark font-size-sm'>
                                {postulacion.caracteristica_nombre || 'Estatal'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className='mb-7'>
                    <div className='d-flex justify-content-between align-items-center mb-2'>
                        <span className='font-weight-bold text-dark' style={{ fontSize: 13 }}>
                            <i className='fas fa-file-alt mr-2 text-primary' />
                            Documentos subidos
                        </span>
                        <span className='font-weight-bold' style={{ fontSize: 13, color: colorBarra }}>
                            {pct}% completado
                        </span>
                    </div>
                    <div className='progress' style={{ height: 8, borderRadius: 4, background: '#EBEDF3' }}>
                        <div
                            className='progress-bar'
                            style={{ width: `${pct}%`, background: colorBarra, borderRadius: 4, transition: 'width 0.5s ease' }}
                        />
                    </div>
                    <div className='text-muted font-size-xs mt-1'>
                        {subidos} de {total} documentos subidos
                    </div>
                </div>

                <button
                    className='btn btn-primary btn-block font-weight-bold'
                    onClick={onVerDetalle}
                    style={{ borderRadius: 8, padding: '12px 0' }}
                >
                    <i className='fas fa-eye mr-2' />
                    Ver mi Postulación
                </button>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: convocatoria disponible — docente AÚN NO postulado
// ─────────────────────────────────────────────────────────────────────────────
function PanelConvocatoria({ convocatoria, onPostular }) {
    const dias = convocatoria.dias_restantes ?? 0
    const colorDias = dias <= 3 ? '#F64E60' : dias <= 7 ? '#FFA800' : '#1BC5BD'
    const bgDias = dias <= 3 ? '#FFF5F8' : dias <= 7 ? '#FFF4DE' : '#E8FFF3'

    return (
        <div className='card card-custom shadow-sm' style={{ borderRadius: 12, overflow: 'hidden' }}>

            {/* Banner superior */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', padding: '28px 32px' }}>
                <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 16 }}>
                    <div>
                        <div className='d-flex align-items-center mb-2' style={{ gap: 10 }}>
                            <span
                                className='label label-inline font-weight-bold'
                                style={{ background: 'rgba(27,197,189,0.25)', color: '#1BC5BD', padding: '4px 12px', fontSize: 11, borderRadius: 20 }}
                            >
                                <i className='fas fa-broadcast-tower mr-1' style={{ fontSize: 10 }} />
                                CONVOCATORIA ACTIVA
                            </span>
                            <span className='font-size-xs' style={{ color: 'rgba(255,255,255,0.6)' }}>
                                <i className='fas fa-hashtag mr-1' />
                                {convocatoria.codigo}
                            </span>
                        </div>
                        <h4 className='font-weight-bolder mb-1' style={{ color: '#fff' }}>
                            {convocatoria.titulo}
                        </h4>
                        {convocatoria.descripcion && (
                            <p className='mb-0 font-size-sm' style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 480 }}>
                                {convocatoria.descripcion}
                            </p>
                        )}
                    </div>

                    {/* Contador de días */}
                    <div className='text-center'>
                        <div
                            className='rounded px-5 py-4 mb-2'
                            style={{ background: bgDias, minWidth: 90, display: 'inline-block' }}
                        >
                            <div className='font-weight-bolder' style={{ color: colorDias, fontSize: 36, lineHeight: 1 }}>
                                {dias > 0 ? dias : '0'}
                            </div>
                            <div style={{ color: colorDias, fontSize: 11, marginTop: 4 }}>
                                {dias === 1 ? 'día restante' : dias > 1 ? 'días restantes' : 'vencido'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='card-body p-8'>

                {/* Fechas */}
                <div
                    className='rounded p-5 mb-7 d-flex align-items-center flex-wrap justify-content-between'
                    style={{ background: '#F8F9FA', gap: 20 }}
                >
                    <div className='d-flex align-items-center' style={{ gap: 32 }}>
                        <div>
                            <div className='text-muted font-size-xs mb-1'>
                                <i className='fas fa-calendar-check mr-1 text-success' />
                                Inicio de postulación
                            </div>
                            <div className='font-weight-bolder text-dark'>
                                {convocatoria.fecha_inicio_postulacion || '—'}
                            </div>
                        </div>
                        <i className='fas fa-long-arrow-alt-right text-muted' style={{ fontSize: 18 }} />
                        <div>
                            <div className='text-muted font-size-xs mb-1'>
                                <i className='fas fa-calendar-times mr-1 text-danger' />
                                Cierre de postulación
                            </div>
                            <div className='font-weight-bolder text-dark'>
                                {convocatoria.fecha_fin_postulacion || '—'}
                            </div>
                        </div>
                    </div>

                    {dias > 0 && (
                        <div className='d-flex align-items-center' style={{ gap: 8 }}>
                            <i className='fas fa-users text-primary' />
                            <span className='font-weight-bold text-dark font-size-sm'>
                                Todos los docentes habilitados pueden postular
                            </span>
                        </div>
                    )}
                </div>

                {/* Alerta si quedan pocos días */}
                {dias > 0 && dias <= 5 && (
                    <div
                        className='rounded p-4 mb-6 d-flex align-items-center'
                        style={{ background: '#FFF4DE', border: '1px solid #FFE2A8' }}
                    >
                        <i className='fas fa-exclamation-triangle mr-3' style={{ color: '#FFA800', fontSize: 18 }} />
                        <div>
                            <div className='font-weight-bolder' style={{ color: '#FFA800', fontSize: 13 }}>
                                ¡Quedan solo {dias} {dias === 1 ? 'día' : 'días'}!
                            </div>
                            <div className='text-muted font-size-xs mt-1'>
                                No dejes para después tu postulación. El plazo cierra pronto.
                            </div>
                        </div>
                    </div>
                )}

                {/* CTA principal */}
                <button
                    className='btn btn-primary btn-block font-weight-bolder'
                    onClick={() => onPostular(convocatoria)}
                    disabled={dias <= 0}
                    style={{ borderRadius: 10, padding: '14px 0', fontSize: 15, letterSpacing: 0.3 }}
                >
                    {dias > 0
                        ? <><i className='fas fa-paper-plane mr-2' />Postularme a esta Convocatoria</>
                        : <><i className='fas fa-lock mr-2' />Plazo de postulación cerrado</>
                    }
                </button>

                {dias <= 0 && (
                    <div className='text-center text-muted font-size-xs mt-3'>
                        El período de postulación ha finalizado.
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado vacío
// ─────────────────────────────────────────────────────────────────────────────
function SinConvocatoria() {
    return (
        <div className='card card-custom shadow-sm' style={{ borderRadius: 12 }}>
            <div className='card-body text-center py-16'>
                <div
                    className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-6'
                    style={{ width: 90, height: 90, background: '#F3F6F9' }}
                >
                    <i className='fas fa-calendar-times' style={{ fontSize: 40, color: '#B5B5C3' }} />
                </div>
                <h4 className='font-weight-bolder text-dark mb-3'>
                    Sin convocatorias activas
                </h4>
                <p className='text-muted font-size-sm mb-0' style={{ maxWidth: 360, margin: '0 auto' }}>
                    No hay convocatorias disponibles en este momento.<br />
                    Vuelve a consultar próximamente o comunícate con tu UGEL.
                </p>
            </div>
        </div>
    )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const ConvocatoriasPublicasPage = () => {
    const history = useHistory()
    const auth = useSelector((s) => s.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')

    const [convocatoria, setConvocatoria] = useState(null)
    const [postulacion, setPostulacion] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // ── Cargar datos ──────────────────────────────────────────────────────
    const cargar = useCallback(async () => {
        if (!token) return
        try {
            setLoading(true)
            setError(null)

            // ✅ FIX: usar el endpoint de convocatoria activa del docente
            // Este endpoint ya filtra por provincia del docente y fechas vigentes
            const respConv = await fetch(`${API_BASE}/convocatorias/activa`, { headers })

            let convActiva = null

            if (respConv.ok) {
                const dataConv = await respConv.json()
                // El endpoint /activa devuelve un objeto, no una lista
                convActiva = dataConv?.id ? dataConv : null
            } else if (respConv.status === 404) {
                // 404 = no hay convocatoria activa → válido, no es error
                convActiva = null
            } else {
                // Fallback: intentar con lista filtrada
                const respLista = await fetch(
                    `${API_BASE}/convocatorias/?estado=PUBLICADA&solo_activas=true`,
                    { headers }
                )
                if (respLista.ok) {
                    const dataLista = await respLista.json()
                    const lista = Array.isArray(dataLista)
                        ? dataLista
                        : Array.isArray(dataLista?.convocatorias)
                            ? dataLista.convocatorias
                            : []
                    convActiva = lista.length > 0 ? lista[0] : null
                }
            }

            setConvocatoria(convActiva)

            // Verificar si el docente ya postuló
            if (convActiva) {
                try {
                    const respPost = await fetch(
                        `${API_BASE}/postulaciones/convocatoria/${convActiva.id}/mi-postulacion`,
                        { headers }
                    )
                    if (respPost.ok) {
                        const dataPost = await respPost.json()
                        if (dataPost?.id) {
                            const respDetalle = await fetch(
                                `${API_BASE}/postulaciones/${dataPost.id}`,
                                { headers }
                            )
                            const detalle = respDetalle.ok ? await respDetalle.json() : dataPost
                            setPostulacion(detalle)
                        } else {
                            setPostulacion(null)
                        }
                    } else {
                        setPostulacion(null) // 404 = no ha postulado aún
                    }
                } catch {
                    setPostulacion(null)
                }
            } else {
                setPostulacion(null)
            }

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [token]) // eslint-disable-line

    useEffect(() => { cargar() }, [token]) // eslint-disable-line

    // ── Acciones ──────────────────────────────────────────────────────────
    const handlePostular = (conv) => {
        history.push({
            pathname: '/seleccion-plaza',
            search: `?convocatoria_id=${conv.id}`,
            state: { convocatoria_id: conv.id, convocatoria_titulo: conv.titulo },
        })
    }

    const handleVerDetalle = () => {
        if (postulacion?.id) history.push(`/postulaciones/${postulacion.id}/documentos`)
    }

    const handleModificarPlaza = () => {
        if (!postulacion?.id) return
        history.push({
            pathname: '/seleccion-plaza',
            search: `?convocatoria_id=${postulacion.convocatoria_id}&postulacion_id=${postulacion.id}&modo=editar`,
            state: {
                convocatoria_id: postulacion.convocatoria_id,
                convocatoria,
                postulacion_id: postulacion.id,
                postulacion,
                modo: 'editar',
            },
        })
    }

    // ════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════
    return (
        <div className='container-fluid px-0'>

            {/* Header */}
            <div
                className='card card-custom mb-7'
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', border: 'none', borderRadius: 12 }}
            >
                <div className='card-body py-8 px-8'>
                    <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                        <div>
                            <h2 className='text-white font-weight-bolder mb-1'>
                                <i className='fas fa-bullhorn mr-3' style={{ opacity: 0.8 }} />
                                Convocatorias Disponibles
                            </h2>
                            <p className='text-white mb-0' style={{ opacity: 0.7, fontSize: 14 }}>
                                Consulta la convocatoria activa y el estado de tu postulación.
                            </p>
                        </div>
                        {convocatoria && (
                            <div
                                className='rounded px-5 py-3 text-center d-none d-md-block'
                                style={{ background: 'rgba(255,255,255,0.12)' }}
                            >
                                <div className='text-white font-weight-bolder' style={{ fontSize: 32, lineHeight: 1 }}>
                                    {convocatoria.dias_restantes ?? 0}
                                </div>
                                <div className='text-white' style={{ fontSize: 12, opacity: 0.75 }}>
                                    días restantes
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className='text-center py-14'>
                    <div className='spinner-border text-primary mb-3' role='status' style={{ width: 40, height: 40 }} />
                    <div className='text-muted font-size-sm'>Cargando convocatoria...</div>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className='alert alert-danger d-flex align-items-center' style={{ borderRadius: 10 }}>
                    <i className='fas fa-exclamation-circle mr-3' style={{ fontSize: 18 }} />
                    <span>{error}</span>
                    <button className='btn btn-sm btn-light ml-auto' onClick={cargar}>
                        <i className='fas fa-redo mr-1' /> Reintentar
                    </button>
                </div>
            )}

            {/* Contenido */}
            {!loading && !error && (
                <>
                    {/* CASO 1: Ya postulado */}
                    {postulacion && convocatoria && (
                        <PanelProgreso
                            postulacion={postulacion}
                            convocatoria={convocatoria}
                            onVerDetalle={handleVerDetalle}
                            onModificarPlaza={handleModificarPlaza}
                        />
                    )}

                    {/* CASO 2: Convocatoria activa, aún no postulado */}
                    {!postulacion && convocatoria && (
                        <PanelConvocatoria
                            convocatoria={convocatoria}
                            onPostular={handlePostular}
                        />
                    )}

                    {/* CASO 3: Sin convocatoria activa */}
                    {!convocatoria && <SinConvocatoria />}
                </>
            )}

        </div>
    )
}

export default ConvocatoriasPublicasPage
