/**
 * CatalogoPanelPage.js — v2 CORREGIDO
 * Panel SuperAdmin para gestionar:
 * Modalidades → Niveles → Especialidades → Características
 */
import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'
import Swal from 'sweetalert2'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
const HEADER_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'

const THEME = {
    primary: '#1e3a5f',
    secondary: '#2d5a8e',
    accent: '#3699FF',
    success: '#1BC5BD',
    warning: '#FFA800',
    danger: '#F64E60',
    info: '#8950FC',
    muted: '#B5B5C3',
    successBg: '#E8FFF3',
    warningBg: '#FFF4DE',
    dangerBg: '#FFF5F8',
    infoBg: '#EEE5FF',
    accentBg: '#EEF6FF',
}

const COLORES_FOLDER = [
    { nombre: 'AMARILLO', hex: '#FFD700' },
    { nombre: 'ROJO', hex: '#E53935' },
    { nombre: 'AZUL', hex: '#1E88E5' },
    { nombre: 'VERDE', hex: '#43A047' },
    { nombre: 'NARANJA', hex: '#FB8C00' },
    { nombre: 'MORADO', hex: '#8E24AA' },
    { nombre: 'CELESTE', hex: '#00ACC1' },
    { nombre: 'ROSADO', hex: '#E91E63' },
    { nombre: 'MARRON', hex: '#6D4C41' },
    { nombre: 'GRIS', hex: '#757575' },
]

// ─────────────────────────────────────────────────────────────────────────────
// HOOK TOKEN
// ─────────────────────────────────────────────────────────────────────────────
const useToken = () => {
    const auth = useSelector((s) => s.auth)
    return auth?.authToken || auth?.accessToken || auth?.token || localStorage.getItem('token') || null
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES PEQUEÑOS
// ─────────────────────────────────────────────────────────────────────────────
const Badge = ({ label, bg, color }) => (
    <span
        className="label label-inline font-weight-bold"
        style={{ backgroundColor: bg, color, fontSize: 10, padding: '3px 8px' }}
    >
        {label}
    </span>
)

const SpinnerCarga = ({ texto }) => (
    <div className="text-center py-8">
        <div className="spinner-border text-primary mb-3" style={{ width: 32, height: 32 }} />
        <p className="text-muted font-weight-bold mb-0">{texto || 'Cargando...'}</p>
    </div>
)

const EstadoVacio = ({ mensaje, submensaje, onAccion, textoAccion }) => (
    <div className="text-center py-10">
        <div
            className="d-flex align-items-center justify-content-center rounded-circle mx-auto mb-4"
            style={{ width: 64, height: 64, backgroundColor: '#F3F6F9' }}
        >
            <i className="fas fa-inbox text-muted" style={{ fontSize: 26 }} />
        </div>
        <p className="font-weight-bolder text-dark mb-1">{mensaje}</p>
        {submensaje && <p className="text-muted font-size-sm mb-3">{submensaje}</p>}
        {onAccion && (
            <button className="btn btn-primary btn-sm font-weight-bold" onClick={onAccion}>
                <i className="fas fa-plus mr-2" />{textoAccion}
            </button>
        )}
    </div>
)

const TABS = [
    { id: 'modalidades', label: 'Modalidades', icon: 'fa-graduation-cap' },
    { id: 'niveles', label: 'Niveles', icon: 'fa-layer-group' },
    { id: 'especialidades', label: 'Especialidades', icon: 'fa-folder' },
    { id: 'caracteristicas', label: 'Características', icon: 'fa-tags' },
]

// ─────────────────────────────────────────────────────────────────────────────
// MODAL GENÉRICO
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ titulo, onCerrar, onGuardar, guardando, children }) => (
    <div
        className="modal fade show d-block"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        onClick={(e) => { if (e.target === e.currentTarget) onCerrar() }}
    >
        <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0" style={{ borderRadius: 12 }}>
                <div
                    className="modal-header border-0 px-7 pt-7 pb-4"
                    style={{ background: HEADER_GRADIENT, borderRadius: '12px 12px 0 0' }}
                >
                    <h5 className="modal-title text-white font-weight-bolder">{titulo}</h5>
                    <button
                        className="btn btn-icon btn-sm"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        onClick={onCerrar}
                    >
                        <i className="fas fa-times text-white" />
                    </button>
                </div>
                <div className="modal-body px-7 py-6">{children}</div>
                <div className="modal-footer border-0 px-7 pb-7 pt-0">
                    <button
                        className="btn btn-light font-weight-bold mr-3"
                        onClick={onCerrar}
                        disabled={guardando}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn btn-primary font-weight-bolder px-8"
                        onClick={onGuardar}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <><span className="spinner-border spinner-border-sm mr-2" />Guardando...</>
                        ) : (
                            <><i className="fas fa-save mr-2" />Guardar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// CAMPO DE FORMULARIO
// ─────────────────────────────────────────────────────────────────────────────
const Campo = ({ label, requerido, children, ayuda }) => (
    <div className="form-group mb-5">
        <label className="font-weight-bold text-dark font-size-sm">
            {label}
            {requerido && <span className="text-danger ml-1">*</span>}
        </label>
        {children}
        {ayuda && <small className="text-muted d-block mt-1">{ayuda}</small>}
    </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR DE COLOR
// ─────────────────────────────────────────────────────────────────────────────
const SelectorColor = ({ valor, onChange }) => (
    <div className="d-flex flex-wrap mt-2" style={{ gap: 8 }}>
        {COLORES_FOLDER.map((c) => (
            <div
                key={c.nombre}
                onClick={() => onChange(c)}
                title={c.nombre}
                style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: c.hex, cursor: 'pointer',
                    border: valor === c.hex ? `3px solid ${THEME.primary}` : '3px solid transparent',
                    boxShadow: valor === c.hex ? `0 0 0 2px ${c.hex}60` : 'none',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                {valor === c.hex && (
                    <i className="fas fa-check" style={{ color: '#fff', fontSize: 12, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
                )}
            </div>
        ))}
        <div className="d-flex align-items-center ml-2">
            <input
                type="color"
                value={valor || '#3699FF'}
                onChange={(e) => {
                    const hex = e.target.value
                    onChange({ nombre: 'PERSONALIZADO', hex })
                }}
                style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                title="Color personalizado"
            />
        </div>
    </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const CatalogoPanelPage = () => {
    const token = useToken()
    const headers = { Authorization: `Bearer ${token}` }

    const [tabActivo, setTabActivo] = useState('modalidades')

    const [modalidades, setModalidades] = useState([])
    const [niveles, setNiveles] = useState([])
    const [especialidades, setEspecialidades] = useState([])
    const [caracteristicas, setCaracteristicas] = useState([])

    const [filtroModalidadNivel, setFiltroModalidadNivel] = useState('')
    const [filtroModalidadEsp, setFiltroModalidadEsp] = useState('')
    const [filtroNivelEsp, setFiltroNivelEsp] = useState('')

    const [cargando, setCargando] = useState(false)
    const [modalAbierto, setModalAbierto] = useState(false)
    const [modoEditar, setModoEditar] = useState(false)
    const [guardando, setGuardando] = useState(false)
    const [itemEditar, setItemEditar] = useState(null)

    // ── Formularios ────────────────────────────────────────────────────────────
    const FORM_MODALIDAD_VACIO = {
        nombre: '', codigo: '', descripcion: '', orden: 1, activo: true
    }
    const FORM_NIVEL_VACIO = {
        nombre: '', codigo: '', descripcion: '', modalidad_id: '', orden: 1, activo: true
    }
    // ✅ FIX: _modalidadFiltro es campo auxiliar de UI, no se envía al backend
    const FORM_ESP_VACIO = {
        nombre: '', codigo: '', descripcion: '',
        nivel_id: '', _modalidadFiltro: '',
        color_folder: 'AMARILLO', color_folder_hex: '#FFD700',
        color_folder_rgb: '', anexo6_numero: '', anexo6_descripcion: '',
        orden: 1, activo: true,
    }
    const FORM_CARACT_VACIO = {
        nombre: '', codigo: '', descripcion: '',
        es_bilingue: false, es_convenio: false,
        activo: true, visible_docente: true
    }

    const [formModalidad, setFormModalidad] = useState(FORM_MODALIDAD_VACIO)
    const [formNivel, setFormNivel] = useState(FORM_NIVEL_VACIO)
    const [formEsp, setFormEsp] = useState(FORM_ESP_VACIO)
    const [formCaract, setFormCaract] = useState(FORM_CARACT_VACIO)

    // ═══════════════════════════════════════════════════════════════════════════
    // CARGA DE DATOS
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => { cargarTodo() }, []) // eslint-disable-line

    const cargarTodo = async () => {
        setCargando(true)
        try {
            await Promise.all([
                cargarModalidades(),
                cargarNiveles(),
                cargarEspecialidades(),
                cargarCaracteristicas(),
            ])
        } finally {
            setCargando(false)
        }
    }

    const cargarModalidades = async () => {
        try {
            const resp = await axios.get(`${API_URL}/catalogo/modalidades`, {
                headers, params: { solo_activas: false }
            })
            const data = resp.data
            setModalidades(Array.isArray(data) ? data : data.data || [])
        } catch (err) { console.error('Error modalidades:', err) }
    }

    const cargarNiveles = async () => {
        try {
            const resp = await axios.get(`${API_URL}/catalogo/niveles`, {
                headers, params: { solo_activas: false }
            })
            const data = resp.data
            setNiveles(Array.isArray(data) ? data : data.data || [])
        } catch (err) { console.error('Error niveles:', err) }
    }

    const cargarEspecialidades = async () => {
        try {
            const resp = await axios.get(`${API_URL}/catalogo/especialidades`, {
                headers, params: { solo_activas: false }
            })
            const data = resp.data
            setEspecialidades(Array.isArray(data) ? data : data.data || [])
        } catch (err) { console.error('Error especialidades:', err) }
    }

    const cargarCaracteristicas = async () => {
        try {
            const resp = await axios.get(`${API_URL}/catalogo/caracteristicas`, { headers })
            const data = resp.data
            setCaracteristicas(Array.isArray(data) ? data : data.data || [])
        } catch (err) { console.error('Error características:', err) }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ABRIR MODAL
    // ═══════════════════════════════════════════════════════════════════════════
    const abrirCrear = () => {
        setModoEditar(false)
        setItemEditar(null)
        if (tabActivo === 'modalidades') setFormModalidad(FORM_MODALIDAD_VACIO)
        if (tabActivo === 'niveles') setFormNivel({ ...FORM_NIVEL_VACIO, modalidad_id: filtroModalidadNivel || '' })
        if (tabActivo === 'especialidades') setFormEsp({ ...FORM_ESP_VACIO, _modalidadFiltro: filtroModalidadEsp || '' })
        if (tabActivo === 'caracteristicas') setFormCaract(FORM_CARACT_VACIO)
        setModalAbierto(true)
    }

    const abrirEditar = (item) => {
        setModoEditar(true)
        setItemEditar(item)

        if (tabActivo === 'modalidades') {
            setFormModalidad({
                nombre: item.nombre || '',
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                orden: item.orden || 1,
                activo: item.activo ?? true,
            })
        }

        if (tabActivo === 'niveles') {
            setFormNivel({
                nombre: item.nombre || '',
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                modalidad_id: item.modalidad_id || '',
                orden: item.orden || 1,
                activo: item.activo ?? true,
            })
        }

        if (tabActivo === 'especialidades') {
            // ✅ FIX: pre-cargar _modalidadFiltro desde el nivel actual
            const nivelActual = niveles.find((n) => n.id === Number(item.nivel_id))
            setFormEsp({
                nombre: item.nombre || '',
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                nivel_id: item.nivel_id || '',
                _modalidadFiltro: nivelActual?.modalidad_id ? String(nivelActual.modalidad_id) : '',
                color_folder: item.color_folder || 'AMARILLO',
                color_folder_hex: item.color_folder_hex || '#FFD700',
                color_folder_rgb: item.color_folder_rgb || '',
                anexo6_numero: item.anexo6_numero || '',
                anexo6_descripcion: item.anexo6_descripcion || '',
                orden: item.orden || 1,
                activo: item.activo ?? true,
            })
        }

        if (tabActivo === 'caracteristicas') {
            setFormCaract({
                nombre: item.nombre || '',
                codigo: item.codigo || '',
                descripcion: item.descripcion || '',
                es_bilingue: item.es_bilingue ?? false,
                es_convenio: item.es_convenio ?? false,
                activo: item.activo ?? true,
                visible_docente: item.visible_docente ?? true,
            })
        }

        setModalAbierto(true)
    }

    const cerrarModal = () => {
        setModalAbierto(false)
        setItemEditar(null)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GUARDAR
    // ═══════════════════════════════════════════════════════════════════════════
    const guardar = async () => {
        setGuardando(true)
        try {
            let url, payload

            if (tabActivo === 'modalidades') {
                if (!formModalidad.nombre || !formModalidad.codigo) {
                    Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Nombre y código son obligatorios.', confirmButtonColor: THEME.accent })
                    return
                }
                payload = formModalidad
                url = modoEditar
                    ? `${API_URL}/catalogo/modalidades/${itemEditar.id}`
                    : `${API_URL}/catalogo/modalidades`
            }

            if (tabActivo === 'niveles') {
                if (!formNivel.nombre || !formNivel.codigo || !formNivel.modalidad_id) {
                    Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Nombre, código y modalidad son obligatorios.', confirmButtonColor: THEME.accent })
                    return
                }
                payload = formNivel
                url = modoEditar
                    ? `${API_URL}/catalogo/niveles/${itemEditar.id}`
                    : `${API_URL}/catalogo/niveles`
            }

            if (tabActivo === 'especialidades') {
                if (!formEsp.nombre || !formEsp.codigo || !formEsp.nivel_id) {
                    Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Nombre, código y nivel son obligatorios.', confirmButtonColor: THEME.accent })
                    return
                }
                // ✅ FIX: excluir _modalidadFiltro del payload — es solo UI
                const { _modalidadFiltro, ...payloadEsp } = formEsp
                payload = payloadEsp
                url = modoEditar
                    ? `${API_URL}/catalogo/especialidades/${itemEditar.id}`
                    : `${API_URL}/catalogo/especialidades`
            }

            if (tabActivo === 'caracteristicas') {
                if (!formCaract.nombre || !formCaract.codigo) {
                    Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Nombre y código son obligatorios.', confirmButtonColor: THEME.accent })
                    return
                }
                payload = formCaract
                url = modoEditar
                    ? `${API_URL}/catalogo/caracteristicas/${itemEditar.id}`
                    : `${API_URL}/catalogo/caracteristicas`
            }

            if (modoEditar) {
                await axios.put(url, payload, { headers })
            } else {
                await axios.post(url, payload, { headers })
            }

            await Swal.fire({
                icon: 'success',
                title: modoEditar ? 'Actualizado' : 'Creado',
                text: modoEditar ? 'El registro fue actualizado correctamente.' : 'El registro fue creado correctamente.',
                confirmButtonColor: THEME.accent,
                timer: 2000,
                showConfirmButton: false,
            })

            cerrarModal()
            cargarTodo()

        } catch (err) {
            const msg = err.response?.data?.detail || err.response?.data?.message || 'Error al guardar.'
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: THEME.accent })
        } finally {
            setGuardando(false)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ELIMINAR (soft delete)
    // ═══════════════════════════════════════════════════════════════════════════
    const eliminar = async (item) => {
        const resultado = await Swal.fire({
            icon: 'warning',
            title: '¿Desactivar registro?',
            text: `"${item.nombre}" será desactivado. Puedes reactivarlo editándolo.`,
            showCancelButton: true,
            confirmButtonColor: THEME.danger,
            cancelButtonColor: THEME.muted,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
        })
        if (!resultado.isConfirmed) return

        try {
            let url
            if (tabActivo === 'modalidades') url = `${API_URL}/catalogo/modalidades/${item.id}`
            if (tabActivo === 'niveles') url = `${API_URL}/catalogo/niveles/${item.id}`
            if (tabActivo === 'especialidades') url = `${API_URL}/catalogo/especialidades/${item.id}`

            await axios.delete(url, { headers })

            Swal.fire({
                icon: 'success', title: 'Desactivado',
                text: `"${item.nombre}" fue desactivado.`,
                confirmButtonColor: THEME.accent,
                timer: 2000, showConfirmButton: false,
            })
            cargarTodo()
        } catch (err) {
            const msg = err.response?.data?.detail || 'Error al desactivar.'
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: THEME.accent })
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    const getNombreModalidad = (id) => modalidades.find((m) => m.id === Number(id))?.nombre || '—'
    const getNombreNivel = (id) => niveles.find((n) => n.id === Number(id))?.nombre || '—'

    const nivelesFiltrados = filtroModalidadNivel
        ? niveles.filter((n) => n.modalidad_id === Number(filtroModalidadNivel))
        : niveles

    const especialidadesFiltradas = (() => {
        let lista = especialidades
        if (filtroModalidadEsp) {
            const ids = niveles
                .filter((n) => n.modalidad_id === Number(filtroModalidadEsp))
                .map((n) => n.id)
            lista = lista.filter((e) => ids.includes(e.nivel_id))
        }
        if (filtroNivelEsp) {
            lista = lista.filter((e) => e.nivel_id === Number(filtroNivelEsp))
        }
        return lista
    })()

    // Niveles filtrados dentro del modal de especialidad
    const nivelesEnModalEsp = formEsp._modalidadFiltro
        ? niveles.filter((n) => n.activo && n.modalidad_id === Number(formEsp._modalidadFiltro))
        : niveles.filter((n) => n.activo)

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="container-fluid px-0">

            {/* ── HEADER ── */}
            <div className="card card-custom mb-7" style={{ background: HEADER_GRADIENT, border: 'none' }}>
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <div className="d-flex align-items-center">
                            <div
                                className="d-flex align-items-center justify-content-center rounded mr-5"
                                style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }}
                            >
                                <i className="fas fa-cogs text-white" style={{ fontSize: 24 }} />
                            </div>
                            <div>
                                <h2 className="text-white font-weight-bolder mb-1">Panel de Catálogo</h2>
                                <p className="text-white mb-0" style={{ opacity: 0.8, fontSize: 14 }}>
                                    Gestiona modalidades, niveles, especialidades y características del sistema
                                </p>
                            </div>
                        </div>
                        <button
                            className="btn font-weight-bolder mt-3 mt-md-0"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
                            onClick={cargarTodo}
                            disabled={cargando}
                        >
                            <i className={`fas fa-sync-alt mr-2 ${cargando ? 'fa-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── TARJETAS DE RESUMEN ── */}
            <div className="row mb-7">
                {[
                    { label: 'Modalidades', count: modalidades.filter((m) => m.activo).length, icon: 'fa-graduation-cap', color: THEME.accent },
                    { label: 'Niveles', count: niveles.filter((n) => n.activo).length, icon: 'fa-layer-group', color: THEME.secondary },
                    { label: 'Especialidades', count: especialidades.filter((e) => e.activo).length, icon: 'fa-folder', color: THEME.success },
                    { label: 'Características', count: caracteristicas.filter((c) => c.activo).length, icon: 'fa-tags', color: THEME.info },
                ].map((stat) => (
                    <div key={stat.label} className="col-6 col-md-3 mb-4 mb-md-0">
                        <div className="card card-custom border-0" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <div className="card-body p-5 d-flex align-items-center">
                                <div
                                    className="d-flex align-items-center justify-content-center rounded mr-4"
                                    style={{ width: 48, height: 48, backgroundColor: `${stat.color}15`, flexShrink: 0 }}
                                >
                                    <i className={`fas ${stat.icon}`} style={{ color: stat.color, fontSize: 20 }} />
                                </div>
                                <div>
                                    <div className="font-weight-bolder text-dark" style={{ fontSize: 24, lineHeight: 1 }}>
                                        {stat.count}
                                    </div>
                                    <div className="text-muted font-size-sm">{stat.label}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── CARD PRINCIPAL ── */}
            <div className="card card-custom">
                <div className="card-body px-8 py-7">

                    {/* TABS */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap mb-7">
                        <div className="d-flex" style={{ gap: 4 }}>
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setTabActivo(tab.id)}
                                    className="btn font-weight-bold font-size-sm"
                                    style={{
                                        backgroundColor: tabActivo === tab.id ? THEME.accent : 'transparent',
                                        color: tabActivo === tab.id ? '#fff' : THEME.muted,
                                        border: `1px solid ${tabActivo === tab.id ? THEME.accent : '#EBEDF3'}`,
                                        borderRadius: 8, padding: '8px 16px', transition: 'all 0.2s',
                                    }}
                                >
                                    <i className={`fas ${tab.icon} mr-2`} style={{ fontSize: 12 }} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <button
                            className="btn btn-primary font-weight-bolder mt-3 mt-md-0"
                            onClick={abrirCrear}
                        >
                            <i className="fas fa-plus mr-2" />
                            Nuevo {TABS.find((t) => t.id === tabActivo)?.label.slice(0, -1)}
                        </button>
                    </div>

                    {/* ══════════════════════════════════════════════════════
                        TAB: MODALIDADES
                    ══════════════════════════════════════════════════════ */}
                    {tabActivo === 'modalidades' && (
                        <div>
                            {cargando ? <SpinnerCarga texto="Cargando modalidades..." /> : (
                                modalidades.length === 0
                                    ? <EstadoVacio mensaje="Sin modalidades" submensaje="Crea la primera modalidad educativa." onAccion={abrirCrear} textoAccion="Crear modalidad" />
                                    : (
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F3F6F9' }}>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 pl-4">Nombre</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Código</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Descripción</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Orden</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Estado</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {modalidades.map((m) => (
                                                        <tr key={m.id}>
                                                            <td className="pl-4 font-weight-bolder text-dark align-middle">{m.nombre}</td>
                                                            <td className="align-middle">
                                                                <Badge label={m.codigo} bg={THEME.accentBg} color={THEME.accent} />
                                                            </td>
                                                            <td className="text-muted font-size-sm align-middle" style={{ maxWidth: 200 }}>
                                                                {m.descripcion || '—'}
                                                            </td>
                                                            <td className="text-center align-middle text-muted font-size-sm">{m.orden}</td>
                                                            <td className="text-center align-middle">
                                                                {m.activo
                                                                    ? <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                    : <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <button className="btn btn-icon btn-sm btn-light-primary mr-2" onClick={() => abrirEditar(m)} title="Editar">
                                                                    <i className="fas fa-pencil-alt" style={{ fontSize: 12 }} />
                                                                </button>
                                                                {m.activo && (
                                                                    <button className="btn btn-icon btn-sm btn-light-danger" onClick={() => eliminar(m)} title="Desactivar">
                                                                        <i className="fas fa-ban" style={{ fontSize: 12 }} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        TAB: NIVELES
                    ══════════════════════════════════════════════════════ */}
                    {tabActivo === 'niveles' && (
                        <div>
                            <div className="d-flex align-items-center mb-5" style={{ gap: 12 }}>
                                <label className="font-weight-bold text-dark font-size-sm mb-0 flex-shrink-0">
                                    Filtrar por modalidad:
                                </label>
                                <select
                                    className="form-control"
                                    style={{ maxWidth: 280 }}
                                    value={filtroModalidadNivel}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFiltroModalidadNivel(val)
                                    }}
                                >
                                    <option value="">Todas las modalidades</option>
                                    {modalidades.filter((m) => m.activo).map((m) => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {cargando ? <SpinnerCarga texto="Cargando niveles..." /> : (
                                nivelesFiltrados.length === 0
                                    ? <EstadoVacio mensaje="Sin niveles" submensaje="Crea el primer nivel educativo." onAccion={abrirCrear} textoAccion="Crear nivel" />
                                    : (
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F3F6F9' }}>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 pl-4">Nombre</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Código</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Modalidad</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Orden</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Estado</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {nivelesFiltrados.map((n) => (
                                                        <tr key={n.id}>
                                                            <td className="pl-4 font-weight-bolder text-dark align-middle">{n.nombre}</td>
                                                            <td className="align-middle">
                                                                <Badge label={n.codigo} bg={`${THEME.secondary}15`} color={THEME.secondary} />
                                                            </td>
                                                            <td className="align-middle">
                                                                <Badge label={getNombreModalidad(n.modalidad_id)} bg={THEME.accentBg} color={THEME.accent} />
                                                            </td>
                                                            <td className="text-center align-middle text-muted font-size-sm">{n.orden}</td>
                                                            <td className="text-center align-middle">
                                                                {n.activo
                                                                    ? <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                    : <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <button className="btn btn-icon btn-sm btn-light-primary mr-2" onClick={() => abrirEditar(n)} title="Editar">
                                                                    <i className="fas fa-pencil-alt" style={{ fontSize: 12 }} />
                                                                </button>
                                                                {n.activo && (
                                                                    <button className="btn btn-icon btn-sm btn-light-danger" onClick={() => eliminar(n)} title="Desactivar">
                                                                        <i className="fas fa-ban" style={{ fontSize: 12 }} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        TAB: ESPECIALIDADES
                    ══════════════════════════════════════════════════════ */}
                    {tabActivo === 'especialidades' && (
                        <div>
                            <div className="d-flex align-items-center flex-wrap mb-5" style={{ gap: 12 }}>
                                <label className="font-weight-bold text-dark font-size-sm mb-0 flex-shrink-0">Filtrar:</label>
                                <select
                                    className="form-control"
                                    style={{ maxWidth: 220 }}
                                    value={filtroModalidadEsp}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFiltroModalidadEsp(val)
                                        setFiltroNivelEsp('')
                                    }}
                                >
                                    <option value="">Todas las modalidades</option>
                                    {modalidades.filter((m) => m.activo).map((m) => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                                <select
                                    className="form-control"
                                    style={{ maxWidth: 220 }}
                                    value={filtroNivelEsp}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFiltroNivelEsp(val)
                                    }}
                                >
                                    <option value="">Todos los niveles</option>
                                    {(filtroModalidadEsp
                                        ? niveles.filter((n) => n.modalidad_id === Number(filtroModalidadEsp) && n.activo)
                                        : niveles.filter((n) => n.activo)
                                    ).map((n) => (
                                        <option key={n.id} value={n.id}>{n.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {cargando ? <SpinnerCarga texto="Cargando especialidades..." /> : (
                                especialidadesFiltradas.length === 0
                                    ? <EstadoVacio mensaje="Sin especialidades" submensaje="Crea la primera especialidad." onAccion={abrirCrear} textoAccion="Crear especialidad" />
                                    : (
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F3F6F9' }}>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 pl-4">Nombre</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Código</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Nivel</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Color</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Anexo 6</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Estado</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {especialidadesFiltradas.map((e) => (
                                                        <tr key={e.id}>
                                                            <td className="pl-4 font-weight-bolder text-dark align-middle">{e.nombre}</td>
                                                            <td className="align-middle">
                                                                <Badge label={e.codigo} bg="#F3F6F9" color="#3F4254" />
                                                            </td>
                                                            <td className="align-middle">
                                                                <Badge label={getNombreNivel(e.nivel_id)} bg={`${THEME.secondary}15`} color={THEME.secondary} />
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <div className="d-flex align-items-center justify-content-center" style={{ gap: 6 }}>
                                                                    <div style={{
                                                                        width: 20, height: 20, borderRadius: 4,
                                                                        backgroundColor: e.color_folder_hex || '#ccc',
                                                                        border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
                                                                    }} />
                                                                    <span className="text-muted font-size-xs">{e.color_folder || '—'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-center align-middle text-muted font-size-sm">
                                                                {e.anexo6_numero ? `Ítem ${e.anexo6_numero}` : '—'}
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                {e.activo
                                                                    ? <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                    : <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <button className="btn btn-icon btn-sm btn-light-primary mr-2" onClick={() => abrirEditar(e)} title="Editar">
                                                                    <i className="fas fa-pencil-alt" style={{ fontSize: 12 }} />
                                                                </button>
                                                                {e.activo && (
                                                                    <button className="btn btn-icon btn-sm btn-light-danger" onClick={() => eliminar(e)} title="Desactivar">
                                                                        <i className="fas fa-ban" style={{ fontSize: 12 }} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════
                        TAB: CARACTERÍSTICAS
                    ══════════════════════════════════════════════════════ */}
                    {tabActivo === 'caracteristicas' && (
                        <div>
                            {cargando ? <SpinnerCarga texto="Cargando características..." /> : (
                                caracteristicas.length === 0
                                    ? <EstadoVacio mensaje="Sin características" submensaje="Crea la primera característica." onAccion={abrirCrear} textoAccion="Crear característica" />
                                    : (
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#F3F6F9' }}>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 pl-4">Nombre</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Código</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0">Descripción</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Bilingüe</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Convenio</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Visible Docente</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Estado</th>
                                                        <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {caracteristicas.map((c) => (
                                                        <tr key={c.id}>
                                                            <td className="pl-4 font-weight-bolder text-dark align-middle">{c.nombre}</td>
                                                            <td className="align-middle">
                                                                <Badge label={c.codigo} bg={THEME.infoBg} color={THEME.info} />
                                                            </td>
                                                            <td className="text-muted font-size-sm align-middle" style={{ maxWidth: 200 }}>
                                                                {c.descripcion || '—'}
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                {c.es_bilingue
                                                                    ? <Badge label="Sí" bg={THEME.infoBg} color={THEME.info} />
                                                                    : <Badge label="No" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                {c.es_convenio
                                                                    ? <Badge label="Sí" bg={THEME.warningBg} color={THEME.warning} />
                                                                    : <Badge label="No" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            {/* ── Toggle Visible Docente ── */}
                                                            <td className="text-center align-middle">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-center"
                                                                    style={{ gap: 6, cursor: 'pointer' }}
                                                                    title={c.visible_docente ? 'Visible para docente — clic para ocultar' : 'Oculto para docente — clic para mostrar'}
                                                                    onClick={async () => {
                                                                        try {
                                                                            await axios.put(
                                                                                `${API_URL}/catalogo/caracteristicas/${c.id}`,
                                                                                { visible_docente: !c.visible_docente },
                                                                                { headers }
                                                                            )
                                                                            cargarCaracteristicas()
                                                                        } catch (err) {
                                                                            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar.', confirmButtonColor: THEME.accent })
                                                                        }
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        width: 36, height: 20, borderRadius: 10,
                                                                        background: c.visible_docente ? THEME.success : '#EBEDF3',
                                                                        position: 'relative', transition: 'background 0.2s',
                                                                        flexShrink: 0,
                                                                    }}>
                                                                        <div style={{
                                                                            width: 14, height: 14, borderRadius: '50%',
                                                                            background: '#fff',
                                                                            position: 'absolute',
                                                                            top: 3,
                                                                            left: c.visible_docente ? 19 : 3,
                                                                            transition: 'left 0.2s',
                                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                                        }} />
                                                                    </div>
                                                                    <span className="font-size-xs font-weight-bold"
                                                                        style={{ color: c.visible_docente ? THEME.success : THEME.muted }}>
                                                                        {c.visible_docente ? 'Visible' : 'Oculto'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                {c.activo
                                                                    ? <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                    : <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                                }
                                                            </td>
                                                            <td className="text-center align-middle">
                                                                <button className="btn btn-icon btn-sm btn-light-primary" onClick={() => abrirEditar(c)} title="Editar">
                                                                    <i className="fas fa-pencil-alt" style={{ fontSize: 12 }} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                MODAL — MODALIDAD
            ════════════════════════════════════════════════════ */}
            {modalAbierto && tabActivo === 'modalidades' && (
                <Modal
                    titulo={modoEditar ? 'Editar Modalidad' : 'Nueva Modalidad'}
                    onCerrar={cerrarModal}
                    onGuardar={guardar}
                    guardando={guardando}
                >
                    <div className="row">
                        <div className="col-md-8">
                            <Campo label="Nombre" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: Educación Básica Regular"
                                    value={formModalidad.nombre}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormModalidad((p) => ({ ...p, nombre: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-4">
                            <Campo label="Código" requerido ayuda="Se guardará en mayúsculas">
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: EBR"
                                    value={formModalidad.codigo}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase()
                                        setFormModalidad((p) => ({ ...p, codigo: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-12">
                            <Campo label="Descripción">
                                <textarea
                                    className="form-control mt-1" rows={3}
                                    placeholder="Descripción opcional de la modalidad"
                                    value={formModalidad.descripcion}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormModalidad((p) => ({ ...p, descripcion: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-4">
                            <Campo label="Orden de visualización">
                                <input
                                    type="number" className="form-control mt-1" min={1}
                                    value={formModalidad.orden}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setFormModalidad((p) => ({ ...p, orden: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-8">
                            <Campo label="Estado">
                                <div className="d-flex align-items-center mt-3" style={{ gap: 16 }}>
                                    {[{ val: true, label: 'Activo' }, { val: false, label: 'Inactivo' }].map((op) => (
                                        <label key={String(op.val)} className="d-flex align-items-center mb-0" style={{ cursor: 'pointer', gap: 8 }}>
                                            <input
                                                type="radio"
                                                checked={formModalidad.activo === op.val}
                                                onChange={() => setFormModalidad((p) => ({ ...p, activo: op.val }))}
                                            />
                                            <span className="font-weight-bold font-size-sm">{op.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Campo>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════════════════════════════════════════════════════
                MODAL — NIVEL
            ════════════════════════════════════════════════════ */}
            {modalAbierto && tabActivo === 'niveles' && (
                <Modal
                    titulo={modoEditar ? 'Editar Nivel' : 'Nuevo Nivel'}
                    onCerrar={cerrarModal}
                    onGuardar={guardar}
                    guardando={guardando}
                >
                    <div className="row">
                        <div className="col-md-12">
                            <Campo label="Modalidad" requerido>
                                {/* ✅ FIX: usa formNivel, no formEsp */}
                                <select
                                    className="form-control mt-1"
                                    value={formNivel.modalidad_id}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormNivel((p) => ({ ...p, modalidad_id: val }))
                                    }}
                                >
                                    <option value="">Selecciona una modalidad</option>
                                    {modalidades.filter((m) => m.activo).map((m) => (
                                        <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>
                                    ))}
                                </select>
                            </Campo>
                        </div>
                        <div className="col-md-8">
                            <Campo label="Nombre" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: Educación Inicial"
                                    value={formNivel.nombre}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormNivel((p) => ({ ...p, nombre: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-4">
                            <Campo label="Código" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: INICIAL"
                                    value={formNivel.codigo}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase()
                                        setFormNivel((p) => ({ ...p, codigo: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-12">
                            <Campo label="Descripción">
                                <textarea
                                    className="form-control mt-1" rows={2}
                                    placeholder="Descripción opcional"
                                    value={formNivel.descripcion}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormNivel((p) => ({ ...p, descripcion: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-4">
                            <Campo label="Orden">
                                <input
                                    type="number" className="form-control mt-1" min={1}
                                    value={formNivel.orden}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setFormNivel((p) => ({ ...p, orden: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-8">
                            <Campo label="Estado">
                                <div className="d-flex align-items-center mt-3" style={{ gap: 16 }}>
                                    {[{ val: true, label: 'Activo' }, { val: false, label: 'Inactivo' }].map((op) => (
                                        <label key={String(op.val)} className="d-flex align-items-center mb-0" style={{ cursor: 'pointer', gap: 8 }}>
                                            <input
                                                type="radio"
                                                checked={formNivel.activo === op.val}
                                                onChange={() => setFormNivel((p) => ({ ...p, activo: op.val }))}
                                            />
                                            <span className="font-weight-bold font-size-sm">{op.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Campo>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════════════════════════════════════════════════════
                MODAL — ESPECIALIDAD  ← ESTE FALTABA COMPLETAMENTE
            ════════════════════════════════════════════════════ */}
            {modalAbierto && tabActivo === 'especialidades' && (
                <Modal
                    titulo={modoEditar ? 'Editar Especialidad' : 'Nueva Especialidad'}
                    onCerrar={cerrarModal}
                    onGuardar={guardar}
                    guardando={guardando}
                >
                    <div className="row">
                        {/* Selector de Modalidad — filtra los niveles del siguiente select */}
                        <div className="col-md-6">
                            <Campo label="Modalidad" requerido>
                                <select
                                    className="form-control mt-1"
                                    value={formEsp._modalidadFiltro}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        // ✅ FIX: leer val ANTES del setState, resetear nivel_id
                                        setFormEsp((p) => ({ ...p, _modalidadFiltro: val, nivel_id: '' }))
                                    }}
                                >
                                    <option value="">Selecciona modalidad</option>
                                    {modalidades.filter((m) => m.activo).map((m) => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                            </Campo>
                        </div>

                        {/* Selector de Nivel — filtrado por modalidad elegida arriba */}
                        <div className="col-md-6">
                            <Campo label="Nivel" requerido>
                                <select
                                    className="form-control mt-1"
                                    value={formEsp.nivel_id}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormEsp((p) => ({ ...p, nivel_id: Number(val) }))
                                    }}
                                >
                                    <option value="">Selecciona nivel</option>
                                    {nivelesEnModalEsp.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {n.nombre}
                                        </option>
                                    ))}
                                </select>
                            </Campo>
                        </div>

                        {/* Nombre */}
                        <div className="col-md-8">
                            <Campo label="Nombre" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: Matemática"
                                    value={formEsp.nombre}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormEsp((p) => ({ ...p, nombre: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Código */}
                        <div className="col-md-4">
                            <Campo label="Código" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: MAT"
                                    value={formEsp.codigo}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase()
                                        setFormEsp((p) => ({ ...p, codigo: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Descripción */}
                        <div className="col-12">
                            <Campo label="Descripción">
                                <textarea
                                    className="form-control mt-1" rows={2}
                                    placeholder="Descripción opcional"
                                    value={formEsp.descripcion}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormEsp((p) => ({ ...p, descripcion: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Selector de color */}
                        <div className="col-12">
                            <Campo label="Color del folder" requerido ayuda="Color oficial del comunicado UGELAA para esta especialidad">
                                <SelectorColor
                                    valor={formEsp.color_folder_hex}
                                    onChange={(c) => setFormEsp((p) => ({
                                        ...p,
                                        color_folder: c.nombre,
                                        color_folder_hex: c.hex,
                                    }))}
                                />
                                <div className="d-flex align-items-center mt-2" style={{ gap: 8 }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 6,
                                        backgroundColor: formEsp.color_folder_hex,
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        flexShrink: 0,
                                    }} />
                                    <span className="font-weight-bold font-size-sm text-dark">
                                        {formEsp.color_folder} — {formEsp.color_folder_hex}
                                    </span>
                                </div>
                            </Campo>
                        </div>

                        {/* Anexo 6 número */}
                        <div className="col-md-4">
                            <Campo label="Ítem Anexo 6" ayuda="Número de ítem en el DS002-2025">
                                <input
                                    type="number" className="form-control mt-1" min={1}
                                    placeholder="Ej: 12"
                                    value={formEsp.anexo6_numero}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormEsp((p) => ({ ...p, anexo6_numero: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Anexo 6 descripción */}
                        <div className="col-md-8">
                            <Campo label="Descripción Anexo 6">
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Descripción exacta del Anexo 6"
                                    value={formEsp.anexo6_descripcion}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormEsp((p) => ({ ...p, anexo6_descripcion: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Orden */}
                        <div className="col-md-4">
                            <Campo label="Orden">
                                <input
                                    type="number" className="form-control mt-1" min={1}
                                    value={formEsp.orden}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        setFormEsp((p) => ({ ...p, orden: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Estado */}
                        <div className="col-md-8">
                            <Campo label="Estado">
                                <div className="d-flex align-items-center mt-3" style={{ gap: 16 }}>
                                    {[{ val: true, label: 'Activo' }, { val: false, label: 'Inactivo' }].map((op) => (
                                        <label
                                            key={String(op.val)}
                                            className="d-flex align-items-center mb-0"
                                            style={{ cursor: 'pointer', gap: 8 }}
                                        >
                                            <input
                                                type="radio"
                                                checked={formEsp.activo === op.val}
                                                onChange={() => setFormEsp((p) => ({ ...p, activo: op.val }))}
                                            />
                                            <span className="font-weight-bold font-size-sm">{op.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Campo>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════════════════════════════════════════════════════
                MODAL — CARACTERÍSTICA
            ════════════════════════════════════════════════════ */}
            {modalAbierto && tabActivo === 'caracteristicas' && (
                <Modal
                    titulo={modoEditar ? 'Editar Característica' : 'Nueva Característica'}
                    onCerrar={cerrarModal}
                    onGuardar={guardar}
                    guardando={guardando}
                >
                    <div className="row">
                        <div className="col-md-8">
                            <Campo label="Nombre" requerido>
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: Convenio"
                                    value={formCaract.nombre}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormCaract((p) => ({ ...p, nombre: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-md-4">
                            <Campo label="Código" requerido ayuda="Se guardará en mayúsculas">
                                <input
                                    type="text" className="form-control mt-1"
                                    placeholder="Ej: CONVENIO"
                                    value={formCaract.codigo}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase()
                                        setFormCaract((p) => ({ ...p, codigo: val }))
                                    }}
                                />
                            </Campo>
                        </div>
                        <div className="col-12">
                            <Campo label="Descripción">
                                <textarea
                                    className="form-control mt-1" rows={2}
                                    placeholder="Descripción opcional"
                                    value={formCaract.descripcion}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        setFormCaract((p) => ({ ...p, descripcion: val }))
                                    }}
                                />
                            </Campo>
                        </div>

                        {/* Toggles */}
                        <div className="col-12">
                            <div className="rounded p-5 mb-4" style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}>
                                <div className="font-weight-bolder text-dark font-size-sm mb-4">
                                    <i className="fas fa-sliders-h mr-2 text-primary" />
                                    Configuración de la característica
                                </div>
                                <div className="row">

                                    {/* Es Bilingüe */}
                                    <div className="col-md-4 mb-3">
                                        <div className="d-flex align-items-center justify-content-between p-3 rounded"
                                            style={{ background: formCaract.es_bilingue ? THEME.infoBg : '#fff', border: `1px solid ${formCaract.es_bilingue ? THEME.info : '#EBEDF3'}` }}>
                                            <div>
                                                <div className="font-weight-bold font-size-sm text-dark">Bilingüe</div>
                                                <div className="text-muted font-size-xs">Requiere notas de lengua</div>
                                            </div>
                                            <div
                                                style={{ width: 40, height: 22, borderRadius: 11, background: formCaract.es_bilingue ? THEME.info : '#EBEDF3', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                                                onClick={() => setFormCaract(p => ({ ...p, es_bilingue: !p.es_bilingue, es_convenio: false }))}
                                            >
                                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: formCaract.es_bilingue ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Es Convenio */}
                                    <div className="col-md-4 mb-3">
                                        <div className="d-flex align-items-center justify-content-between p-3 rounded"
                                            style={{ background: formCaract.es_convenio ? THEME.warningBg : '#fff', border: `1px solid ${formCaract.es_convenio ? THEME.warning : '#EBEDF3'}` }}>
                                            <div>
                                                <div className="font-weight-bold font-size-sm text-dark">Convenio</div>
                                                <div className="text-muted font-size-xs">Requiere documento</div>
                                            </div>
                                            <div
                                                style={{ width: 40, height: 22, borderRadius: 11, background: formCaract.es_convenio ? THEME.warning : '#EBEDF3', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                                                onClick={() => setFormCaract(p => ({ ...p, es_convenio: !p.es_convenio, es_bilingue: false }))}
                                            >
                                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: formCaract.es_convenio ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visible Docente */}
                                    <div className="col-md-4 mb-3">
                                        <div className="d-flex align-items-center justify-content-between p-3 rounded"
                                            style={{ background: formCaract.visible_docente ? THEME.successBg : '#F3F6F9', border: `1px solid ${formCaract.visible_docente ? THEME.success : '#EBEDF3'}` }}>
                                            <div>
                                                <div className="font-weight-bold font-size-sm text-dark">Visible docente</div>
                                                <div className="text-muted font-size-xs">Aparece en el wizard</div>
                                            </div>
                                            <div
                                                style={{ width: 40, height: 22, borderRadius: 11, background: formCaract.visible_docente ? THEME.success : '#EBEDF3', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
                                                onClick={() => setFormCaract(p => ({ ...p, visible_docente: !p.visible_docente }))}
                                            >
                                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: formCaract.visible_docente ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="col-12">
                            <Campo label="Estado">
                                <div className="d-flex align-items-center mt-2" style={{ gap: 16 }}>
                                    {[{ val: true, label: 'Activo' }, { val: false, label: 'Inactivo' }].map((op) => (
                                        <label key={String(op.val)} className="d-flex align-items-center mb-0" style={{ cursor: 'pointer', gap: 8 }}>
                                            <input
                                                type="radio" name="caract_activo"
                                                checked={formCaract.activo === op.val}
                                                onChange={() => setFormCaract(p => ({ ...p, activo: op.val }))}
                                            />
                                            <span className="font-weight-bold font-size-sm">{op.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </Campo>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default CatalogoPanelPage