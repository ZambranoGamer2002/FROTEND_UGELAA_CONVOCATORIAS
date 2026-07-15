import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { checkIsActive } from '../../../../_helpers'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

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

  nuevaConv: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" opacity="0.3" />
      <path d="M12 9V15M9 12H15" stroke="#335EEA" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  catalogo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M5 4H19C20.1046 4 21 4.89543 21 6V8H3V6C3 4.89543 3.89543 4 5 4Z" fill="#335EEA" />
      <path d="M3 8H21V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V8Z" fill="#335EEA" opacity="0.3" />
      <path d="M8 12H16M8 15H13" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="15" r="3" fill="#335EEA" />
      <path d="M17 15H19M18 14V16" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),

  prelaciones: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" fill="#335EEA" />
      <path d="M8 7H10V9H8V7Z" fill="#335EEA" />
      <path d="M8 11H10V13H8V11Z" fill="#335EEA" />
      <path d="M8 15H10V17H8V15Z" fill="#335EEA" />
      <path d="M12 8H17M12 12H17M12 16H15" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 7L6.7 7.7L8 6.4" stroke="#335EEA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  bilingue: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M2 12C2 7.02944 6.02944 3 11 3H13C17.9706 3 22 7.02944 22 12C22 16.9706 17.9706 21 13 21H11C6.02944 21 2 16.9706 2 12Z" fill="#335EEA" />
      <path d="M7 12H17M14 9L17 12L14 15" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  sancionados: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" fill="#F64E60" />
      <path d="M12 7V13M12 16V17" stroke="#F64E60" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="10" stroke="#F64E60" strokeWidth="1.5" fill="none" />
      <path d="M8 8L16 16M16 8L8 16" stroke="#F64E60" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  postulaciones: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M6 2H14L20 8V22H6V2Z" fill="#335EEA" opacity="0.3" />
      <path d="M14 2V8H20" fill="#335EEA" />
      <path d="M9 13H15M9 16H13" stroke="#335EEA" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),

  formacion: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V20H6C4.89543 20 4 19.1046 4 18V6Z" fill="#335EEA" />
      <path d="M8 8H16M8 11H15M8 14H13" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 20H20" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),

  misPostulaciones: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path opacity="0.3" d="M3 6C3 4.89543 3.89543 4 5 4H9L11 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z" fill="#335EEA" />
      <path d="M9 13H15M9 16H12" stroke="#335EEA" strokeWidth="1.8" strokeLinecap="round" />
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

function MenuSection({ children }) {
  return (
    <li className="menu-section mt-2">
      <h4 className="menu-text">{children}</h4>
      <i className="menu-icon flaticon-more-v2" />
    </li>
  )
}

function MenuItem({ to, icon, label, activePath, badge }) {
  const location = useLocation()

  const isActive = checkIsActive(location, activePath || to)
    ? ' menu-item-active menu-item-open menu-item-not-hightlighted'
    : ''

  return (
    <li className={`menu-item${isActive}`} aria-haspopup="true">
      <NavLink className="menu-link" to={to}>
        <span className="svg-icon menu-icon">{icon}</span>
        <span className="menu-text">{label}</span>

        {badge && (
          <span className="menu-label" style={{ marginLeft: 'auto' }}>
            {badge}
          </span>
        )}
      </NavLink>
    </li>
  )
}

function RoleBadge({ roleNivel, roleNombre }) {
  const config = {
    1: { bg: 'badge-danger', label: roleNombre || 'SuperAdministrador' },
    2: { bg: 'badge-warning', label: roleNombre || 'Administrador' },
    3: { bg: 'badge-info', label: roleNombre || 'Comisión' },
    4: { bg: 'badge-primary', label: roleNombre || 'Recepción' },
    5: { bg: 'badge-success', label: roleNombre || 'Docente' },
  }

  const current = config[roleNivel] || config[5]

  return (
    <li className="menu-section mt-4">
      <div className="px-5 pb-2 w-100">
        <span
          className={`badge badge-pill w-100 py-2 ${current.bg}`}
          style={{ fontSize: '11px', letterSpacing: '0.5px' }}
        >
          {current.label}
        </span>
      </div>
    </li>
  )
}

export function AsideMenuList({ layoutProps }) {
  const auth = useSelector((state) => state.auth)

  const [modulos, setModulos] = useState([])
  const [roleInfo, setRoleInfo] = useState(null)
  const [cargando, setCargando] = useState(true)

  const getToken = () => {
    if (!auth) return null

    return (
      auth.authToken ||
      auth.accessToken ||
      auth.token ||
      auth.access_token ||
      null
    )
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
        <li className="menu-item">
          <div className="menu-link d-flex align-items-center py-4 px-6">
            <span className="spinner-border spinner-border-sm text-primary mr-3" />
            <span className="menu-text text-muted" style={{ fontSize: 13 }}>
              Cargando menú...
            </span>
          </div>
        </li>
      </ul>
    )
  }

  const roleNivel = Number(roleInfo?.nivel || 5)
  const roleNombre = roleInfo?.nombre || ''

  const esSuperAdmin = roleNivel === 1
  const esAdmin = roleNivel === 2
  const esComision = roleNivel === 3
  const esRecepcion = roleNivel === 4
  const esDocente = roleNivel === 5

  const esNivelGestion = esSuperAdmin || esAdmin || esComision

  const puedeGestionarUsuarios = tieneAcceso('usuarios') && (esSuperAdmin || esAdmin)
  const puedeVerConvocatoriasGestion = tieneAcceso('convocatorias') && esNivelGestion
  const puedeCrearConvocatoria = tieneAcceso('convocatorias') && (esSuperAdmin || esAdmin)
  const puedeVerCatalogo = esSuperAdmin || esAdmin
  const puedeGestionarPrelaciones = esSuperAdmin || esAdmin
  const puedeGestionarBilingue = esSuperAdmin || esAdmin
  const puedeGestionarSanciones = esSuperAdmin || esAdmin
  const puedeVerReportesConvocatoria = tieneAcceso('convocatorias') && esNivelGestion
  const puedeVerReportes = tieneAcceso('reportes') && esNivelGestion

  const mostrarGestion =
    puedeGestionarUsuarios ||
    puedeVerConvocatoriasGestion ||
    puedeCrearConvocatoria ||
    puedeVerCatalogo ||
    puedeGestionarPrelaciones ||
    puedeGestionarBilingue ||
    puedeGestionarSanciones ||
    esDocente

  const mostrarAnalisis =
    puedeVerReportesConvocatoria ||
    puedeVerReportes

  const mostrarSistema =
    tieneAcceso('configuracion') ||
    tieneAcceso('seguridad')

  return (
    <ul className={`menu-nav ${layoutProps.ulClasses}`}>
      <MenuSection>Principal</MenuSection>

      <MenuItem
        to="/dashboard"
        icon={ICONOS.dashboard}
        label="Dashboard"
      />

      {mostrarGestion && (
        <MenuSection>Gestión</MenuSection>
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeGestionarUsuarios && (
        <MenuItem
          to="/usuarios"
          icon={ICONOS.usuarios}
          label="Gestión de Usuarios"
        />
      )}

      {/* Nivel 1, 2 y 3: SuperAdministrador / Administrador / Comisión */}
      {puedeVerConvocatoriasGestion && (
        <MenuItem
          to="/convocatorias"
          icon={ICONOS.convocatorias}
          label="Convocatorias"
        />
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeCrearConvocatoria && (
        <MenuItem
          to="/crear-convocatoria"
          icon={ICONOS.nuevaConv}
          label="Nueva Convocatoria"
          badge={
            <span
              className="label label-inline label-sm font-weight-bold"
              style={{ background: '#E8FFF3', color: '#1BC5BD', fontSize: 10 }}
            >
              {esSuperAdmin ? 'SUPER' : 'ADMIN'}
            </span>
          }
        />
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeVerCatalogo && (
        <MenuItem
          to="/admin/catalogo"
          icon={ICONOS.catalogo}
          label="Panel de Catálogo"
          badge={
            <span
              className="label label-inline label-sm font-weight-bold"
              style={{
                background: esSuperAdmin ? '#FFF5F8' : '#E8FFF3',
                color: esSuperAdmin ? '#F64E60' : '#1BC5BD',
                fontSize: 10,
              }}
            >
              {esSuperAdmin ? 'SUPER' : 'ADMIN'}
            </span>
          }
        />
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeGestionarPrelaciones && (
        <MenuItem
          to="/admin/prelaciones"
          activePath="/admin/prelaciones"
          icon={ICONOS.prelaciones}
          label="Prelaciones Académicas"
          badge={
            <span
              className="label label-inline label-sm font-weight-bold"
              style={{ background: '#EEF6FF', color: '#3699FF', fontSize: 10 }}
            >
              ANEXO 6
            </span>
          }
        />
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeGestionarBilingue && (
        <MenuItem
          to="/admin/bilingue/notas"
          icon={ICONOS.bilingue}
          label="Notas Bilingüe"
        />
      )}

      {/* Nivel 1 y 2: SuperAdministrador / Administrador */}
      {puedeGestionarSanciones && (
        <MenuItem
          to="/admin/sanciones"
          icon={ICONOS.sancionados}
          label="Docentes Sancionados"
        />
      )}

      {/* Nivel 4: Recepción */}
      {esRecepcion && tieneAcceso('convocatorias') && (
        <MenuItem
          to="/convocatorias"
          icon={ICONOS.convocatorias}
          label="Convocatorias"
        />
      )}

      {/* Nivel 5: Docente */}
      {esDocente && tieneAcceso('convocatorias') && (
        <MenuItem
          to="/convocatorias/publicas"
          icon={ICONOS.convocatorias}
          label="Convocatorias Disponibles"
        />
      )}

      {esDocente && (
        <MenuItem
          to="/seleccion-plaza"
          icon={ICONOS.postulaciones}
          label="Selección de Plaza"
        />
      )}

      {esDocente && (
        <MenuItem
          to="/requisitos-formacion"
          activePath="/requisitos-formacion"
          icon={ICONOS.formacion}
          label="Requisitos de Formación Académica"
        />
      )}

      {esDocente && (
        <MenuItem
          to="/mis-postulaciones"
          icon={ICONOS.misPostulaciones}
          label="Mis Postulaciones"
        />
      )}

      {mostrarAnalisis && (
        <MenuSection>Análisis</MenuSection>
      )}

      {/* Nivel 1, 2 y 3: SuperAdministrador / Administrador / Comisión */}
      {puedeVerReportesConvocatoria && (
        <MenuItem
          to="/reportes/convocatorias"
          icon={ICONOS.reportesConv}
          label="Reportes Convocatorias"
        />
      )}

      {/* Nivel 1, 2 y 3: SuperAdministrador / Administrador / Comisión */}
      {puedeVerReportes && (
        <MenuItem
          to="/reportes"
          icon={ICONOS.reportes}
          label="Reportes"
        />
      )}

      {mostrarSistema && (
        <MenuSection>Sistema</MenuSection>
      )}

      {tieneAcceso('configuracion') && (
        <MenuItem
          to="/configuracion"
          icon={ICONOS.configuracion}
          label="Configuración"
        />
      )}

      {tieneAcceso('seguridad') && (
        <MenuItem
          to="/seguridad"
          icon={ICONOS.seguridad}
          label="Seguridad"
        />
      )}

      <RoleBadge roleNivel={roleNivel} roleNombre={roleNombre} />
    </ul>
  )
}
