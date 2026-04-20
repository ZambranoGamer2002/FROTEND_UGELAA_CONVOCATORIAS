/* eslint-disable jsx-a11y/role-supports-aria-props */
/* eslint-disable no-script-url,jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { checkIsActive } from '../../../../_helpers'

const API_BASE = 'http://localhost:8000/api/v1'

const ICONOS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="9" height="9" rx="2" fill="#335EEA" opacity="0.3" />
      <rect x="13" y="2" width="9" height="9" rx="2" fill="#335EEA" />
      <rect x="2" y="13" width="9" height="9" rx="2" fill="#335EEA" />
      <rect x="13" y="13" width="9" height="9" rx="2" fill="#335EEA" opacity="0.3" />
    </svg>
  ),
  usuarios: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" fill="#335EEA" />
      <path d="M4 20C4 16.134 7.58172 13 12 13C16.4183 13 20 16.134 20 20V21H4V20Z" fill="#335EEA" opacity="0.3" />
    </svg>
  ),
  convocatorias: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" opacity="0.3" />
      <path d="M7 9H17M7 12H13" stroke="#335EEA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  postulaciones: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 2H14L20 8V22H6V2Z" fill="#335EEA" opacity="0.3" />
      <path d="M14 2V8H20" fill="#335EEA" />
      <path d="M9 13H15M9 16H13" stroke="#335EEA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  reportes: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="#335EEA" opacity="0.3" />
      <path d="M8 17V13M12 17V9M16 17V11" stroke="#335EEA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  reportesConv: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" opacity="0.3" />
      <path d="M8 15V11M12 15V9M16 15V12" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  nuevaConv: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" opacity="0.3" />
      <path d="M12 9V15M9 12H15" stroke="#335EEA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bilingue: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M2 12C2 7.02944 6.02944 3 11 3H13C17.9706 3 22 7.02944 22 12C22 16.9706 17.9706 21 13 21H11C6.02944 21 2 16.9706 2 12Z" fill="#335EEA" />
      <path d="M7 12H17M14 9L17 12L14 15" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  configuracion: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z" fill="#335EEA" />
      <path opacity="0.3" d="M10.1185 3.5C10.5333 2.5 11.2667 2 12 2C12.7333 2 13.4667 2.5 13.8815 3.5L14.5 5C15 5 16 5.5 16.5 6L18 5.5C19 5.16667 20.1667 5.5 20.7321 6.5C21.2974 7.5 21 8.66667 20 9.23205L18.5 10C18.5 11.3333 18.5 12.6667 18.5 14L20 14.7679C21 15.3333 21.2974 16.5 20.7321 17.5C20.1667 18.5 19 18.8333 18 18.5L16.5 18C16 18.5 15 19 14.5 19L13.8815 20.5C13.4667 21.5 12.7333 22 12 22C11.2667 22 10.5333 21.5 10.1185 20.5L9.5 19C9 19 8 18.5 7.5 18L6 18.5C5 18.8333 3.83333 18.5 3.26795 17.5C2.70256 16.5 3 15.3333 4 14.7679L5.5 14C5.5 12.6667 5.5 11.3333 5.5 10L4 9.23205C3 8.66667 2.70256 7.5 3.26795 6.5C3.83333 5.5 5 5.16667 6 5.5L7.5 6C8 5.5 9 5 9.5 5L10.1185 3.5Z" fill="#335EEA" />
    </svg>
  ),
  seguridad: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M12 2L4 6V12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12V6L12 2Z" fill="#335EEA" />
      <path d="M9 12L11 14L15 10" stroke="#335EEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

export function AsideMenuList({ layoutProps }) {
  const location = useLocation()
  const auth = useSelector((state) => state.auth)

  const [modulos, setModulos] = useState([])
  const [roleInfo, setRoleInfo] = useState(null)
  const [cargando, setCargando] = useState(true)

  const getMenuItemActive = (url, hasSubmenu = false) => {
    return checkIsActive(location, url)
      ? ` ${!hasSubmenu && 'menu-item-active'} menu-item-open menu-item-not-hightlighted`
      : ''
  }

  const getToken = () => {
    if (!auth) return null
    return auth.authToken || auth.accessToken || auth.token || auth.access_token || null
  }

  useEffect(() => {
    const cargarPermisos = async () => {
      setCargando(true)

      let token = getToken()

      if (!token) {
        try {
          const persistAuth = localStorage.getItem('persist:auth')
          if (persistAuth) {
            const parsed = JSON.parse(persistAuth)
            token = parsed.authToken
              ? JSON.parse(parsed.authToken)
              : parsed.accessToken
                ? JSON.parse(parsed.accessToken)
                : null
          }
        } catch (e) {
          console.warn('No se pudo leer token de localStorage')
        }
      }

      if (!token) {
        setCargando(false)
        return
      }

      try {
        const resp = await fetch(`${API_BASE}/roles/mis-permisos`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        setModulos(Array.isArray(data.modulos) ? data.modulos : [])
        setRoleInfo(data.role || null)
      } catch (err) {
        console.warn('Error cargando permisos del menú:', err)
        setModulos([])
      } finally {
        setCargando(false)
      }
    }

    cargarPermisos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  const tieneAcceso = (codigo) =>
    modulos.some((m) => m.codigo === codigo && m.puede_ver)

  if (cargando) {
    return (
      <ul className={`menu-nav ${layoutProps.ulClasses}`}>
        <li className='menu-item'>
          <div className='menu-link d-flex align-items-center py-4 px-6'>
            <span className='spinner-border spinner-border-sm text-primary mr-3' />
            <span className='menu-text text-muted' style={{ fontSize: 13 }}>Cargando menú...</span>
          </div>
        </li>
      </ul>
    )
  }

  // Nivel del rol: 1=SuperAdmin, 2=Admin, 3=Recepción, 4=Aux, 5=Docente
  const roleNivel = roleInfo?.nivel || 5

  // ── Helpers de visibilidad por sección ──────────────────────────────
  const esSuperAdmin = roleNivel === 1
  const esAdmin = roleNivel === 2
  const esRecepcion = roleNivel === 3
  const esDocente = roleNivel === 5
  const esStaff = roleNivel <= 3   // SuperAdmin + Admin + Recepción

  return (
    <>
      <ul className={`menu-nav ${layoutProps.ulClasses}`}>

        {/* ════════════════════════════════════════
            SECCIÓN: PRINCIPAL
        ════════════════════════════════════════ */}
        <li className='menu-section mt-2'>
          <h4 className='menu-text'>Principal</h4>
          <i className='menu-icon flaticon-more-v2'></i>
        </li>

        {/* Dashboard — siempre visible */}
        <li
          className={`menu-item ${getMenuItemActive('/dashboard', false)}`}
          aria-haspopup='true'
        >
          <NavLink className='menu-link' to='/dashboard'>
            <span className='svg-icon menu-icon'>{ICONOS.dashboard}</span>
            <span className='menu-text'>Dashboard</span>
          </NavLink>
        </li>

        {/* ════════════════════════════════════════
            SECCIÓN: GESTIÓN
            Visible si tiene acceso a usuarios,
            convocatorias o postulaciones
        ════════════════════════════════════════ */}
        {(tieneAcceso('usuarios') || tieneAcceso('convocatorias') || tieneAcceso('postulaciones')) && (
          <li className='menu-section mt-2'>
            <h4 className='menu-text'>Gestión</h4>
            <i className='menu-icon flaticon-more-v2'></i>
          </li>
        )}

        {/* ── Gestión de Usuarios — solo niveles 1 y 2 ── */}
        {tieneAcceso('usuarios') && (esSuperAdmin || esAdmin) && (
          <li
            className={`menu-item ${getMenuItemActive('/usuarios', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/usuarios'>
              <span className='svg-icon menu-icon'>{ICONOS.usuarios}</span>
              <span className='menu-text'>Gestión de Usuarios</span>
            </NavLink>
          </li>
        )}

        {/* ── Convocatorias (Admin/SuperAdmin) — vista de gestión ── */}
        {tieneAcceso('convocatorias') && esStaff && (
          <li
            className={`menu-item ${getMenuItemActive('/convocatorias', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/convocatorias'>
              <span className='svg-icon menu-icon'>{ICONOS.convocatorias}</span>
              <span className='menu-text'>Convocatorias</span>
            </NavLink>
          </li>
        )}

        {/* ── Nueva Convocatoria — EXCLUSIVO SuperAdmin (nivel 1) ── */}
        {esSuperAdmin && tieneAcceso('convocatorias') && (
          <li
            className={`menu-item ${getMenuItemActive('/crear-convocatoria', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/crear-convocatoria'>
              <span className='svg-icon menu-icon'>{ICONOS.nuevaConv}</span>
              <span className='menu-text'>Nueva Convocatoria</span>
              <span
                className='menu-label'
                style={{ marginLeft: 'auto' }}
              >
                <span
                  className='label label-inline label-sm font-weight-bold'
                  style={{ background: '#E8FFF3', color: '#1BC5BD', fontSize: 10 }}
                >
                  SUPER
                </span>
              </span>
            </NavLink>
          </li>
        )}

        {/* ── Convocatorias Disponibles — SOLO Docente (nivel 5) ── */}
        {tieneAcceso('convocatorias') && esDocente && (
          <li
            className={`menu-item ${getMenuItemActive('/convocatorias/publicas', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/convocatorias/publicas'>
              <span className='svg-icon menu-icon'>{ICONOS.convocatorias}</span>
              <span className='menu-text'>Convocatorias Disponibles</span>
            </NavLink>
          </li>
        )}

        {/* ── Notas Bilingüe — solo Admin y SuperAdmin ── */}
        {(esSuperAdmin || esAdmin) && (
          <li
            className={`menu-item ${getMenuItemActive('/admin/bilingue/notas', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/admin/bilingue/notas'>
              <span className='svg-icon menu-icon'>{ICONOS.bilingue}</span>
              <span className='menu-text'>Notas Bilingüe</span>
            </NavLink>
          </li>
        )}

        {/* ── Selección de Plaza — solo Docente (nivel 5) ── */}
        {esDocente && (
          <li
            className={`menu-item ${getMenuItemActive('/seleccion-plaza', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/seleccion-plaza'>
              <span className='svg-icon menu-icon'>{ICONOS.postulaciones}</span>
              <span className='menu-text'>Selección de Plaza</span>
            </NavLink>
          </li>
        )}

        {/* ── Mis Postulaciones — SOLO Docente (nivel 5) ── */}
        {esDocente && (
          <li
            className={`menu-item ${getMenuItemActive('/mis-postulaciones', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/mis-postulaciones'>
              <span className='svg-icon menu-icon'>
                {/* Ícono carpeta/historial */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path opacity="0.3" d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" />
                  <path d="M9 13H15M9 16H12" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <span className='menu-text'>Mis Postulaciones</span>
            </NavLink>
          </li>
        )}

        {/* ════════════════════════════════════════
            SECCIÓN: ANÁLISIS
            Visible para niveles 1, 2 y 3
        ════════════════════════════════════════ */}
        {esStaff && (tieneAcceso('reportes') || tieneAcceso('convocatorias')) && (
          <li className='menu-section mt-2'>
            <h4 className='menu-text'>Análisis</h4>
            <i className='menu-icon flaticon-more-v2'></i>
          </li>
        )}

        {/* ── Reportes de Convocatorias — niveles 1, 2 y 3 ── */}
        {esStaff && tieneAcceso('convocatorias') && (
          <li
            className={`menu-item ${getMenuItemActive('/reportes/convocatorias', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/reportes/convocatorias'>
              <span className='svg-icon menu-icon'>{ICONOS.reportesConv}</span>
              <span className='menu-text'>Reportes Convocatorias</span>
            </NavLink>
          </li>
        )}

        {/* ── Reportes generales ── */}
        {tieneAcceso('reportes') && esStaff && (
          <li
            className={`menu-item ${getMenuItemActive('/reportes', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/reportes'>
              <span className='svg-icon menu-icon'>{ICONOS.reportes}</span>
              <span className='menu-text'>Reportes</span>
            </NavLink>
          </li>
        )}

        {/* ════════════════════════════════════════
            SECCIÓN: SISTEMA
            Visible si tiene acceso a config o seguridad
        ════════════════════════════════════════ */}
        {(tieneAcceso('configuracion') || tieneAcceso('seguridad')) && (
          <li className='menu-section mt-2'>
            <h4 className='menu-text'>Sistema</h4>
            <i className='menu-icon flaticon-more-v2'></i>
          </li>
        )}

        {tieneAcceso('configuracion') && (
          <li
            className={`menu-item ${getMenuItemActive('/configuracion', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/configuracion'>
              <span className='svg-icon menu-icon'>{ICONOS.configuracion}</span>
              <span className='menu-text'>Configuración</span>
            </NavLink>
          </li>
        )}

        {tieneAcceso('seguridad') && (
          <li
            className={`menu-item ${getMenuItemActive('/seguridad', false)}`}
            aria-haspopup='true'
          >
            <NavLink className='menu-link' to='/seguridad'>
              <span className='svg-icon menu-icon'>{ICONOS.seguridad}</span>
              <span className='menu-text'>Seguridad</span>
            </NavLink>
          </li>
        )}

        {/* ════════════════════════════════════════
            BADGE DE ROL — al fondo del menú
        ════════════════════════════════════════ */}
        {roleInfo && (
          <li className='menu-section mt-4'>
            <div className='px-5 pb-2 w-100'>
              <span
                className={`badge badge-pill w-100 py-2 ${roleNivel === 1 ? 'badge-danger' :
                  roleNivel === 2 ? 'badge-warning' :
                    roleNivel === 3 ? 'badge-info' :
                      'badge-success'
                  }`}
                style={{ fontSize: '11px', letterSpacing: '0.5px' }}
              >
                {roleNivel === 1 && '👑 '}
                {roleNivel === 2 && '🔧 '}
                {roleNivel === 3 && '📋 '}
                {roleNivel === 4 && '👤 '}
                {roleNivel === 5 && '🎓 '}
                {roleInfo.nombre}
              </span>
            </div>
          </li>
        )}

      </ul>
    </>
  )
}