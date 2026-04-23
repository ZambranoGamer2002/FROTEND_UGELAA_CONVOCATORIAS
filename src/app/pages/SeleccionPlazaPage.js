/**
 * SeleccionPlazaPage.js — v7
 * FUSIÓN: Diseño antiguo + fixes de postulación activa
 * FIXES:
 *  1. "Sin convocatoria seleccionada" desaparece cuando se detecta postulación activa
 *  2. Modo edición automático si el docente ya tiene postulación activa
 *  3. Precarga correcta de selección desde postulación existente
 */
import React, { useState, useEffect, useRef } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Swal from 'sweetalert2'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
const HEADER_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'

const axiosPublico = axios.create({ baseURL: API_URL })

const useToken = () => {
  const auth = useSelector((s) => s.auth)
  return auth?.authToken || auth?.accessToken || auth?.token || localStorage.getItem('token') || null
}

const NIVEL_LABEL = { BASICO: 'Básico', AVANZADO: 'Avanzado', NATIVO: 'Nativo' }

// ── Badge nivel lengua ────────────────────────────────────────────────────────
const NivelBadge = ({ nivel }) => {
  if (!nivel) return <span className='text-muted'>—</span>
  const colors = {
    BASICO: { bg: '#FFF4DE', text: '#FFA800' },
    AVANZADO: { bg: '#E8FFF3', text: '#1BC5BD' },
    NATIVO: { bg: '#EEE5FF', text: '#8950FC' },
  }
  const c = colors[nivel] || { bg: '#F3F6F9', text: '#7E8299' }
  return (
    <span
      className='label label-inline font-weight-bold'
      style={{ backgroundColor: c.bg, color: c.text, padding: '4px 10px' }}
    >
      {NIVEL_LABEL[nivel] || nivel}
    </span>
  )
}

// ── Step Indicator ────────────────────────────────────────────────────────────
const StepIndicator = ({ pasoActual }) => {
  const pasos = [
    { num: 1, label: 'Modalidad' },
    { num: 2, label: 'Nivel' },
    { num: 3, label: 'Especialidad' },
    { num: 4, label: 'Confirmación' },
  ]
  return (
    <div className='d-flex align-items-center justify-content-center mb-8'>
      {pasos.map((paso, idx) => (
        <React.Fragment key={paso.num}>
          <div className='d-flex flex-column align-items-center'>
            <div
              className='d-flex align-items-center justify-content-center rounded-circle font-weight-bolder'
              style={{
                width: 40, height: 40, fontSize: 14,
                backgroundColor:
                  pasoActual > paso.num ? '#1BC5BD'
                    : pasoActual === paso.num ? '#3699FF'
                      : '#EBEDF3',
                color: pasoActual >= paso.num ? '#fff' : '#B5B5C3',
                transition: 'all 0.3s ease',
              }}
            >
              {pasoActual > paso.num
                ? <i className='fas fa-check' style={{ fontSize: 13 }} />
                : paso.num}
            </div>
            <span
              className='mt-2 font-size-xs font-weight-bold'
              style={{ color: pasoActual === paso.num ? '#3699FF' : '#B5B5C3' }}
            >
              {paso.label}
            </span>
          </div>
          {idx < pasos.length - 1 && (
            <div style={{
              flex: 1, height: 3, marginBottom: 22,
              marginLeft: 6, marginRight: 6,
              backgroundColor: pasoActual > paso.num ? '#1BC5BD' : '#EBEDF3',
              transition: 'all 0.3s ease',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
const SeleccionPlazaPage = () => {
  const history = useHistory()
  const location = useLocation()
  const token = useToken()

  const params = new URLSearchParams(location.search)

  // ── IDs desde URL o state ─────────────────────────────────────────────────
  const convocatoriaIdParam = params.get('convocatoria_id') || location.state?.convocatoria_id || null
  const postulacionIdParam = params.get('postulacion_id') || location.state?.postulacion_id || null
  const modoEditarParam = params.get('modo') === 'editar' || location.state?.modo === 'editar'

  // ── Estado dinámico de IDs ────────────────────────────────────────────────
  const [convocatoriaId, setConvocatoriaId] = useState(convocatoriaIdParam)
  const [postulacionId, setPostulacionId] = useState(postulacionIdParam)
  const [modoEditar, setModoEditar] = useState(modoEditarParam)

  // ── Estado wizard ─────────────────────────────────────────────────────────
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const [catalogo, setCatalogo] = useState([])
  const [caracteristicas, setCaracteristicas] = useState([])

  // ── Bilingüe ──────────────────────────────────────────────────────────────
  const [notaBilingue, setNotaBilingue] = useState(null)
  const [cargandoNota, setCargandoNota] = useState(false)

  // ── Convenio ──────────────────────────────────────────────────────────────
  const [convenioArchivo, setConvenioArchivo] = useState(null)
  const [convenioCodigoAnexo, setConvenioCodigoAnexo] = useState('')
  const fileInputRef = useRef(null)

  // ── Selecciones ───────────────────────────────────────────────────────────
  const [seleccion, setSeleccion] = useState({
    modalidad: null,
    nivel: null,
    especialidad: null,
    caracteristica: null,
  })

  // ════════════════════════════════════════════════════════════════════════════
  // EFECTO 1 — Cargar catálogo al montar
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => { cargarCatalogo() }, []) // eslint-disable-line

  // ════════════════════════════════════════════════════════════════════════════
  // EFECTO 2 — Cargar nota bilingüe cuando cambia la característica
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const esBilingue =
      seleccion.caracteristica?.codigo?.toUpperCase().includes('BILING') ||
      seleccion.caracteristica?.nombre?.toUpperCase().includes('BILING')
    if (esBilingue && token) cargarNotaBilingue()
    else setNotaBilingue(null)
  }, [seleccion.caracteristica]) // eslint-disable-line

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER — Precarga selección desde objeto postulacion
  // ════════════════════════════════════════════════════════════════════════════
  const precargarDesdePostulacion = (postulacionData, cat, caract) => {
    if (!postulacionData) return
    const catalogoActual = cat || catalogo
    const caracteristicasActual = caract || caracteristicas
    if (catalogoActual.length === 0) return

    const modalidadObj = catalogoActual.find(m => m.id === postulacionData.modalidad_id) || null
    const nivelObj = modalidadObj?.niveles?.find(n => n.id === postulacionData.nivel_id) || null
    const espObj = nivelObj?.especialidades?.find(e => e.id === postulacionData.especialidad_id) || null
    const caractObj = postulacionData.caracteristica_id
      ? caracteristicasActual.find(c => c.id === postulacionData.caracteristica_id) || null
      : null

    if (!modalidadObj) return // IDs no coinciden con catálogo

    setSeleccion({
      modalidad: modalidadObj,
      nivel: nivelObj,
      especialidad: espObj,
      caracteristica: caractObj,
    })

    if (espObj) setPaso(4)
    else if (nivelObj) setPaso(3)
    else setPaso(2)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EFECTO 3 — Detectar y precargar postulación activa
  //
  //  CASO A: Botón "Modificar" → modoEditarParam=true + state.postulacion
  //  CASO B: Botón "Postular"  → convocatoriaIdParam en URL
  //  CASO C: Menú lateral      → sin nada (state null, search vacío)
  //
  //  FIX 1: Al encontrar postulación activa se actualiza convocatoriaId
  //  FIX 2: Se activa modoEditar automáticamente si ya tiene plaza seleccionada
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (cargando) return           // esperar a que cargue el catálogo
    if (catalogo.length === 0) return
    if (!token) return

    const inicializar = async () => {
      try {
        // ── CASO A: Viene con postulación en state (botón Modificar) ──
        if (modoEditarParam && location.state?.postulacion) {
          const p = location.state.postulacion
          if (p.convocatoria_id) setConvocatoriaId(String(p.convocatoria_id))
          if (p.id) setPostulacionId(String(p.id))
          setModoEditar(true)
          precargarDesdePostulacion(p)
          return
        }

        // ── CASO B y C: Buscar postulación activa via API ──
        let convId = convocatoriaIdParam  // puede ser null (Caso C)

        // CASO C: Sin convocatoria_id → buscar en mis postulaciones activas
        if (!convId) {
          const resMis = await axios.get(
            `${API_URL}/postulaciones/mis-postulaciones?estado=BORRADOR&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          const items = resMis.data?.items || []
          if (items.length === 0) return  // no tiene postulación → wizard vacío OK
          convId = items[0].convocatoria_id
          if (items[0].id) setPostulacionId(String(items[0].id))
        }

        // CASO B y C: Con convId, obtener la postulación completa
        const res = await axios.get(
          `${API_URL}/postulaciones/convocatoria/${convId}/mi-postulacion`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (res.data && res.data.id) {
          // FIX 1: Actualizar convocatoriaId → desaparece la alerta
          setConvocatoriaId(String(convId))

          // FIX 2: Si ya tiene plaza → activar modo edición automático
          if (res.data.plaza_seleccionada) {
            setModoEditar(true)
            setPostulacionId(String(res.data.id))
            precargarDesdePostulacion(res.data)
          }
        }

      } catch (err) {
        // 404 = no tiene postulación previa → wizard vacío, es válido
        if (err.response?.status !== 404) {
          console.warn('Error buscando postulación activa:', err.message)
        }
      }
    }

    inicializar()
  }, [cargando, catalogo]) // eslint-disable-line

  // ════════════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ════════════════════════════════════════════════════════════════════════════
  const cargarCatalogo = async () => {
    setCargando(true)
    setError(null)
    try {
      const [resCatalogo, resCaract] = await Promise.allSettled([
        axiosPublico.get('/catalogo/plaza/cascada'),
        axiosPublico.get('/catalogo/caracteristicas?solo_docente=true'),
      ])
      if (resCatalogo.status === 'fulfilled') {
        setCatalogo(resCatalogo.value.data)
      } else {
        throw new Error('No se pudo cargar el catálogo')
      }
      if (resCaract.status === 'fulfilled') {
        const sorted = [...resCaract.value.data].sort((a, b) => {
          if (a.nombre?.toUpperCase().includes('ESTATAL')) return -1
          if (b.nombre?.toUpperCase().includes('ESTATAL')) return 1
          return 0
        })
        setCaracteristicas(sorted)
      }
    } catch (err) {
      setError('No se pudo cargar el catálogo. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  const cargarNotaBilingue = async () => {
    if (!token) return
    setCargandoNota(true)
    try {
      const res = await axios.get(`${API_URL}/catalogo/bilingue/docente/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotaBilingue(res.data)
    } catch {
      setNotaBilingue(null)
    } finally {
      setCargandoNota(false)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS CASCADA
  // ════════════════════════════════════════════════════════════════════════════
  const nivelesDisponibles = seleccion.modalidad?.niveles || []
  const especialidadesDisponibles = seleccion.nivel?.especialidades || []

  const seleccionarModalidad = (m) => {
    setSeleccion({ modalidad: m, nivel: null, especialidad: null, caracteristica: null })
    setPaso(2)
  }
  const seleccionarNivel = (n) => {
    setSeleccion((p) => ({ ...p, nivel: n, especialidad: null, caracteristica: null }))
    setPaso(3)
  }
  const seleccionarEspecialidad = (e) => {
    setSeleccion((p) => ({ ...p, especialidad: e, caracteristica: null }))
    setPaso(4)
  }
  const seleccionarCaracteristica = (c) => {
    setSeleccion((p) => ({
      ...p,
      caracteristica: p.caracteristica?.id === c?.id ? null : c,
    }))
    setConvenioArchivo(null)
    setConvenioCodigoAnexo('')
  }

  // ── Tipo característica ───────────────────────────────────────────────────
  const tipoCaracteristica = () => {
    if (!seleccion.caracteristica) return 'ESTATAL'
    const nombre = seleccion.caracteristica.nombre?.toUpperCase() || ''
    if (nombre.includes('BILING')) return 'BILINGUE'
    if (nombre.includes('CONVEN')) return 'CONVENIO'
    return 'OTRO'
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONFIRMAR / GUARDAR POSTULACIÓN
  // ════════════════════════════════════════════════════════════════════════════
  const confirmarPostulacion = async () => {
    if (!convocatoriaId) {
      Swal.fire({
        icon: 'error',
        title: 'Sin convocatoria',
        text: 'No se encontró la convocatoria. Regresa a Convocatorias y vuelve a intentarlo.',
        confirmButtonText: 'Ir a Convocatorias',
        confirmButtonColor: '#3699FF',
      }).then(() => history.push('/convocatorias'))
      return
    }

    if (tipoCaracteristica() === 'CONVENIO') {
      if (!convenioArchivo || !convenioCodigoAnexo.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Datos incompletos',
          text: 'Debes subir el documento de convenio y el código de anexo.',
        })
        return
      }
    }

    setEnviando(true)
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
      const payload = {
        convocatoria_id: parseInt(convocatoriaId),
        modalidad_id: seleccion.modalidad.id,
        nivel_id: seleccion.nivel.id,
        especialidad_id: seleccion.especialidad.id,
        caracteristica_id: seleccion.caracteristica?.id || null,
      }

      let res
      if (modoEditar && postulacionId) {
        res = await axios.patch(
          `${API_URL}/postulaciones/${postulacionId}/plaza`,
          payload,
          { headers }
        )
      } else {
        res = await axios.post(`${API_URL}/postulaciones/`, payload, { headers })
      }

      // Subir documento convenio si aplica
      if (tipoCaracteristica() === 'CONVENIO' && convenioArchivo) {
        const formData = new FormData()
        formData.append('archivo', convenioArchivo)
        formData.append('codigo_anexo', convenioCodigoAnexo)
        await axios.post(
          `${API_URL}/postulaciones/${res.data.id}/convenio`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }

      await Swal.fire({
        icon: 'success',
        title: modoEditar ? 'Selección actualizada' : 'Plaza seleccionada',
        html: `
                    <p>${modoEditar
            ? 'Tu selección de plaza fue actualizada correctamente.'
            : 'Tu postulación fue creada correctamente.'
          }</p>
                    <p><strong>Código:</strong> ${res.data.codigo || '—'}</p>
                    <p style="color:#7E8299;font-size:13px">
                        Ahora debes subir tus documentos obligatorios.
                    </p>
                `,
        confirmButtonText: 'Ver documentos',
        confirmButtonColor: '#3699FF',
      })

      history.push(`/postulaciones/${res.data.id}/documentos`)

    } catch (err) {
      const msg = err.response?.data?.detail || 'Ocurrió un error al procesar la postulación.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg })
    } finally {
      setEnviando(false)
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ESTADOS DE CARGA / ERROR
  // ════════════════════════════════════════════════════════════════════════════
  if (cargando) {
    return (
      <div className='d-flex justify-content-center align-items-center' style={{ minHeight: 400 }}>
        <div className='text-center'>
          <div className='spinner spinner-primary spinner-lg mb-4' />
          <p className='text-muted font-weight-bold'>Cargando catálogo de plazas...</p>
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
          <button className='btn btn-primary mt-2' onClick={cargarCatalogo}>
            <i className='fas fa-redo mr-2' />
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className='container-fluid px-0'>

      {/* ── Header ── */}
      <div className='card card-custom mb-7' style={{ background: HEADER_GRADIENT, border: 'none' }}>
        <div className='card-body py-8 px-8'>
          <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
            <div>
              <div className='d-flex align-items-center mb-2' style={{ gap: 10 }}>
                <h2 className='text-white font-weight-bolder mb-0'>
                  {modoEditar ? 'Modificar Selección de Plaza' : 'Selección de Plaza'}
                </h2>
                {modoEditar && (
                  <span
                    className='label label-inline label-lg font-weight-bold'
                    style={{ background: '#FFA800', color: '#fff', whiteSpace: 'nowrap' }}
                  >
                    <i className='fas fa-pencil-alt mr-1' />
                    Editando postulación
                  </span>
                )}
              </div>
              <p className='text-white mb-0' style={{ opacity: 0.8 }}>
                {modoEditar
                  ? 'Actualiza tu modalidad, nivel y especialidad cuando lo necesites.'
                  : 'Elige tu modalidad, nivel y especialidad para postular.'}
              </p>
            </div>

            {/* Resumen en header */}
            <div className='d-none d-md-flex align-items-center flex-wrap' style={{ gap: 8 }}>
              {seleccion.modalidad && (
                <span className='label label-inline label-lg font-weight-bold'
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  <i className='fas fa-chalkboard-teacher mr-2' />
                  {seleccion.modalidad.nombre}
                </span>
              )}
              {seleccion.nivel && (
                <span className='label label-inline label-lg font-weight-bold'
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                  <i className='fas fa-layer-group mr-2' />
                  {seleccion.nivel.nombre}
                </span>
              )}
              {seleccion.especialidad && (
                <span className='label label-inline label-lg font-weight-bold'
                  style={{
                    background: seleccion.especialidad.color_folder_hex || '#3699FF',
                    color: '#fff',
                  }}>
                  <i className='fas fa-folder mr-2' />
                  {seleccion.especialidad.nombre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alerta modo editar ── */}
      {modoEditar && (
        <div className='rounded p-4 mb-5 d-flex align-items-center'
          style={{ background: '#FFF4DE', borderLeft: '4px solid #FFA800' }}>
          <i className='fas fa-pencil-alt mr-3' style={{ color: '#FFA800', fontSize: 18 }} />
          <div>
            <div className='font-weight-bold' style={{ color: '#FFA800', fontSize: 13 }}>
              Modo edición activo
            </div>
            <div className='text-muted font-size-sm'>
              Puedes cambiar tu selección de plaza libremente y guardar cuando lo necesites.
              Solo disponible mientras la postulación esté en estado{' '}
              <strong>En Progreso</strong>.
            </div>
          </div>
        </div>
      )}

      {/* ── Sin convocatoria — SOLO se muestra si convocatoriaId es null ── */}
      {!convocatoriaId && (
        <div className='rounded p-4 mb-5 d-flex align-items-center'
          style={{ background: '#FFF4DE', borderLeft: '4px solid #FFA800' }}>
          <i className='fas fa-exclamation-triangle mr-3' style={{ color: '#FFA800', fontSize: 18 }} />
          <div>
            <div className='font-weight-bold' style={{ color: '#FFA800', fontSize: 13 }}>
              Sin convocatoria seleccionada
            </div>
            <div className='text-muted font-size-sm'>
              Regresa a{' '}
              <span
                className='text-primary font-weight-bold'
                style={{ cursor: 'pointer' }}
                onClick={() => history.push('/convocatorias')}
              >
                Convocatorias
              </span>
              {' '}y usa el botón Postular.
            </div>
          </div>
        </div>
      )}

      <div className='row'>

        {/* ══ CONTENIDO PRINCIPAL ══════════════════════════════════════ */}
        <div className='col-xl-8 col-lg-8'>
          <div className='card card-custom'>
            <div className='card-body p-8'>
              <StepIndicator pasoActual={paso} />

              {/* ══ PASO 1 — MODALIDAD ══ */}
              {paso === 1 && (
                <div>
                  <h4 className='font-weight-bolder text-dark mb-2'>
                    ¿A qué modalidad postulas?
                  </h4>
                  <p className='text-muted mb-6'>
                    Selecciona la modalidad educativa correspondiente a tu plaza.
                  </p>
                  <div className='row'>
                    {catalogo.map((modalidad) => (
                      <div key={modalidad.id} className='col-md-6 mb-4'>
                        <div
                          className='border rounded p-5 h-100'
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderColor: seleccion.modalidad?.id === modalidad.id ? '#3699FF' : '#EBEDF3',
                            background: seleccion.modalidad?.id === modalidad.id ? '#EEF6FF' : '#fff',
                            boxShadow: seleccion.modalidad?.id === modalidad.id ? '0 0 0 2px #3699FF33' : 'none',
                          }}
                          onClick={() => seleccionarModalidad(modalidad)}
                        >
                          <div className='d-flex align-items-center'>
                            <div
                              className='d-flex align-items-center justify-content-center rounded mr-4'
                              style={{ width: 48, height: 48, background: '#EEF6FF', flexShrink: 0 }}
                            >
                              <i className='fas fa-chalkboard-teacher text-primary' style={{ fontSize: 20 }} />
                            </div>
                            <div>
                              <div className='font-weight-bolder text-dark'>
                                {modalidad.nombre}
                              </div>
                              <div className='text-muted font-size-xs mt-1'>
                                <i className='fas fa-layer-group mr-1' />
                                {modalidad.niveles?.length || 0} nivel(es)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ PASO 2 — NIVEL ══ */}
              {paso === 2 && (
                <div>
                  <div className='d-flex align-items-center mb-6'>
                    <button className='btn btn-sm btn-light font-weight-bold mr-3' onClick={() => setPaso(1)}>
                      <i className='fas fa-arrow-left mr-1' />
                      Volver
                    </button>
                    <div>
                      <h4 className='font-weight-bolder text-dark mb-0'>
                        Selecciona el nivel
                      </h4>
                      <p className='text-muted font-size-sm mb-0'>
                        <i className='fas fa-chalkboard-teacher mr-1' />
                        {seleccion.modalidad?.nombre}
                      </p>
                    </div>
                  </div>
                  <div className='row'>
                    {nivelesDisponibles.map((nivel) => (
                      <div key={nivel.id} className='col-md-6 mb-4'>
                        <div
                          className='border rounded p-5 h-100'
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderColor: seleccion.nivel?.id === nivel.id ? '#1BC5BD' : '#EBEDF3',
                            background: seleccion.nivel?.id === nivel.id ? '#E8FFF3' : '#fff',
                            boxShadow: seleccion.nivel?.id === nivel.id ? '0 0 0 2px #1BC5BD33' : 'none',
                          }}
                          onClick={() => seleccionarNivel(nivel)}
                        >
                          <div className='d-flex align-items-center'>
                            <div
                              className='d-flex align-items-center justify-content-center rounded mr-4'
                              style={{ width: 48, height: 48, background: '#E8FFF3', flexShrink: 0 }}
                            >
                              <i className='fas fa-layer-group' style={{ color: '#1BC5BD', fontSize: 20 }} />
                            </div>
                            <div>
                              <div className='font-weight-bolder text-dark'>
                                {nivel.nombre}
                              </div>
                              <div className='text-muted font-size-xs mt-1'>
                                <i className='fas fa-book mr-1' />
                                {nivel.especialidades?.length || 0} especialidad(es)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ PASO 3 — ESPECIALIDAD ══ */}
              {paso === 3 && (
                <div>
                  <div className='d-flex align-items-center mb-6'>
                    <button className='btn btn-sm btn-light font-weight-bold mr-3' onClick={() => setPaso(2)}>
                      <i className='fas fa-arrow-left mr-1' />
                      Volver
                    </button>
                    <div>
                      <h4 className='font-weight-bolder text-dark mb-0'>
                        Selecciona la especialidad
                      </h4>
                      <p className='text-muted font-size-sm mb-0'>
                        <i className='fas fa-chalkboard-teacher mr-1' />
                        {seleccion.modalidad?.nombre}
                        <i className='fas fa-chevron-right mx-2' style={{ fontSize: 10 }} />
                        {seleccion.nivel?.nombre}
                      </p>
                    </div>
                  </div>
                  <div className='row'>
                    {especialidadesDisponibles.map((esp) => {
                      const colorFolder = esp.color_folder_hex || '#3699FF'
                      const seleccionado = seleccion.especialidad?.id === esp.id
                      return (
                        <div key={esp.id} className='col-md-6 mb-4'>
                          <div
                            className='border rounded p-5 h-100'
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderColor: seleccionado ? colorFolder : '#EBEDF3',
                              background: seleccionado ? `${colorFolder}15` : '#fff',
                              boxShadow: seleccionado ? `0 0 0 2px ${colorFolder}33` : 'none',
                            }}
                            onClick={() => seleccionarEspecialidad(esp)}
                          >
                            <div className='d-flex align-items-center'>
                              <div
                                className='d-flex align-items-center justify-content-center rounded mr-4'
                                style={{
                                  width: 48, height: 48, flexShrink: 0,
                                  background: `${colorFolder}20`,
                                }}
                              >
                                <i className='fas fa-folder' style={{ color: colorFolder, fontSize: 22 }} />
                              </div>
                              <div className='font-weight-bolder text-dark'>
                                {esp.nombre}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ══ PASO 4 — CONFIRMACIÓN ══ */}
              {paso === 4 && (
                <div>
                  <div className='d-flex align-items-center mb-6'>
                    <button className='btn btn-sm btn-light font-weight-bold mr-3' onClick={() => setPaso(3)}>
                      <i className='fas fa-arrow-left mr-1' />
                      Volver
                    </button>
                    <div>
                      <h4 className='font-weight-bolder text-dark mb-0'>
                        Confirmar selección
                      </h4>
                      <p className='text-muted font-size-sm mb-0'>
                        Revisa tu selección y elige la característica de la plaza
                      </p>
                    </div>
                  </div>

                  {/* Resumen selección */}
                  <div className='rounded p-5 mb-6' style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}>
                    <div className='row'>
                      <div className='col-md-4 mb-3 mb-md-0'>
                        <div className='text-muted font-size-xs mb-1'>Modalidad</div>
                        <div className='d-flex align-items-center'>
                          <i className='fas fa-chalkboard-teacher mr-2 text-primary' />
                          <span className='font-weight-bolder text-dark'>
                            {seleccion.modalidad?.nombre}
                          </span>
                        </div>
                      </div>
                      <div className='col-md-4 mb-3 mb-md-0'>
                        <div className='text-muted font-size-xs mb-1'>Nivel</div>
                        <div className='d-flex align-items-center'>
                          <i className='fas fa-layer-group mr-2' style={{ color: '#1BC5BD' }} />
                          <span className='font-weight-bolder text-dark'>
                            {seleccion.nivel?.nombre}
                          </span>
                        </div>
                      </div>
                      <div className='col-md-4'>
                        <div className='text-muted font-size-xs mb-1'>Especialidad</div>
                        <div className='d-flex align-items-center'>
                          <i
                            className='fas fa-folder mr-2'
                            style={{ color: seleccion.especialidad?.color_folder_hex || '#3699FF' }}
                          />
                          <span className='font-weight-bolder text-dark'>
                            {seleccion.especialidad?.nombre}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Características ── */}
                  <h6 className='font-weight-bolder text-dark mb-4'>
                    <i className='fas fa-sliders-h mr-2 text-primary' />
                    Característica de la plaza
                  </h6>
                  <div className='row mb-5'>

                    {/* 1 — ESTATAL (siempre visible, no suma nada) */}
                    <div className='col-md-4 mb-3'>
                      <div
                        className='border rounded p-4 text-center'
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          borderColor: !seleccion.caracteristica ? '#1BC5BD' : '#EBEDF3',
                          background: !seleccion.caracteristica ? '#E8FFF3' : '#fff',
                          boxShadow: !seleccion.caracteristica ? '0 0 0 2px #1BC5BD33' : 'none',
                        }}
                        onClick={() => {
                          setSeleccion(p => ({ ...p, caracteristica: null }))
                          setConvenioArchivo(null)
                          setConvenioCodigoAnexo('')
                        }}
                      >
                        <div
                          className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3'
                          style={{ width: 48, height: 48, background: '#E8FFF3' }}
                        >
                          <i className='fas fa-university' style={{ color: '#1BC5BD', fontSize: 20 }} />
                        </div>
                        <div className='font-weight-bolder text-dark'>Estatal</div>
                        <div className='text-muted font-size-xs mt-1'>Predeterminado</div>
                      </div>
                    </div>

                    {/* 2 — BILINGÜE (si existe en BD) */}
                    {caracteristicas
                      .filter(c => c.nombre?.toUpperCase().includes('BILING'))
                      .map((caract) => {
                        const seleccionado = seleccion.caracteristica?.id === caract.id
                        return (
                          <div key={caract.id} className='col-md-4 mb-3'>
                            <div
                              className='border rounded p-4 text-center'
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderColor: seleccionado ? '#8950FC' : '#EBEDF3',
                                background: seleccionado ? '#EEE5FF' : '#fff',
                                boxShadow: seleccionado ? '0 0 0 2px #8950FC33' : 'none',
                              }}
                              onClick={() => seleccionarCaracteristica(caract)}
                            >
                              <div
                                className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3'
                                style={{ width: 48, height: 48, background: '#EEE5FF' }}
                              >
                                <i className='fas fa-language' style={{ color: '#8950FC', fontSize: 20 }} />
                              </div>
                              <div className='font-weight-bolder text-dark'>{caract.nombre}</div>
                              <div className='text-muted font-size-xs mt-1'>Lengua originaria</div>
                            </div>
                          </div>
                        )
                      })}

                    {/* 3 — CONVENIO (si existe en BD) */}
                    {caracteristicas
                      .filter(c => {
                        const n = c.nombre?.toUpperCase() || ''
                        console.log('🔍 Características cargadas:', caracteristicas.map(c => ({
                          id: c.id,
                          nombre: c.nombre,
                          activo: c.activo
                        })))
                        return (
                          n.includes('CONVEN') ||
                          n.includes('CONVENIO') ||
                          n === 'CONVENIO'
                        )
                      })
                      .map((caract) => {
                        const seleccionado = seleccion.caracteristica?.id === caract.id
                        return (
                          <div key={caract.id} className='col-md-4 mb-3'>
                            <div
                              className='border rounded p-4 text-center'
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderColor: seleccionado ? '#FFA800' : '#EBEDF3',
                                background: seleccionado ? '#FFF4DE' : '#fff',
                                boxShadow: seleccionado ? '0 0 0 2px #FFA80033' : 'none',
                              }}
                              onClick={() => seleccionarCaracteristica(caract)}
                            >
                              <div
                                className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-3'
                                style={{ width: 48, height: 48, background: '#FFF4DE' }}
                              >
                                <i className='fas fa-handshake' style={{ color: '#FFA800', fontSize: 20 }} />
                              </div>
                              <div className='font-weight-bolder text-dark'>{caract.nombre}</div>
                              <div className='text-muted font-size-xs mt-1'>Requiere documento</div>
                            </div>
                          </div>
                        )
                      })}
                  </div>

                  {/* ── Panel Bilingüe — notas de lengua originaria ── */}
                  {tipoCaracteristica() === 'BILINGUE' && (
                    <div className='rounded p-5 mb-5'
                      style={{ background: '#EEE5FF', borderLeft: '4px solid #8950FC' }}>
                      <div className='font-weight-bolder mb-3' style={{ color: '#8950FC' }}>
                        <i className='fas fa-language mr-2' />
                        Notas de lengua originaria registradas
                      </div>
                      {cargandoNota ? (
                        <div className='d-flex align-items-center'>
                          <div className='spinner-border spinner-border-sm mr-2' style={{ color: '#8950FC' }} />
                          <span className='text-muted font-size-sm'>Consultando notas...</span>
                        </div>
                      ) : notaBilingue ? (
                        <div className='row'>
                          <div className='col-6'>
                            <div className='text-muted font-size-xs mb-1'>Comprensión oral</div>
                            <NivelBadge nivel={notaBilingue.nivel_oral} />
                          </div>
                          <div className='col-6'>
                            <div className='text-muted font-size-xs mb-1'>Expresión escrita</div>
                            <NivelBadge nivel={notaBilingue.nivel_escrito} />
                          </div>
                        </div>
                      ) : (
                        <div className='d-flex align-items-center'>
                          <i className='fas fa-info-circle mr-2' style={{ color: '#8950FC' }} />
                          <span className='text-muted font-size-sm'>
                            No tienes notas de lengua originaria registradas.
                            Puedes continuar, pero se tomará en cuenta al evaluar.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Panel Convenio — subida de documento ── */}
                  {tipoCaracteristica() === 'CONVENIO' && (
                    <div className='rounded p-5 mb-5'
                      style={{ background: '#FFF4DE', borderLeft: '4px solid #FFA800' }}>
                      <div className='font-weight-bolder mb-4' style={{ color: '#FFA800' }}>
                        <i className='fas fa-handshake mr-2' />
                        Documentación de convenio requerida
                      </div>

                      {/* Código de anexo */}
                      <div className='form-group mb-4'>
                        <label className='font-weight-bold font-size-sm'>
                          Código de anexo <span className='text-danger'>*</span>
                        </label>
                        <input
                          type='text'
                          className='form-control mt-1'
                          placeholder='Ej: CONV-2026-001'
                          value={convenioCodigoAnexo}
                          onChange={(e) => {
                            const val = e.target.value
                            setConvenioCodigoAnexo(val)
                          }}
                        />
                      </div>

                      {/* Subida de archivo */}
                      <div className='form-group mb-0'>
                        <label className='font-weight-bold font-size-sm'>
                          Documento de convenio <span className='text-danger'>*</span>
                        </label>
                        <div
                          className='border rounded p-5 text-center mt-1'
                          style={{
                            cursor: 'pointer',
                            borderStyle: 'dashed',
                            background: '#fff',
                            borderColor: convenioArchivo ? '#FFA800' : '#EBEDF3',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type='file'
                            accept='.pdf,.jpg,.jpeg,.png'
                            style={{ display: 'none' }}
                            onChange={(e) => setConvenioArchivo(e.target.files[0] || null)}
                          />
                          {convenioArchivo ? (
                            <div className='d-flex align-items-center justify-content-center' style={{ gap: 10 }}>
                              <i className='fas fa-file-alt' style={{ color: '#FFA800', fontSize: 24 }} />
                              <div className='text-left'>
                                <div className='font-weight-bold text-dark font-size-sm'>
                                  {convenioArchivo.name}
                                </div>
                                <div className='text-muted font-size-xs'>
                                  {(convenioArchivo.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                              <button
                                className='btn btn-icon btn-sm btn-light-danger ml-3'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConvenioArchivo(null)
                                  if (fileInputRef.current) fileInputRef.current.value = ''
                                }}
                                title='Quitar archivo'
                              >
                                <i className='fas fa-times' style={{ fontSize: 12 }} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <i className='fas fa-cloud-upload-alt text-muted mb-3' style={{ fontSize: 32 }} />
                              <div className='font-weight-bold text-muted font-size-sm'>
                                Haz clic para seleccionar el documento
                              </div>
                              <div className='text-muted font-size-xs mt-1'>
                                PDF, JPG o PNG — máx. 5 MB
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Aviso campos incompletos */}
                      {(!convenioArchivo || !convenioCodigoAnexo.trim()) && (
                        <div className='d-flex align-items-center mt-3'>
                          <i className='fas fa-exclamation-circle mr-2' style={{ color: '#FFA800', fontSize: 13 }} />
                          <span className='text-muted font-size-xs'>
                            Debes completar el código de anexo y subir el documento para continuar.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Botón confirmar / guardar ── */}
                  <button
                    className='btn btn-primary btn-block font-weight-bold py-4'
                    style={{ borderRadius: 8, fontSize: 15 }}
                    onClick={confirmarPostulacion}
                    disabled={enviando || !convocatoriaId}
                  >
                    {enviando ? (
                      <>
                        <span className='spinner-border spinner-border-sm mr-2' />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className={`fas ${modoEditar ? 'fa-save' : 'fa-paper-plane'} mr-2`} />
                        {modoEditar ? 'Guardar cambios' : 'Confirmar postulación'}
                      </>
                    )}
                  </button>

                  {/* Aviso si botón deshabilitado por falta de convocatoria */}
                  {!convocatoriaId && (
                    <p className='text-muted font-size-xs text-center mt-3'>
                      <i className='fas fa-info-circle mr-1' />
                      El botón se habilitará automáticamente cuando se detecte tu convocatoria activa.
                    </p>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ══ PANEL LATERAL ════════════════════════════════════════════ */}
        <div className='col-xl-4 col-lg-4'>
          <div className='card card-custom'>
            <div className='card-header'>
              <div className='card-title'>
                <h3 className='card-label font-weight-bolder font-size-sm'>
                  Tu selección
                </h3>
              </div>
            </div>
            <div className='card-body p-6'>

              {/* Modalidad */}
              <div className='d-flex align-items-center mb-4'>
                <div
                  className='d-flex align-items-center justify-content-center rounded mr-3'
                  style={{ width: 36, height: 36, background: seleccion.modalidad ? '#EEF6FF' : '#F3F6F9', flexShrink: 0 }}
                >
                  <i className='fas fa-chalkboard-teacher'
                    style={{ color: seleccion.modalidad ? '#3699FF' : '#B5B5C3', fontSize: 16 }} />
                </div>
                <div>
                  <div className='text-muted font-size-xs'>Modalidad</div>
                  <div className={`font-weight-bold font-size-sm ${seleccion.modalidad ? 'text-dark' : 'text-muted'}`}>
                    {seleccion.modalidad?.nombre || 'Sin seleccionar'}
                  </div>
                </div>
              </div>

              {/* Nivel */}
              <div className='d-flex align-items-center mb-4'>
                <div
                  className='d-flex align-items-center justify-content-center rounded mr-3'
                  style={{ width: 36, height: 36, background: seleccion.nivel ? '#E8FFF3' : '#F3F6F9', flexShrink: 0 }}
                >
                  <i className='fas fa-layer-group'
                    style={{ color: seleccion.nivel ? '#1BC5BD' : '#B5B5C3', fontSize: 16 }} />
                </div>
                <div>
                  <div className='text-muted font-size-xs'>Nivel</div>
                  <div className={`font-weight-bold font-size-sm ${seleccion.nivel ? 'text-dark' : 'text-muted'}`}>
                    {seleccion.nivel?.nombre || 'Sin seleccionar'}
                  </div>
                </div>
              </div>

              {/* Especialidad */}
              <div className='d-flex align-items-center mb-4'>
                <div
                  className='d-flex align-items-center justify-content-center rounded mr-3'
                  style={{
                    width: 36, height: 36, flexShrink: 0,
                    background: seleccion.especialidad
                      ? `${seleccion.especialidad.color_folder_hex || '#3699FF'}20`
                      : '#F3F6F9',
                  }}
                >
                  <i className='fas fa-folder'
                    style={{
                      color: seleccion.especialidad
                        ? seleccion.especialidad.color_folder_hex || '#3699FF'
                        : '#B5B5C3',
                      fontSize: 16,
                    }} />
                </div>
                <div>
                  <div className='text-muted font-size-xs'>Especialidad</div>
                  <div className={`font-weight-bold font-size-sm ${seleccion.especialidad ? 'text-dark' : 'text-muted'}`}>
                    {seleccion.especialidad?.nombre || 'Sin seleccionar'}
                  </div>
                </div>
              </div>

              {/* Característica */}
              <div className='d-flex align-items-center mb-6'>
                <div
                  className='d-flex align-items-center justify-content-center rounded mr-3'
                  style={{
                    width: 36, height: 36, flexShrink: 0,
                    background: seleccion.caracteristica
                      ? tipoCaracteristica() === 'BILINGUE' ? '#EEE5FF'
                        : tipoCaracteristica() === 'CONVENIO' ? '#FFF4DE'
                          : '#E8FFF3'
                      : '#E8FFF3',
                  }}
                >
                  <i
                    className={`fas ${tipoCaracteristica() === 'BILINGUE' ? 'fa-language'
                      : tipoCaracteristica() === 'CONVENIO' ? 'fa-handshake'
                        : 'fa-university'
                      }`}
                    style={{
                      color: tipoCaracteristica() === 'BILINGUE' ? '#8950FC'
                        : tipoCaracteristica() === 'CONVENIO' ? '#FFA800'
                          : '#1BC5BD',
                      fontSize: 16,
                    }}
                  />
                </div>
                <div>
                  <div className='text-muted font-size-xs'>Característica</div>
                  <div className='font-weight-bold font-size-sm text-dark'>
                    {seleccion.caracteristica?.nombre || 'Estatal (predeterminado)'}
                  </div>
                </div>
              </div>

              {/* Separador */}
              <div style={{ height: 1, background: '#EBEDF3', marginBottom: 16 }} />

              {/* Progreso */}
              <div className='text-muted font-size-xs mb-2'>
                Progreso{' '}
                <span className='font-weight-bold text-primary'>
                  {[seleccion.modalidad, seleccion.nivel, seleccion.especialidad].filter(Boolean).length} / 3
                </span>{' '}
                pasos completados
              </div>
              <div className='progress' style={{ height: 6, borderRadius: 3, background: '#EBEDF3' }}>
                <div
                  className='progress-bar'
                  style={{
                    width: `${([seleccion.modalidad, seleccion.nivel, seleccion.especialidad].filter(Boolean).length / 3) * 100}%`,
                    background: '#3699FF',
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Badge modo edición */}
              {modoEditar && (
                <div className='rounded p-3 mt-5'
                  style={{ background: '#FFF4DE', borderLeft: '3px solid #FFA800' }}>
                  <div className='font-weight-bold font-size-xs mb-1' style={{ color: '#FFA800' }}>
                    <i className='fas fa-pencil-alt mr-1' />
                    Modo edición activo
                  </div>
                  <div className='text-muted font-size-xs'>
                    Cambia tu selección y presiona{' '}
                    <strong>Guardar cambios</strong> cuando termines.
                  </div>
                </div>
              )}

              {/* Alerta sin convocatoria */}
              {!convocatoriaId && (
                <div className='rounded p-3 mt-5'
                  style={{ background: '#FFF4DE', borderLeft: '3px solid #FFA800' }}>
                  <div className='font-weight-bold font-size-xs mb-1' style={{ color: '#FFA800' }}>
                    <i className='fas fa-exclamation-triangle mr-1' />
                    Sin convocatoria seleccionada
                  </div>
                  <div className='text-muted font-size-xs'>
                    Regresa a{' '}
                    <span
                      className='text-primary font-weight-bold'
                      style={{ cursor: 'pointer' }}
                      onClick={() => history.push('/convocatorias')}
                    >
                      Convocatorias
                    </span>
                    {' '}y usa el botón Postular.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        {/* ══ FIN PANEL LATERAL ════════════════════════════════════════ */}

      </div>
    </div>
  )
}

export default SeleccionPlazaPage