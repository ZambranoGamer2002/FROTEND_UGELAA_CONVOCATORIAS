/**
 * ConvocatoriasPage.js
 * Vista de ADMIN / SUPERADMIN para gestión de convocatorias
 * ACTUALIZADO 2026-05-26:
 * - ESTADO_CONV: eliminada clave BORRADOR, agregada EN_ESPERA
 * - TRANSICIONES: BORRADOR → EN_ESPERA
 * - stats: borradores → enEspera (cuenta EN_ESPERA)
 * - filtros: etiqueta y value BORRADOR → EN_ESPERA
 * - AlcanceBadge: props corregidas (provinciaId/provinciaNombre)
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

// ── FIX 1: BORRADOR eliminado, EN_ESPERA agregado ────────────────────────────
const ESTADO_CONV = {
  EN_ESPERA: { label: 'En Espera', color: '#FFA800', bg: '#FFF4DE', icon: 'fa-clock', dot: '#FFA800' },
  PUBLICADA: { label: 'En Curso', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-play-circle', dot: '#1BC5BD' },
  EN_REVISION: { label: 'En Revisión', color: '#3699FF', bg: '#EEF6FF', icon: 'fa-search', dot: '#3699FF' },
  EN_EVALUACION: { label: 'En Evaluación', color: '#8950FC', bg: '#EEE5FF', icon: 'fa-tasks', dot: '#8950FC' },
  RESULTADOS_PRELIMINARES: { label: 'Res. Preliminares', color: '#0BB783', bg: '#E8FFF3', icon: 'fa-clipboard-list', dot: '#0BB783' },
  RESULTADOS_FINALES: { label: 'Res. Finales', color: '#0BB783', bg: '#C9F7F5', icon: 'fa-clipboard-check', dot: '#0BB783' },
  ADJUDICACION: { label: 'Adjudicación', color: '#1BC5BD', bg: '#C9F7F5', icon: 'fa-gavel', dot: '#1BC5BD' },
  FINALIZADA: { label: 'Culminada', color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-flag-checkered', dot: '#B5B5C3' },
  CERRADA: { label: 'Culminada', color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-flag-checkered', dot: '#B5B5C3' },
  ANULADA: { label: 'Anulada', color: '#F64E60', bg: '#FFF5F8', icon: 'fa-ban', dot: '#F64E60' },
}

// ── FIX 2: BORRADOR → EN_ESPERA en transiciones ──────────────────────────────
const TRANSICIONES = {
  EN_ESPERA: ['PUBLICADA', 'ANULADA'],
  PUBLICADA: ['EN_REVISION', 'CERRADA', 'ANULADA'],
  EN_REVISION: ['EN_EVALUACION', 'ANULADA'],
  EN_EVALUACION: ['RESULTADOS_PRELIMINARES'],
  RESULTADOS_PRELIMINARES: ['RESULTADOS_FINALES'],
  RESULTADOS_FINALES: ['ADJUDICACION'],
  ADJUDICACION: ['FINALIZADA'],
  FINALIZADA: [],
  CERRADA: [],
  ANULADA: [],
}

// Descripciones cortas para cada transición en el dropdown
const DESCRIPCION_TRANSICION = {
  PUBLICADA: 'Visible para docentes',
  EN_REVISION: 'Cierra postulaciones',
  EN_EVALUACION: 'Evaluación de expedientes',
  RESULTADOS_PRELIMINARES: 'Publicar resultados previos',
  RESULTADOS_FINALES: 'Publicar resultados definitivos',
  ADJUDICACION: 'Proceso de adjudicación',
  FINALIZADA: 'Proceso completado',
  CERRADA: 'Cerrar sin continuar',
  ANULADA: 'Anular definitivamente',
}

// ── Badge de estado ───────────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONV[estado] || { label: estado, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-circle' }
  return (
    <span
      className="label label-inline font-weight-bold"
      style={{ background: cfg.bg, color: cfg.color, padding: '5px 12px', fontSize: 11, borderRadius: 4 }}
    >
      <i className={`fas ${cfg.icon} mr-1`} style={{ fontSize: 10 }} />
      {cfg.label}
    </span>
  )
}

// ── FIX 3: props corregidas provinciaId / provinciaNombre ─────────────────────
function AlcanceBadge({ provinciaId, provinciaNombre }) {
  if (!provinciaId) {
    return (
      <span
        className="label label-inline font-weight-bold"
        style={{ background: '#EEF6FF', color: '#3699FF', fontSize: 10, padding: '3px 8px' }}
      >
        <i className="fas fa-globe-americas mr-1" style={{ fontSize: 9 }} />
        Nacional
      </span>
    )
  }
  return (
    <span
      className="label label-inline font-weight-bold"
      style={{ background: '#F3F6F9', color: '#7E8299', fontSize: 10, padding: '3px 8px' }}
    >
      <i className="fas fa-map-marker-alt mr-1" style={{ fontSize: 9 }} />
      {provinciaNombre || `Provincia ${provinciaId}`}
    </span>
  )
}

// ── Tarjeta de convocatoria ───────────────────────────────────────────────────
function ConvocatoriaCard({ conv, nivelRol, onCambiarEstado, onVerReportes }) {
  const [expandida, setExpandida] = useState(false)
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const dropdownRef = React.useRef(null)

  const cfg = ESTADO_CONV[conv.estado] || {}
  const transiciones = TRANSICIONES[conv.estado] || []

  const puedeGestionar = nivelRol <= 2

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAbierto(false)
      }
    }
    if (dropdownAbierto) {
      document.addEventListener('mousedown', handleClickFuera)
    }
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [dropdownAbierto])

  return (
    <div
      className="card card-custom mb-4"
      style={{ borderLeft: `4px solid ${cfg.color || '#B5B5C3'}`, transition: 'box-shadow 0.2s' }}
    >
      <div className="card-body p-6">

        {/* ── Header ── */}
        <div className="d-flex align-items-start justify-content-between flex-wrap">
          <div className="flex-grow-1 mr-4">
            <div className="d-flex align-items-center mb-2 flex-wrap" style={{ gap: 8 }}>
              <EstadoBadge estado={conv.estado} />
              <span className="text-muted font-size-xs">
                <i className="fas fa-hashtag mr-1" />{conv.codigo}
              </span>
              <span className="text-muted font-size-xs">
                <i className="fas fa-calendar mr-1" />Año {conv.anio}
              </span>

              {/* ── FIX 3 aplicado: props correctas ── */}
              <AlcanceBadge
                provinciaId={conv.provincia_id}
                provinciaNombre={conv.provincia_nombre}
              />

              {conv.total_postulaciones > 0 && (
                <span
                  className="label label-inline"
                  style={{ background: '#EEF6FF', color: '#3699FF', fontSize: 11, padding: '4px 10px' }}
                >
                  <i className="fas fa-users mr-1" />
                  {conv.total_postulaciones} postulaciones
                </span>
              )}
            </div>
            <h5 className="font-weight-bolder text-dark mb-1">{conv.titulo}</h5>
            {conv.descripcion && (
              <p className="text-muted font-size-sm mb-0" style={{ maxWidth: 600 }}>
                {conv.descripcion}
              </p>
            )}
          </div>

          {/* ── Acciones ── */}
          <div className="d-flex align-items-center mt-3 mt-md-0" style={{ gap: 8 }}>
            {nivelRol <= 2 && conv.total_postulaciones > 0 && (
              <button
                className="btn btn-sm btn-light-primary font-weight-bold"
                onClick={() => onVerReportes(conv)}
                style={{ borderRadius: 6 }}
              >
                <i className="fas fa-chart-bar mr-1" />
                Reportes
              </button>
            )}

            {/* Dropdown 100% React — sin data-toggle */}
            {puedeGestionar && transiciones.length > 0 && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  className="btn btn-sm btn-light-primary font-weight-bold"
                  onClick={() => setDropdownAbierto(v => !v)}
                  style={{ borderRadius: 6 }}
                >
                  <i className="fas fa-exchange-alt mr-1" />
                  Estado
                  <i className={`fas fa-chevron-${dropdownAbierto ? 'up' : 'down'} ml-2`}
                    style={{ fontSize: 10 }} />
                </button>

                {dropdownAbierto && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 6px)',
                      minWidth: 220,
                      background: '#fff',
                      borderRadius: 8,
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                      zIndex: 999,
                      border: '1px solid #EBEDF3',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header del dropdown */}
                    <div
                      style={{
                        padding: '10px 14px',
                        background: '#F3F6F9',
                        borderBottom: '1px solid #EBEDF3',
                        fontSize: 11,
                        color: '#7E8299',
                      }}
                    >
                      <i className="fas fa-info-circle mr-1" />
                      Estado actual:{' '}
                      <strong style={{ color: cfg.color }}>
                        {cfg.label}
                      </strong>
                    </div>

                    {/* Opciones */}
                    {transiciones.map(est => {
                      const c = ESTADO_CONV[est] || {}
                      return (
                        <button
                          key={est}
                          onClick={() => {
                            setDropdownAbierto(false)
                            onCambiarEstado(conv.id, est)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F3F6F9'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span
                            style={{
                              width: 10, height: 10,
                              borderRadius: '50%',
                              background: c.color,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#3F4254' }}>
                              {c.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#B5B5C3' }}>
                              {DESCRIPCION_TRANSICION[est] || ''}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-sm btn-icon btn-light"
              onClick={() => setExpandida(!expandida)}
              style={{ borderRadius: 6 }}
            >
              <i className={`fas fa-chevron-${expandida ? 'up' : 'down'}`} />
            </button>
          </div>
        </div>

        {/* ── Detalle expandido ── */}
        {expandida && (
          <div className="mt-5 pt-5 border-top">
            <div className="row">
              <div className="col-md-3 col-6 mb-3">
                <div className="text-muted font-size-xs mb-1">Inicio postulación</div>
                <div className="font-weight-bold text-dark font-size-sm">
                  {conv.fecha_inicio_postulacion || '—'}
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="text-muted font-size-xs mb-1">Fin postulación</div>
                <div className="font-weight-bold text-dark font-size-sm">
                  {conv.fecha_fin_postulacion || '—'}
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="text-muted font-size-xs mb-1">Res. Preliminares</div>
                <div className="font-weight-bold text-dark font-size-sm">
                  {conv.fecha_publicacion_preliminar || '—'}
                </div>
              </div>
              <div className="col-md-3 col-6 mb-3">
                <div className="text-muted font-size-xs mb-1">Adjudicación</div>
                <div className="font-weight-bold text-dark font-size-sm">
                  {conv.fecha_adjudicacion || '—'}
                </div>
              </div>
              {conv.plazas_disponibles && (
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-muted font-size-xs mb-1">Plazas disponibles</div>
                  <div className="font-weight-bold text-dark font-size-sm">
                    {conv.plazas_disponibles}
                  </div>
                </div>
              )}
              {conv.resolucion_aprobacion && (
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-muted font-size-xs mb-1">Resolución</div>
                  <div className="font-weight-bold text-dark font-size-sm">
                    {conv.resolucion_aprobacion}
                  </div>
                </div>
              )}

              {/* Banner días restantes — aplica también a EN_ESPERA ── */}
              {(conv.estado === 'PUBLICADA' || conv.estado === 'EN_ESPERA') && (() => {
                // Para EN_ESPERA: días hasta que ABRE (fecha_inicio - hoy)
                // Para PUBLICADA: días hasta que CIERRA (fecha_fin - hoy)  
                const hoy = new Date()
                hoy.setHours(0, 0, 0, 0)

                const diasMostrar = conv.estado === 'EN_ESPERA'
                  ? Math.ceil(
                    (new Date(conv.fecha_inicio_postulacion) - hoy) / (1000 * 60 * 60 * 24)
                  )
                  : conv.dias_restantes ?? Math.ceil(
                    (new Date(conv.fecha_fin_postulacion) - hoy) / (1000 * 60 * 60 * 24)
                  )

                return (
                  <div className="col-12 mt-2">
                    <div
                      className="rounded p-3 d-flex align-items-center"
                      style={{
                        background: diasMostrar <= 3 ? '#FFF5F8'
                          : diasMostrar <= 7 ? '#FFF4DE' : '#E8FFF3',
                        borderLeft: `3px solid ${diasMostrar <= 3 ? '#F64E60'
                          : diasMostrar <= 7 ? '#FFA800' : '#1BC5BD'}`
                      }}
                    >
                      <i
                        className="fas fa-clock mr-2"
                        style={{
                          color: diasMostrar <= 3 ? '#F64E60'
                            : diasMostrar <= 7 ? '#FFA800' : '#1BC5BD'
                        }}
                      />
                      <span style={{ fontSize: 13 }}>
                        {conv.estado === 'EN_ESPERA'
                          ? diasMostrar > 0
                            ? `La postulación abrirá en ${diasMostrar} día${diasMostrar !== 1 ? 's' : ''}`
                            : 'La postulación se publicará automáticamente hoy'
                          : diasMostrar > 0
                            ? `Quedan ${diasMostrar} día${diasMostrar !== 1 ? 's' : ''} para el cierre de postulaciones`
                            : 'El plazo de postulación ha vencido — se cerrará automáticamente'
                        }
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const ConvocatoriasPage = () => {
  const history = useHistory()
  const auth = useSelector((s) => s.auth)
  const token = auth?.authToken || auth?.accessToken || localStorage.getItem('token')
  const user = auth?.user || {}
  const nivelRol = user?.role_nivel || user?.nivel || 5

  const [convocatorias, setConvocatorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [toast, setToast] = useState(null)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const mostrarToast = (msg, tipo = 'success') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Cargar convocatorias ──────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = filtroEstado ? `?estado=${filtroEstado}` : ''
      const resp = await fetch(`${API_BASE}/convocatorias${params}`, { headers })
      if (!resp.ok) {
        const d = await resp.json()
        throw new Error(d.detail || 'Error al cargar convocatorias')
      }
      const data = await resp.json()
      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data?.convocatorias)
          ? data.convocatorias
          : []
      setConvocatorias(lista)
    } catch (err) {
      setError(err.message)
      setConvocatorias([])
    } finally {
      setLoading(false)
    }
  }, [token, filtroEstado]) // eslint-disable-line

  useEffect(() => { if (token) cargar() }, [token, filtroEstado]) // eslint-disable-line

  // ── Cambiar estado con confirmación ──────────────────────────────────────
  const handleCambiarEstado = async (convId, nuevoEstado) => {
    const cfg = ESTADO_CONV[nuevoEstado] || {}
    const desc = DESCRIPCION_TRANSICION[nuevoEstado] || ''

    const confirmado = window.confirm(
      `¿Confirmas cambiar el estado a "${cfg.label}"?\n\n${desc}`
    )
    if (!confirmado) return

    try {
      const resp = await fetch(
        `${API_BASE}/convocatorias/${convId}/estado?nuevo_estado=${nuevoEstado}`,
        { method: 'PATCH', headers }
      )
      if (!resp.ok) {
        const d = await resp.json()
        throw new Error(d.detail || 'Error al cambiar estado')
      }
      mostrarToast(`✓ Estado actualizado a "${cfg.label}"`)
      cargar()
    } catch (err) {
      mostrarToast(err.message, 'danger')
    }
  }

  // ── Ver reportes ──────────────────────────────────────────────────────────
  const handleVerReportes = (conv) => {
    history.push({
      pathname: '/reportes/convocatorias',
      state: { convocatoria_id: conv.id, convocatoria_titulo: conv.titulo },
    })
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const lista = Array.isArray(convocatorias) ? convocatorias : []

  const estadosEnCurso = ['PUBLICADA', 'EN_REVISION', 'EN_EVALUACION',
    'RESULTADOS_PRELIMINARES', 'RESULTADOS_FINALES', 'ADJUDICACION']
  const estadosCulminados = ['FINALIZADA', 'CERRADA']

  // ── FIX 4: borradores → enEspera, cuenta EN_ESPERA ───────────────────────
  const stats = {
    total: lista.length,
    enCurso: lista.filter(c => estadosEnCurso.includes(c.estado)).length,
    culminadas: lista.filter(c => estadosCulminados.includes(c.estado)).length,
    enEspera: lista.filter(c => c.estado === 'EN_ESPERA').length,
  }

  // ── FIX 5: filtros — BORRADOR → EN_ESPERA ────────────────────────────────
  const filtrosTodos = [
    { value: '', label: 'Todos', roles: [1, 2, 3, 4, 5] },
    { value: 'EN_ESPERA', label: 'En Espera', roles: [1, 2] },
    { value: 'PUBLICADA', label: 'En Curso', roles: [1, 2, 3, 4, 5] },
    { value: 'EN_REVISION', label: 'En Revisión', roles: [1, 2, 3, 4] },
    { value: 'EN_EVALUACION', label: 'En Evaluación', roles: [1, 2] },
    { value: 'RESULTADOS_PRELIMINARES', label: 'Res. Preliminares', roles: [1, 2] },
    { value: 'RESULTADOS_FINALES', label: 'Res. Finales', roles: [1, 2] },
    { value: 'ADJUDICACION', label: 'Adjudicación', roles: [1, 2] },
    { value: 'CERRADA', label: 'Culminada', roles: [1, 2] },
    { value: 'ANULADA', label: 'Anulada', roles: [1, 2] },
  ]

  // Filtrar según rol del usuario
  const filtros = filtrosTodos.filter(f => f.roles.includes(nivelRol))

  return (
    <div className="container-fluid px-0">

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`alert alert-${toast.tipo === 'success' ? 'success' : 'danger'} d-flex align-items-center`}
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, minWidth: 300, borderRadius: 8 }}
        >
          <i className={`fas fa-${toast.tipo === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2`} />
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="d-flex align-items-center justify-content-between mb-7 flex-wrap" style={{ gap: 12 }}>
        <div>
          <h3 className="font-weight-bolder text-dark mb-1">Convocatorias</h3>
          <span className="text-muted font-size-sm">
            {nivelRol === 1 ? 'Gestión completa — todas las convocatorias'
              : nivelRol === 2 ? 'Gestión de convocatorias de tu provincia'
                : 'Consulta de convocatorias activas'}
          </span>
        </div>

        {nivelRol <= 2 && (
          <button
            className="btn btn-primary font-weight-bold"
            onClick={() => history.push('/crear-convocatoria')}
            style={{ borderRadius: 8 }}
          >
            <i className="fas fa-plus mr-2" />
            Nueva Convocatoria
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="row mb-7">
        {[
          { label: 'Total', value: stats.total, color: '#3699FF', bg: '#EEF6FF', icon: 'fa-list' },
          { label: 'En Curso', value: stats.enCurso, color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-play-circle' },
          { label: 'Culminadas', value: stats.culminadas, color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-flag-checkered' },
          // ── FIX 4: ícono fa-clock, label "En Espera" ──
          { label: 'En Espera', value: stats.enEspera, color: '#FFA800', bg: '#FFF4DE', icon: 'fa-clock' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-md-3 mb-4">
            <div className="card card-custom h-100">
              <div className="card-body d-flex align-items-center p-5">
                <div
                  className="d-flex align-items-center justify-content-center rounded mr-4"
                  style={{ width: 48, height: 48, background: s.bg, flexShrink: 0 }}
                >
                  <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
                </div>
                <div>
                  <div className="font-weight-bolder text-dark" style={{ fontSize: 22 }}>{s.value}</div>
                  <div className="text-muted font-size-xs">{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card card-custom mb-5">
        <div className="card-body py-4 px-6">
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 10 }}>
            <span className="text-muted font-size-sm font-weight-bold mr-2">Filtrar:</span>
            {filtros.map(f => (
              <button
                key={f.value}
                className={`btn btn-sm ${filtroEstado === f.value ? 'btn-primary' : 'btn-light'} font-weight-bold`}
                onClick={() => setFiltroEstado(f.value)}
                style={{ borderRadius: 20 }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div className="text-muted font-size-sm">Cargando convocatorias...</div>
        </div>
      ) : error ? (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fas fa-exclamation-circle mr-2" />
          {error}
          <button className="btn btn-sm btn-light ml-auto" onClick={cargar}>Reintentar</button>
        </div>
      ) : lista.length === 0 ? (
        <div className="card card-custom">
          <div className="card-body text-center py-12">
            <i className="fas fa-inbox text-muted mb-3" style={{ fontSize: 40 }} />
            <div className="text-muted">
              No hay convocatorias{filtroEstado
                ? ` con estado "${ESTADO_CONV[filtroEstado]?.label}"`
                : ' registradas'}
            </div>
            {nivelRol <= 2 && !filtroEstado && (
              <button
                className="btn btn-primary mt-4 font-weight-bold"
                onClick={() => history.push('/crear-convocatoria')}
              >
                <i className="fas fa-plus mr-2" />
                Crear primera convocatoria
              </button>
            )}
          </div>
        </div>
      ) : (
        lista.map(conv => (
          <ConvocatoriaCard
            key={conv.id}
            conv={conv}
            nivelRol={nivelRol}
            onCambiarEstado={handleCambiarEstado}
            onVerReportes={handleVerReportes}
          />
        ))
      )}

    </div>
  )
}

export default ConvocatoriasPage
