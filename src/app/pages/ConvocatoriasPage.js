/**
 * ConvocatoriasPage.js
 * Vista de ADMIN / SUPERADMIN para gestión de convocatorias
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const ESTADO_CONV = {
  BORRADOR: { label: 'Borrador', color: '#FFA800', bg: '#FFF4DE', icon: 'fa-edit', dot: '#FFA800' },
  PUBLICADA: { label: 'En Curso', color: '#1BC5BD', bg: '#E8FFF3', icon: 'fa-play-circle', dot: '#1BC5BD' },
  EN_PROCESO: { label: 'En Proceso', color: '#3699FF', bg: '#EEF6FF', icon: 'fa-cogs', dot: '#3699FF' },
  CERRADA: { label: 'Culminada', color: '#B5B5C3', bg: '#F3F6F9', icon: 'fa-flag-checkered', dot: '#B5B5C3' },
  ANULADA: { label: 'Anulada', color: '#F64E60', bg: '#FFF5F8', icon: 'fa-ban', dot: '#F64E60' },
}

const TRANSICIONES = {
  BORRADOR: ['PUBLICADA', 'ANULADA'],
  PUBLICADA: ['CERRADA', 'ANULADA'],
  CERRADA: [],
  ANULADA: [],
}

// ── Badge de estado ───────────────────────────────────────────────────────
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

// ── Tarjeta de convocatoria ───────────────────────────────────────────────
function ConvocatoriaCard({ conv, nivelRol, onCambiarEstado, onVerReportes }) {
  const [expandida, setExpandida] = useState(false)
  const cfg = ESTADO_CONV[conv.estado] || {}
  const transiciones = TRANSICIONES[conv.estado] || []
  const puedeGestionar = nivelRol === 1

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
                <i className="fas fa-calendar mr-1" />Año {conv.año}
              </span>
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
            {puedeGestionar && transiciones.length > 0 && (
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-light font-weight-bold dropdown-toggle"
                  data-toggle="dropdown"
                  style={{ borderRadius: 6 }}
                >
                  <i className="fas fa-exchange-alt mr-1" />
                  Estado
                </button>
                <div className="dropdown-menu dropdown-menu-right shadow">
                  <div className="dropdown-header text-muted font-size-xs">Cambiar a:</div>
                  {transiciones.map(est => {
                    const c = ESTADO_CONV[est] || {}
                    return (
                      <button
                        key={est}
                        className="dropdown-item"
                        onClick={() => onCambiarEstado(conv.id, est)}
                      >
                        <i className={`fas ${c.icon} mr-2`} style={{ color: c.color }} />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
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
                <div className="text-muted font-size-xs mb-1">Resultados</div>
                <div className="font-weight-bold text-dark font-size-sm">
                  {conv.fecha_resultados || '—'}
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
              {conv.estado === 'PUBLICADA' && conv.dias_restantes !== undefined && (
                <div className="col-12 mt-2">
                  <div
                    className="rounded p-3 d-flex align-items-center"
                    style={{
                      background: conv.dias_restantes <= 3 ? '#FFF5F8'
                        : conv.dias_restantes <= 7 ? '#FFF4DE'
                          : '#E8FFF3',
                      borderLeft: `3px solid ${conv.dias_restantes <= 3 ? '#F64E60'
                          : conv.dias_restantes <= 7 ? '#FFA800'
                            : '#1BC5BD'}`
                    }}
                  >
                    <i
                      className="fas fa-clock mr-2"
                      style={{
                        color: conv.dias_restantes <= 3 ? '#F64E60'
                          : conv.dias_restantes <= 7 ? '#FFA800'
                            : '#1BC5BD'
                      }}
                    />
                    <span style={{ fontSize: 13 }}>
                      {conv.dias_restantes > 0
                        ? `Quedan ${conv.dias_restantes} días para el cierre de postulaciones`
                        : 'El plazo de postulación ha vencido — se cerrará automáticamente'}
                    </span>
                  </div>
                </div>
              )}
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

  // ── Cargar convocatorias ──────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = filtroEstado ? `?estado=${filtroEstado}` : ''
      const resp = await fetch(`${API_BASE}/convocatorias/${params}`, { headers })
      if (!resp.ok) {
        const d = await resp.json()
        throw new Error(d.detail || 'Error al cargar convocatorias')
      }
      const data = await resp.json()

      // ✅ FIX PRINCIPAL: el backend retorna { total, convocatorias: [...] }
      // Extraer el array correctamente, con fallback seguro
      const lista = Array.isArray(data)
        ? data                          // Si ya es array directo
        : Array.isArray(data?.convocatorias)
          ? data.convocatorias          // Si viene en { convocatorias: [...] }
          : []                          // Fallback vacío

      setConvocatorias(lista)
    } catch (err) {
      setError(err.message)
      setConvocatorias([])              // ✅ Siempre dejar array vacío en error
    } finally {
      setLoading(false)
    }
  }, [token, filtroEstado]) // eslint-disable-line

  useEffect(() => { if (token) cargar() }, [token, filtroEstado]) // eslint-disable-line

  // ── Cambiar estado ────────────────────────────────────────────────────
  const handleCambiarEstado = async (convId, nuevoEstado) => {
    if (!window.confirm(`¿Confirmas cambiar el estado a "${ESTADO_CONV[nuevoEstado]?.label}"?`)) return
    try {
      const resp = await fetch(
        `${API_BASE}/convocatorias/${convId}/estado?nuevo_estado=${nuevoEstado}`,
        { method: 'PATCH', headers }
      )
      if (!resp.ok) {
        const d = await resp.json()
        throw new Error(d.detail || 'Error al cambiar estado')
      }
      mostrarToast(`Estado actualizado a ${ESTADO_CONV[nuevoEstado]?.label}`)
      cargar()
    } catch (err) {
      mostrarToast(err.message, 'danger')
    }
  }

  // ── Ver reportes ──────────────────────────────────────────────────────
  const handleVerReportes = (conv) => {
    history.push({
      pathname: '/reportes/convocatorias',
      state: { convocatoria_id: conv.id, convocatoria_titulo: conv.titulo },
    })
  }

  // ── Stats — siempre sobre array garantizado ───────────────────────────
  const lista = Array.isArray(convocatorias) ? convocatorias : []
  const stats = {
    total: lista.length,
    enCurso: lista.filter(c => c.estado === 'PUBLICADA').length,
    culminadas: lista.filter(c => c.estado === 'CERRADA').length,
    borradores: lista.filter(c => c.estado === 'BORRADOR').length,
  }

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
            {nivelRol === 1 ? 'Gestión completa de convocatorias'
              : nivelRol === 2 ? 'Vista de convocatorias y postulaciones'
                : 'Consulta de convocatorias activas'}
          </span>
        </div>
        {nivelRol === 1 && (
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
          { label: 'Borradores', value: stats.borradores, color: '#FFA800', bg: '#FFF4DE', icon: 'fa-edit' },
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
            {['', 'PUBLICADA', 'CERRADA', 'BORRADOR', 'ANULADA'].map(est => (
              <button
                key={est}
                className={`btn btn-sm ${filtroEstado === est ? 'btn-primary' : 'btn-light'} font-weight-bold`}
                onClick={() => setFiltroEstado(est)}
                style={{ borderRadius: 20 }}
              >
                {est === '' ? 'Todos' : (ESTADO_CONV[est]?.label || est)}
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
            <div className="text-muted">No hay convocatorias registradas</div>
            {nivelRol === 1 && (
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