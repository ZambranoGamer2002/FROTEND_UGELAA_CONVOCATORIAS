/**
 * MisPostulacionesPage.js — v1
 * - Lista postulaciones FINALIZADAS del docente
 * - Descarga PDF generado en frontend con jsPDF
 * - Paleta unificada: header azul oscuro #1e3a5f / #2d5a8e
 */
import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
const HEADER_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'

const useToken = () => {
    const auth = useSelector((s) => s.auth)
    return auth?.authToken || auth?.accessToken || auth?.token || localStorage.getItem('token') || null
}

// ── Helpers ───────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
    BORRADOR: { label: 'Borrador', bg: '#F3F6F9', color: '#7E8299', icon: 'fa-pencil-alt' },
    EN_PROGRESO: { label: 'En Progreso', bg: '#EEF6FF', color: '#3699FF', icon: 'fa-spinner' },
    ENVIADA: { label: 'Enviada', bg: '#E8FFF3', color: '#1BC5BD', icon: 'fa-paper-plane' },
    EN_REVISION: { label: 'En Revisión', bg: '#FFF4DE', color: '#FFA800', icon: 'fa-search' },
    EN_EVALUACION: { label: 'En Evaluación', bg: '#EEE5FF', color: '#8950FC', icon: 'fa-star' },
    RESULTADOS_PRELIMINARES: { label: 'Resultados Preliminares', bg: '#FFF4DE', color: '#FFA800', icon: 'fa-clipboard-list' },
    RESULTADOS_FINALES: { label: 'Resultados Finales', bg: '#E8FFF3', color: '#1BC5BD', icon: 'fa-clipboard-check' },
    ADJUDICACION: { label: 'Adjudicación', bg: '#EEE5FF', color: '#8950FC', icon: 'fa-gavel' },
    FINALIZADA: { label: 'Finalizada', bg: '#E8FFF3', color: '#1BC5BD', icon: 'fa-check-circle' },
    CERRADA: { label: 'Cerrada', bg: '#FFE2E5', color: '#F64E60', icon: 'fa-times-circle' },
}

const estadoBadge = (estado) => {
    const cfg = ESTADO_CONFIG[estado] || { label: estado, bg: '#F3F6F9', color: '#7E8299', icon: 'fa-circle' }
    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ backgroundColor: cfg.bg, color: cfg.color, padding: '5px 12px', fontSize: 12 }}
        >
            <i className={`fas ${cfg.icon} mr-1`} style={{ fontSize: 11 }} />
            {cfg.label}
        </span>
    )
}

const formatFecha = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Generador PDF ─────────────────────────────────────────────────────────

const generarPDF = (post) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const margen = 20
    let y = 0

    // ── Encabezado azul
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, W, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CONSTANCIA DE POSTULACIÓN', W / 2, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Gestión de Concurso Docente', W / 2, 24, { align: 'center' })
    doc.setFontSize(9)
    doc.text(`Generado el ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`, W / 2, 31, { align: 'center' })

    y = 50

    // ── Sección: Datos de la postulación
    const seccion = (titulo, yPos) => {
        doc.setFillColor(238, 246, 255)
        doc.rect(margen, yPos, W - margen * 2, 8, 'F')
        doc.setTextColor(30, 58, 95)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(titulo, margen + 3, yPos + 5.5)
        return yPos + 12
    }

    const fila = (label, valor, yPos, labelW = 55) => {
        doc.setTextColor(126, 130, 153)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(label, margen, yPos)
        doc.setTextColor(30, 30, 30)
        doc.setFont('helvetica', 'bold')
        doc.text(String(valor || '—'), margen + labelW, yPos)
        return yPos + 7
    }

    // Datos generales
    y = seccion('DATOS DE LA POSTULACIÓN', y)
    y = fila('Código:', post.codigo, y)
    y = fila('Estado:', ESTADO_CONFIG[post.estado]?.label || post.estado, y)
    y = fila('Fecha de postulación:', formatFecha(post.fecha_postulacion), y)
    y += 4

    // Plaza seleccionada
    y = seccion('PLAZA SELECCIONADA', y)
    y = fila('Modalidad:', post.modalidad_nombre, y)
    y = fila('Nivel:', post.nivel_nombre, y)
    y = fila('Especialidad:', post.especialidad_nombre, y)
    y += 4

    // Estado de documentos
    y = seccion('ESTADO DE DOCUMENTOS', y)
    y = fila('Docs. obligatorios completos:', post.documentos_obligatorios_completos ? 'Sí' : 'No', y)
    y = fila('Plaza seleccionada:', post.plaza_seleccionada ? 'Sí' : 'No', y)
    y += 4

    // Pie de página
    doc.setDrawColor(220, 220, 220)
    doc.line(margen, 270, W - margen, 270)
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Este documento es una constancia generada automáticamente por el sistema.', W / 2, 276, { align: 'center' })
    doc.text('Para validación oficial, comuníquese con la DRE correspondiente.', W / 2, 281, { align: 'center' })

    doc.save(`Postulacion_${post.codigo || post.id}.pdf`)
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ESTADOS_VISIBLES = [
    'ENVIADA', 'EN_REVISION', 'EN_EVALUACION',
    'RESULTADOS_PRELIMINARES', 'RESULTADOS_FINALES',
    'ADJUDICACION', 'FINALIZADA', 'CERRADA'
]

const MisPostulacionesPage = () => {
    const history = useHistory()
    const token = useToken()

    const [postulaciones, setPostulaciones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [descargando, setDescargando] = useState(null) // id de la que se está descargando

    // ── Cargar postulaciones ──────────────────────────────────────────────
    useEffect(() => { cargarPostulaciones() }, []) // eslint-disable-line

    const cargarPostulaciones = async () => {
        if (!token) {
            setError('No hay sesión activa.')
            setCargando(false)
            return
        }
        setCargando(true)
        setError(null)
        try {
            const res = await axios.get(`${API_URL}/postulaciones/mis-postulaciones`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            const items = res.data?.items || []
            // Filtrar solo estados finalizados / enviados
            const filtradas = items.filter(p => ESTADOS_VISIBLES.includes(p.estado))
            setPostulaciones(filtradas)
        } catch (err) {
            setError('No se pudieron cargar tus postulaciones. Verifica tu conexión.')
        } finally {
            setCargando(false)
        }
    }

    // ── Descargar PDF ─────────────────────────────────────────────────────
    const handleDescargar = async (post) => {
        setDescargando(post.id)
        try {
            // Intentar obtener detalle completo si existe el endpoint
            // Si no existe aún, usa los datos que ya tenemos
            let datos = post
            try {
                const res = await axios.get(`${API_URL}/postulaciones/${post.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.data) datos = { ...post, ...res.data }
            } catch {
                // Endpoint detalle no disponible aún — usar datos de lista
            }
            generarPDF(datos)
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF.' })
        } finally {
            setDescargando(null)
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ESTADOS UI
    // ════════════════════════════════════════════════════════════════════════

    if (cargando) {
        return (
            <div className='d-flex justify-content-center align-items-center' style={{ minHeight: 400 }}>
                <div className='text-center'>
                    <div className='spinner spinner-primary spinner-lg mb-4' />
                    <p className='text-muted font-weight-bold'>Cargando tus postulaciones...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className='d-flex justify-content-center align-items-center' style={{ minHeight: 400 }}>
                <div className='text-center'>
                    <i className='fas fa-exclamation-triangle text-danger' style={{ fontSize: 48 }} />
                    <p className='text-danger font-weight-bold mt-4'>{error}</p>
                    <button className='btn btn-primary mt-2' onClick={cargarPostulaciones}>
                        <i className='fas fa-redo mr-2' />
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className='container-fluid px-0'>

            {/* ── Header ── */}
            <div className='card card-custom mb-7' style={{ background: HEADER_GRADIENT, border: 'none' }}>
                <div className='card-body py-8 px-8'>
                    <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                        <div>
                            <h2 className='text-white font-weight-bolder mb-2'>
                                <i className='fas fa-folder-open mr-3' style={{ opacity: 0.85 }} />
                                Mis Postulaciones
                            </h2>
                            <p className='text-white mb-0' style={{ opacity: 0.8 }}>
                                Historial de tus postulaciones enviadas y finalizadas.
                            </p>
                        </div>
                        <div>
                            <span
                                className='label label-inline label-lg font-weight-bold'
                                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 13 }}
                            >
                                <i className='fas fa-list mr-2' />
                                {postulaciones.length} postulación(es)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sin postulaciones ── */}
            {postulaciones.length === 0 && (
                <div className='card card-custom'>
                    <div className='card-body py-16 text-center'>
                        <div
                            className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-6'
                            style={{ width: 80, height: 80, background: '#F3F6F9' }}
                        >
                            <i className='fas fa-folder-open' style={{ fontSize: 36, color: '#B5B5C3' }} />
                        </div>
                        <h4 className='font-weight-bolder text-dark mb-3'>
                            Aún no tienes postulaciones registradas
                        </h4>
                        <p className='text-muted mb-6' style={{ maxWidth: 400, margin: '0 auto 24px' }}>
                            Cuando completes y envíes una postulación, aparecerá aquí
                            con toda su información y podrás descargar tu constancia.
                        </p>
                        <button
                            className='btn btn-primary font-weight-bold'
                            onClick={() => history.push('/convocatorias')}
                        >
                            <i className='fas fa-search mr-2' />
                            Ver convocatorias disponibles
                        </button>
                    </div>
                </div>
            )}

            {/* ── Lista de postulaciones ── */}
            {postulaciones.length > 0 && (
                <div className='d-flex flex-column' style={{ gap: 16 }}>
                    {postulaciones.map((post) => {
                        const colorFolder = post.color_folder_hex || '#3699FF'
                        const estaDescargando = descargando === post.id

                        return (
                            <div
                                key={post.id}
                                className='card card-custom'
                                style={{ border: '1px solid #EBEDF3', borderLeft: `4px solid ${colorFolder}` }}
                            >
                                <div className='card-body p-6'>
                                    <div className='d-flex align-items-start justify-content-between flex-wrap' style={{ gap: 12 }}>

                                        {/* ── Info principal ── */}
                                        <div className='d-flex align-items-start' style={{ gap: 16, flex: 1 }}>

                                            {/* Ícono especialidad */}
                                            <div
                                                className='d-flex align-items-center justify-content-center rounded'
                                                style={{
                                                    width: 52, height: 52, flexShrink: 0,
                                                    background: `${colorFolder}18`,
                                                }}
                                            >
                                                <i className='fas fa-folder' style={{ color: colorFolder, fontSize: 24 }} />
                                            </div>

                                            {/* Datos */}
                                            <div>
                                                {/* Código + estado */}
                                                <div className='d-flex align-items-center flex-wrap mb-2' style={{ gap: 8 }}>
                                                    <span className='font-weight-bolder text-dark' style={{ fontSize: 15 }}>
                                                        {post.codigo || `#${post.id}`}
                                                    </span>
                                                    {estadoBadge(post.estado)}
                                                </div>

                                                {/* Plaza */}
                                                <div className='text-muted font-size-sm mb-2'>
                                                    <i className='fas fa-chalkboard-teacher mr-2' style={{ color: '#3699FF' }} />
                                                    <span className='font-weight-bold text-dark'>{post.modalidad_nombre || '—'}</span>
                                                    {post.nivel_nombre && (
                                                        <>
                                                            <i className='fas fa-chevron-right mx-2' style={{ fontSize: 9, color: '#B5B5C3' }} />
                                                            <span>{post.nivel_nombre}</span>
                                                        </>
                                                    )}
                                                    {post.especialidad_nombre && (
                                                        <>
                                                            <i className='fas fa-chevron-right mx-2' style={{ fontSize: 9, color: '#B5B5C3' }} />
                                                            <span style={{ color: colorFolder, fontWeight: 600 }}>{post.especialidad_nombre}</span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Fecha */}
                                                <div className='text-muted font-size-xs'>
                                                    <i className='fas fa-calendar-alt mr-1' />
                                                    Postulado el{'  '}
                                                    <span className='font-weight-bold text-dark'>
                                                        {formatFecha(post.fecha_postulacion)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Botón descargar ── */}
                                        <div className='d-flex align-items-center'>
                                            <button
                                                className='btn btn-light-primary font-weight-bold'
                                                style={{ whiteSpace: 'nowrap', borderRadius: 8 }}
                                                onClick={() => handleDescargar(post)}
                                                disabled={estaDescargando}
                                            >
                                                {estaDescargando ? (
                                                    <>
                                                        <span className='spinner-border spinner-border-sm mr-2' />
                                                        Generando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className='fas fa-file-download mr-2' />
                                                        Descargar constancia
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}

export default MisPostulacionesPage
