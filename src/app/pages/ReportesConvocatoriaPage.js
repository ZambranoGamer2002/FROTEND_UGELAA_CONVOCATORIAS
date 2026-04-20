import React, { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

// ─────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
    BORRADOR: { label: 'Borrador', color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-edit' },
    EN_REVISION: { label: 'En Revisión', color: '#3699FF', bg: '#EEF6FF', icon: 'fa-search' },
    EN_EVALUACION: { label: 'En Evaluación', color: '#FFA800', bg: '#FFF4DE', icon: 'fa-star-half-alt' },
    RESULTADOS_PRELIMINARES: { label: 'Res. Preliminares', color: '#8950FC', bg: '#EEE5FF', icon: 'fa-clipboard-list' },
    RESULTADOS_FINALES: { label: 'Res. Finales', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-clipboard-check' },
    ADJUDICACION: { label: 'Adjudicación', color: '#0BB783', bg: '#E8FFF3', icon: 'fa-award' },
    FINALIZADA: { label: 'Finalizada', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-check-double' },
    CERRADA: { label: 'Cerrada', color: '#F64E60', bg: '#FFF5F8', icon: 'fa-lock' },
    APROBADO: { label: 'Aprobado', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-check-circle' },
    RECHAZADO: { label: 'Rechazado', color: '#F64E60', bg: '#FFF5F8', icon: 'fa-times-circle' },
    OBSERVADO: { label: 'Observado', color: '#8950FC', bg: '#EEE5FF', icon: 'fa-exclamation-circle' },
}

const ESTADO_CONV_CONFIG = {
    BORRADOR: { label: 'Borrador', color: '#B5B5C3' },
    PUBLICADA: { label: 'Publicada', color: '#1BC5BD' },
    EN_REVISION: { label: 'En Revisión', color: '#3699FF' },
    EN_EVALUACION: { label: 'En Evaluación', color: '#FFA800' },
    RESULTADOS_PRELIMINARES: { label: 'Res. Preliminares', color: '#8950FC' },
    RESULTADOS_FINALES: { label: 'Res. Finales', color: '#1BC5BD' },
    ADJUDICACION: { label: 'Adjudicación', color: '#0BB783' },
    FINALIZADA: { label: 'Finalizada', color: '#1BC5BD' },
    CERRADA: { label: 'Cerrada', color: '#F64E60' },
}

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────────────────

// Badge de estado postulación
function BadgeEstado({ estado }) {
    const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-circle' }
    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ background: cfg.bg, color: cfg.color, padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
        >
            <i className={`fas ${cfg.icon} mr-1`} style={{ fontSize: 10 }} />
            {cfg.label}
        </span>
    )
}

// Card estadística
function StatCard({ icon, label, value, color, bg, subtitle }) {
    return (
        <div className='col-xl-3 col-md-6 mb-5'>
            <div className='card card-custom' style={{ borderLeft: `4px solid ${color}` }}>
                <div className='card-body p-5'>
                    <div className='d-flex align-items-center justify-content-between'>
                        <div>
                            <div className='text-muted font-size-sm font-weight-bold mb-1'>{label}</div>
                            <div className='font-weight-boldest' style={{ fontSize: 28, color, lineHeight: 1 }}>{value}</div>
                            {subtitle && <div className='text-muted font-size-xs mt-1'>{subtitle}</div>}
                        </div>
                        <div
                            className='d-flex align-items-center justify-content-center rounded'
                            style={{ width: 48, height: 48, background: bg }}
                        >
                            <i className={`fas ${icon}`} style={{ color, fontSize: 20 }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────
const ReportesConvocatoriaPage = () => {
    const auth = useSelector((s) => s.auth)
    const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // ── State ────────────────────────────────────────────
    const [convocatorias, setConvocatorias] = useState([])
    const [convSeleccionada, setConvSeleccionada] = useState('')
    const [estadisticas, setEstadisticas] = useState(null)
    const [postulaciones, setPostulaciones] = useState([])
    const [totalPost, setTotalPost] = useState(0)
    const [resumenAdmin, setResumenAdmin] = useState(null)

    const [loadingConvs, setLoadingConvs] = useState(true)
    const [loadingStats, setLoadingStats] = useState(false)
    const [loadingTabla, setLoadingTabla] = useState(false)

    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [paginaActual, setPaginaActual] = useState(1)
    const ITEMS_POR_PAGINA = 10

    // ── Cargar convocatorias + resumen admin ─────────────
    useEffect(() => {
        const cargar = async () => {
            setLoadingConvs(true)
            try {
                const [rConvs, rResumen] = await Promise.all([
                    fetch(`${API_BASE}/convocatorias`, { headers }),
                    fetch(`${API_BASE}/convocatorias/admin/resumen`, { headers }),
                ])
                if (rConvs.ok) {
                    const d = await rConvs.json()
                    const lista = Array.isArray(d) ? d : (d.convocatorias || d.items || [])
                    setConvocatorias(lista)
                    if (lista.length > 0) setConvSeleccionada(String(lista[0].id))
                }
                if (rResumen.ok) {
                    const d = await rResumen.json()
                    setResumenAdmin(d)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoadingConvs(false)
            }
        }
        cargar()
    }, []) // eslint-disable-line

    // ── Cargar stats + postulaciones al cambiar convocatoria ──
    const cargarDatosConvocatoria = useCallback(async (id) => {
        if (!id) return
        setLoadingStats(true)
        setLoadingTabla(true)
        setPaginaActual(1)
        setBusqueda('')
        setFiltroEstado('TODOS')
        try {
            const [rStats, rPosts] = await Promise.all([
                fetch(`${API_BASE}/postulaciones/admin/convocatoria/${id}/estadisticas`, { headers }),
                fetch(`${API_BASE}/postulaciones/admin/convocatoria/${id}`, { headers }),
            ])
            if (rStats.ok) setEstadisticas(await rStats.json())
            else setEstadisticas(null)

            if (rPosts.ok) {
                const d = await rPosts.json()
                setPostulaciones(d.items || [])
                setTotalPost(d.total || 0)
            } else {
                setPostulaciones([])
                setTotalPost(0)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingStats(false)
            setLoadingTabla(false)
        }
    }, [token]) // eslint-disable-line

    useEffect(() => {
        if (convSeleccionada) cargarDatosConvocatoria(convSeleccionada)
    }, [convSeleccionada]) // eslint-disable-line

    // ── Filtrado + búsqueda ──────────────────────────────
    const postulacionesFiltradas = postulaciones.filter(p => {
        const matchEstado = filtroEstado === 'TODOS' || p.estado === filtroEstado
        const matchBusq = busqueda === '' ||
            p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.modalidad_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.especialidad_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            String(p.docente_id).includes(busqueda)
        return matchEstado && matchBusq
    })

    // ── Paginación ───────────────────────────────────────
    const totalPaginas = Math.ceil(postulacionesFiltradas.length / ITEMS_POR_PAGINA)
    const postsPaginadas = postulacionesFiltradas.slice(
        (paginaActual - 1) * ITEMS_POR_PAGINA,
        paginaActual * ITEMS_POR_PAGINA
    )

    // ── Exportar CSV ─────────────────────────────────────
    const exportarCSV = () => {
        const headers_csv = ['ID', 'Código', 'Docente ID', 'Modalidad', 'Nivel', 'Especialidad', 'Estado', 'Fecha Postulación', 'Plaza Seleccionada', 'Docs Completos']
        const filas = postulacionesFiltradas.map(p => [
            p.id, p.codigo, p.docente_id,
            p.modalidad_nombre, p.nivel_nombre, p.especialidad_nombre,
            p.estado,
            p.fecha_postulacion ? new Date(p.fecha_postulacion).toLocaleDateString('es-PE') : '—',
            p.plaza_seleccionada ? 'Sí' : 'No',
            p.documentos_obligatorios_completos ? 'Sí' : 'No',
        ])
        const csv = [headers_csv, ...filas].map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte_convocatoria_${convSeleccionada}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // ── Datos de la convocatoria seleccionada ────────────
    const convActual = convocatorias.find(c => String(c.id) === convSeleccionada)

    // ── Estados únicos para filtro ───────────────────────
    const estadosUnicos = ['TODOS', ...new Set(postulaciones.map(p => p.estado))]

    // ── Por estado (del objeto por_estado) ───────────────
    const porEstado = estadisticas?.por_estado || {}

    // ════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════
    return (
        <div>
            {/* ── HEADER ── */}
            <div
                className='d-flex align-items-center justify-content-between mb-7 p-6 rounded'
                style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)' }}
            >
                <div>
                    <h2 className='text-white font-weight-boldest m-0'>
                        <i className='fas fa-chart-bar mr-3' />
                        Reportes de Convocatorias
                    </h2>
                    <span className='text-white opacity-70 font-size-sm'>
                        Estadísticas y seguimiento de postulaciones
                    </span>
                </div>
                <button
                    className='btn btn-light font-weight-bold'
                    onClick={exportarCSV}
                    disabled={postulacionesFiltradas.length === 0}
                    style={{ borderRadius: 8 }}
                >
                    <i className='fas fa-file-csv mr-2 text-success' />
                    Exportar CSV
                </button>
            </div>

            {/* ── RESUMEN GENERAL ADMIN ── */}
            {resumenAdmin && (
                <div className='row mb-5'>
                    <StatCard
                        icon='fa-bullhorn'
                        label='Total Convocatorias'
                        value={resumenAdmin.total_convocatorias ?? convocatorias.length}
                        color='#3699FF'
                        bg='#EEF6FF'
                    />
                    <StatCard
                        icon='fa-check-circle'
                        label='Convocatorias Activas'
                        value={resumenAdmin.convocatorias_activas ?? '—'}
                        color='#1BC5BD'
                        bg='#E8FFF3'
                    />
                    <StatCard
                        icon='fa-users'
                        label='Total Postulantes'
                        value={resumenAdmin.total_postulantes ?? totalPost}
                        color='#8950FC'
                        bg='#EEE5FF'
                    />
                    <StatCard
                        icon='fa-map-marker-alt'
                        label='Plazas Disponibles'
                        value={resumenAdmin.total_plazas ?? '—'}
                        color='#FFA800'
                        bg='#FFF4DE'
                    />
                </div>
            )}

            {/* ── SELECTOR DE CONVOCATORIA ── */}
            <div className='card card-custom mb-5'>
                <div className='card-body p-5'>
                    <div className='row align-items-center'>
                        <div className='col-md-6'>
                            <label className='font-weight-bold text-dark mb-2'>
                                <i className='fas fa-filter mr-2 text-primary' />
                                Seleccionar Convocatoria
                            </label>
                            {loadingConvs ? (
                                <div className='d-flex align-items-center'>
                                    <span className='spinner-border spinner-border-sm text-primary mr-2' />
                                    <span className='text-muted font-size-sm'>Cargando...</span>
                                </div>
                            ) : (
                                <select
                                    className='form-control form-control-solid'
                                    value={convSeleccionada}
                                    onChange={e => setConvSeleccionada(e.target.value)}
                                    style={{ borderRadius: 8 }}
                                >
                                    {convocatorias.length === 0 && (
                                        <option value=''>Sin convocatorias</option>
                                    )}
                                    {convocatorias.map(c => (
                                        <option key={c.id} value={String(c.id)}>
                                            {c.codigo} — {c.titulo}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {convActual && (
                            <div className='col-md-6 mt-4 mt-md-0'>
                                <div className='d-flex flex-wrap gap-3'>
                                    <div className='mr-5'>
                                        <div className='text-muted font-size-xs'>Estado</div>
                                        <span
                                            className='label label-inline font-weight-bold mt-1'
                                            style={{
                                                background: (ESTADO_CONV_CONFIG[convActual.estado]?.color || '#B5B5C3') + '22',
                                                color: ESTADO_CONV_CONFIG[convActual.estado]?.color || '#B5B5C3',
                                                padding: '4px 12px', fontSize: 12
                                            }}
                                        >
                                            {ESTADO_CONV_CONFIG[convActual.estado]?.label || convActual.estado}
                                        </span>
                                    </div>
                                    <div className='mr-5'>
                                        <div className='text-muted font-size-xs'>Inicio</div>
                                        <div className='font-weight-bold font-size-sm'>{convActual.fecha_inicio_postulacion}</div>
                                    </div>
                                    <div className='mr-5'>
                                        <div className='text-muted font-size-xs'>Cierre</div>
                                        <div className='font-weight-bold font-size-sm'>{convActual.fecha_fin_postulacion}</div>
                                    </div>
                                    <div>
                                        <div className='text-muted font-size-xs'>Días restantes</div>
                                        <div
                                            className='font-weight-bold font-size-sm'
                                            style={{ color: convActual.dias_restantes <= 3 ? '#F64E60' : convActual.dias_restantes <= 7 ? '#FFA800' : '#1BC5BD' }}
                                        >
                                            {convActual.dias_restantes > 0 ? `${convActual.dias_restantes} días` : 'Cerrada'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── ESTADÍSTICAS DE LA CONVOCATORIA ── */}
            {loadingStats ? (
                <div className='text-center py-10'>
                    <span className='spinner-border text-primary' />
                    <div className='text-muted mt-3 font-size-sm'>Cargando estadísticas...</div>
                </div>
            ) : estadisticas && (
                <>
                    {/* Cards principales */}
                    <div className='row mb-5'>
                        <StatCard
                            icon='fa-users'
                            label='Total Postulaciones'
                            value={estadisticas.total_postulaciones}
                            color='#3699FF'
                            bg='#EEF6FF'
                            subtitle='Registradas en el sistema'
                        />
                        <StatCard
                            icon='fa-file-alt'
                            label='Docs. Pendientes'
                            value={estadisticas.documentos_pendientes}
                            color='#FFA800'
                            bg='#FFF4DE'
                            subtitle='Por revisar'
                        />
                        <StatCard
                            icon='fa-check-double'
                            label='Docs. Aprobados'
                            value={estadisticas.documentos_aprobados}
                            color='#1BC5BD'
                            bg='#E8FFF3'
                            subtitle='Verificados'
                        />
                        <StatCard
                            icon='fa-times-circle'
                            label='Docs. Rechazados'
                            value={estadisticas.documentos_rechazados}
                            color='#F64E60'
                            bg='#FFF5F8'
                            subtitle='Observados'
                        />
                    </div>

                    {/* Distribución por estado */}
                    {Object.keys(porEstado).length > 0 && (
                        <div className='card card-custom mb-5'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <h3 className='card-label'>
                                        <i className='fas fa-chart-pie mr-2 text-primary' />
                                        Distribución por Estado
                                    </h3>
                                </div>
                            </div>
                            <div className='card-body p-5'>
                                <div className='row'>
                                    {Object.entries(porEstado).map(([estado, cantidad]) => {
                                        const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-circle' }
                                        const pct = estadisticas.total_postulaciones > 0
                                            ? Math.round((cantidad / estadisticas.total_postulaciones) * 100)
                                            : 0
                                        return (
                                            <div key={estado} className='col-md-4 col-sm-6 mb-4'>
                                                <div className='rounded p-4' style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                                                    <div className='d-flex align-items-center justify-content-between mb-2'>
                                                        <div className='d-flex align-items-center'>
                                                            <i className={`fas ${cfg.icon} mr-2`} style={{ color: cfg.color }} />
                                                            <span className='font-weight-bold' style={{ color: cfg.color, fontSize: 13 }}>{cfg.label}</span>
                                                        </div>
                                                        <span className='font-weight-boldest' style={{ color: cfg.color, fontSize: 20 }}>{cantidad}</span>
                                                    </div>
                                                    <div className='progress' style={{ height: 6, borderRadius: 3 }}>
                                                        <div
                                                            className='progress-bar'
                                                            style={{ width: `${pct}%`, background: cfg.color, borderRadius: 3 }}
                                                        />
                                                    </div>
                                                    <div className='text-right mt-1' style={{ fontSize: 11, color: cfg.color }}>{pct}%</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── TABLA DE POSTULANTES ── */}
            <div className='card card-custom'>
                <div className='card-header'>
                    <div className='card-title'>
                        <h3 className='card-label'>
                            <i className='fas fa-list mr-2 text-primary' />
                            Postulantes
                            <span className='text-muted font-size-sm font-weight-normal ml-2'>
                                ({postulacionesFiltradas.length} de {totalPost})
                            </span>
                        </h3>
                    </div>
                    {/* Filtros */}
                    <div className='card-toolbar d-flex align-items-center'>
                        {/* Buscador */}
                        <div className='input-group input-group-sm mr-3' style={{ width: 220 }}>
                            <div className='input-group-prepend'>
                                <span className='input-group-text bg-light border-0'>
                                    <i className='fas fa-search text-muted' style={{ fontSize: 12 }} />
                                </span>
                            </div>
                            <input
                                type='text'
                                className='form-control form-control-solid border-0'
                                placeholder='Buscar código, plaza...'
                                value={busqueda}
                                onChange={e => { setBusqueda(e.target.value); setPaginaActual(1) }}
                                style={{ fontSize: 13 }}
                            />
                        </div>
                        {/* Filtro estado */}
                        <select
                            className='form-control form-control-sm form-control-solid border-0'
                            value={filtroEstado}
                            onChange={e => { setFiltroEstado(e.target.value); setPaginaActual(1) }}
                            style={{ width: 160, fontSize: 13 }}
                        >
                            {estadosUnicos.map(e => (
                                <option key={e} value={e}>
                                    {e === 'TODOS' ? 'Todos los estados' : (ESTADO_CONFIG[e]?.label || e)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className='card-body p-0'>
                    {loadingTabla ? (
                        <div className='text-center py-15'>
                            <span className='spinner-border text-primary' />
                            <div className='text-muted mt-3 font-size-sm'>Cargando postulantes...</div>
                        </div>
                    ) : postulacionesFiltradas.length === 0 ? (
                        <div className='text-center py-15'>
                            <i className='fas fa-inbox fa-3x text-muted mb-4' />
                            <div className='text-muted font-size-lg'>No hay postulantes para mostrar</div>
                            <div className='text-muted font-size-sm mt-2'>Prueba cambiando los filtros</div>
                        </div>
                    ) : (
                        <>
                            <div className='table-responsive'>
                                <table className='table table-head-custom table-vertical-center table-hover m-0'>
                                    <thead>
                                        <tr style={{ background: '#F3F6F9' }}>
                                            <th className='pl-6' style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>#</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>CÓDIGO</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>PLAZA</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>FECHA POSTULACIÓN</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>DOCUMENTOS</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>ESTADO</th>
                                            <th style={{ fontSize: 12, color: '#B5B5C3', fontWeight: 600 }}>PLAZA SEL.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {postsPaginadas.map((p, idx) => (
                                            <tr key={p.id} style={{ borderLeft: `3px solid ${p.color_folder_hex || '#E4E6EF'}` }}>
                                                <td className='pl-6'>
                                                    <span className='text-muted font-size-sm'>
                                                        {(paginaActual - 1) * ITEMS_POR_PAGINA + idx + 1}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className='font-weight-bold text-dark font-size-sm'>{p.codigo || `POST-${String(p.id).padStart(5, '0')}`}</span>
                                                    <div className='text-muted font-size-xs'>ID Docente: {p.docente_id}</div>
                                                </td>
                                                <td>
                                                    <div className='font-weight-bold text-dark font-size-sm'>{p.especialidad_nombre || '—'}</div>
                                                    <div className='text-muted font-size-xs'>{p.modalidad_nombre} {p.nivel_nombre ? `· ${p.nivel_nombre}` : ''}</div>
                                                </td>
                                                <td>
                                                    <span className='text-dark font-size-sm'>
                                                        {p.fecha_postulacion
                                                            ? new Date(p.fecha_postulacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                                                            : <span className='text-muted'>Sin enviar</span>
                                                        }
                                                    </span>
                                                </td>
                                                <td>
                                                    {p.documentos_obligatorios_completos ? (
                                                        <span className='label label-inline label-light-success font-weight-bold' style={{ fontSize: 11 }}>
                                                            <i className='fas fa-check mr-1' style={{ fontSize: 10 }} /> Completos
                                                        </span>
                                                    ) : (
                                                        <span className='label label-inline label-light-warning font-weight-bold' style={{ fontSize: 11 }}>
                                                            <i className='fas fa-exclamation mr-1' style={{ fontSize: 10 }} /> Pendientes
                                                        </span>
                                                    )}
                                                </td>
                                                <td><BadgeEstado estado={p.estado} /></td>
                                                <td>
                                                    {p.plaza_seleccionada ? (
                                                        <i className='fas fa-check-circle text-success' title='Plaza seleccionada' />
                                                    ) : (
                                                        <i className='fas fa-times-circle text-muted' title='Sin plaza' />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {totalPaginas > 1 && (
                                <div className='d-flex align-items-center justify-content-between px-6 py-4 border-top'>
                                    <span className='text-muted font-size-sm'>
                                        Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}–{Math.min(paginaActual * ITEMS_POR_PAGINA, postulacionesFiltradas.length)} de {postulacionesFiltradas.length}
                                    </span>
                                    <div className='d-flex'>
                                        <button
                                            className='btn btn-sm btn-light mr-2'
                                            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                            disabled={paginaActual === 1}
                                        >
                                            <i className='fas fa-chevron-left' />
                                        </button>
                                        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                            .filter(n => n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 1)
                                            .reduce((acc, n, i, arr) => {
                                                if (i > 0 && n - arr[i - 1] > 1) acc.push('...')
                                                acc.push(n)
                                                return acc
                                            }, [])
                                            .map((n, i) => n === '...' ? (
                                                <span key={`e${i}`} className='btn btn-sm btn-light mr-1 disabled'>...</span>
                                            ) : (
                                                <button
                                                    key={n}
                                                    className={`btn btn-sm mr-1 ${paginaActual === n ? 'btn-primary' : 'btn-light'}`}
                                                    onClick={() => setPaginaActual(n)}
                                                >
                                                    {n}
                                                </button>
                                            ))
                                        }
                                        <button
                                            className='btn btn-sm btn-light'
                                            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                            disabled={paginaActual === totalPaginas}
                                        >
                                            <i className='fas fa-chevron-right' />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ReportesConvocatoriaPage
