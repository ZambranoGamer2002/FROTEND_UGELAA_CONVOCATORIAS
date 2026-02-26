/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import DocenteDashboard from './DocenteDashboard'

const API_BASE = 'http://localhost:8000/api/v1'

const COLOR_ROL = {
  1: { bg: '#FFF5F8', border: '#F64E60', text: '#F64E60' },
  2: { bg: '#FFF8DD', border: '#FFA800', text: '#FFA800' },
  3: { bg: '#EEF6FF', border: '#3699FF', text: '#3699FF' },
  4: { bg: '#E8FFF3', border: '#1BC5BD', text: '#1BC5BD' },
  5: { bg: '#E1F0FF', border: '#3699FF', text: '#3699FF' },
}

function StatCard({ titulo, valor, subtitulo, color, icono }) {
  return (
    <div className='col-lg-3 col-md-6 mb-5'>
      <div className='card card-custom' style={{ borderTop: `3px solid ${color}` }}>
        <div className='card-body d-flex align-items-center py-5 px-6'>
          <div
            className='d-flex align-items-center justify-content-center rounded mr-4'
            style={{ width: 48, height: 48, background: color + '20', fontSize: 22, flexShrink: 0 }}
          >
            {icono}
          </div>
          <div>
            <div className='font-size-h3 font-weight-bolder text-dark'>{valor}</div>
            <div className='font-weight-bold text-dark mb-1' style={{ fontSize: 13 }}>{titulo}</div>
            {subtitulo && <div className='text-muted' style={{ fontSize: 11 }}>{subtitulo}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const auth = useSelector((s) => s.auth)
  const token = auth?.authToken || ''
  const user = auth?.user || {}

  const [stats, setStats] = useState(null)
  const [cargando, setCargando] = useState(true)

  const headers = { Authorization: `Bearer ${token}` }
  const roleNivel = user?.role_nivel || 5

  // ========== CARGAR ESTADÍSTICAS (SOLO PARA ADMINS) ==========
  useEffect(() => {
    // Si es docente, no cargar stats
    if (roleNivel === 5 || !token) {
      setCargando(false)
      return
    }

    const cargar = async () => {
      try {
        const resp = await fetch(`${API_BASE}/dashboard/stats`, { headers })
        if (resp.ok) {
          const data = await resp.json()
          setStats(data)
        }
      } catch (err) {
        console.warn('Error cargando stats:', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roleNivel])

  // ========== SI ES DOCENTE, MOSTRAR DASHBOARD DE DOCENTE ==========
  if (roleNivel === 5) {
    return <DocenteDashboard />
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const nombreUsuario = user?.fullname || user?.firstname || 'Usuario'

  // ========== DASHBOARD PARA ADMINISTRADORES ==========
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
                Panel de Administración — UGELAA
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

      {/* Stats principales */}
      {cargando ? (
        <div className='d-flex justify-content-center py-10'>
          <span className='spinner-border text-primary mr-3' />
          <span className='text-muted align-self-center'>Cargando estadísticas...</span>
        </div>
      ) : stats ? (
        <>
          <div className='row'>
            <StatCard
              titulo='Total Usuarios'
              valor={stats.usuarios.total}
              subtitulo={`${stats.usuarios.activos} activos`}
              color='#3699FF'
              icono={<i className='fas fa-users' style={{ fontSize: 24, color: '#3699FF' }} />}
            />
            <StatCard
              titulo='Usuarios Activos'
              valor={stats.usuarios.activos}
              subtitulo={`${stats.usuarios.inactivos} inactivos`}
              color='#1BC5BD'
              icono={<i className='fas fa-user-check' style={{ fontSize: 24, color: '#1BC5BD' }} />}
            />
            <StatCard
              titulo='Convocatorias'
              valor={stats.convocatorias.total}
              subtitulo={`${stats.convocatorias.activas} activas`}
              color='#FFA800'
              icono={<i className='fas fa-bullhorn' style={{ fontSize: 24, color: '#FFA800' }} />}
            />
            <StatCard
              titulo='Postulaciones'
              valor={stats.postulaciones.total}
              subtitulo={`${stats.postulaciones.pendientes} pendientes`}
              color='#F64E60'
              icono={<i className='fas fa-file-alt' style={{ fontSize: 24, color: '#F64E60' }} />}
            />
          </div>

          {/* Usuarios por rol */}
          <div className='row'>
            <div className='col-lg-5 mb-5'>
              <div className='card card-custom h-100'>
                <div className='card-header border-0 pt-5'>
                  <h3 className='card-title font-weight-bolder text-dark'>Usuarios por Rol</h3>
                </div>
                <div className='card-body pt-2'>
                  {stats.por_rol.map((r) => {
                    const cfg = COLOR_ROL[r.nivel] || COLOR_ROL[5]
                    const pct = stats.usuarios.total > 0
                      ? Math.round((r.total / stats.usuarios.total) * 100)
                      : 0

                    const iconoRol = {
                      1: 'fa-crown',
                      2: 'fa-user-shield',
                      3: 'fa-clipboard-check',
                      4: 'fa-inbox',
                      5: 'fa-user-graduate'
                    }[r.nivel] || 'fa-user'

                    return (
                      <div key={r.nombre} className='mb-5'>
                        <div className='d-flex justify-content-between mb-2'>
                          <span className='font-weight-bold' style={{ color: cfg.text }}>
                            <i className={`fas ${iconoRol} mr-2`} />
                            {r.nombre}
                          </span>
                          <span className='font-weight-bolder text-dark'>{r.total}</span>
                        </div>
                        <div className='progress' style={{ height: 8, borderRadius: 4 }}>
                          <div
                            className='progress-bar'
                            style={{
                              width: `${pct}%`,
                              background: cfg.border,
                              borderRadius: 4,
                              transition: 'width 0.8s ease'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className='col-lg-7 mb-5'>
              <div className='card card-custom h-100'>
                <div className='card-header border-0 pt-5'>
                  <h3 className='card-title font-weight-bolder text-dark'>Accesos Rápidos</h3>
                </div>
                <div className='card-body pt-2'>
                  <div className='row'>
                    {[
                      { to: '/usuarios', icono: 'fa-users', titulo: 'Gestión de Usuarios', color: '#3699FF' },
                      { to: '/convocatorias', icono: 'fa-bullhorn', titulo: 'Convocatorias', color: '#FFA800' },
                      { to: '/postulaciones', icono: 'fa-file-alt', titulo: 'Postulaciones', color: '#1BC5BD' },
                      { to: '/reportes', icono: 'fa-chart-bar', titulo: 'Reportes', color: '#F64E60' },
                      { to: '/configuracion', icono: 'fa-cog', titulo: 'Configuración', color: '#8950FC' },
                      { to: '/seguridad', icono: 'fa-shield-alt', titulo: 'Seguridad', color: '#1e3a5f' },
                    ].map((item) => (
                      <div key={item.to} className='col-md-4 mb-4'>
                        <Link
                          to={item.to}
                          className='d-flex flex-column align-items-center justify-content-center p-4 rounded text-center text-decoration-none'
                          style={{
                            background: item.color + '12',
                            border: `1px solid ${item.color}30`,
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            height: 100,
                          }}
                        >
                          <i className={`fas ${item.icono}`} style={{ fontSize: 26, color: item.color }} />
                          <div className='font-weight-bold mt-2' style={{ color: item.color, fontSize: 12 }}>
                            {item.titulo}
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className='alert alert-warning'>No se pudieron cargar las estadísticas.</div>
      )}
    </div>
  )
}