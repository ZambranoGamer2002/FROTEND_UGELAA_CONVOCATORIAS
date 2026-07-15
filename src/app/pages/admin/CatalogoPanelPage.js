/**
 * CatalogoPanelPage.js — v2 CORREGIDO
 * Panel SuperAdmin para gestionar:
 * Modalidades → Niveles → Especialidades → Características
 */
import React, { useState, useEffect, useMemo } from 'react'
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

const ESTADOS_MATRIZ = {
    BORRADOR: { label: 'Borrador', bg: '#FFF4DE', color: '#FFA800', icon: 'fa-edit' },
    PUBLICADA: { label: 'Publicada', bg: '#E8FFF3', color: '#1BC5BD', icon: 'fa-check-circle' },
    CERRADA: { label: 'Cerrada', bg: '#F3F6F9', color: '#7E8299', icon: 'fa-lock' },
}

const ALCANCES_MATRIZ = {
    GLOBAL: { label: 'Global', bg: '#EEF6FF', color: '#3699FF' },
    PROVINCIA: { label: 'Provincia / UGEL', bg: '#EEE5FF', color: '#8950FC' },
    CONVOCATORIA: { label: 'Convocatoria', bg: '#FFF4DE', color: '#FFA800' },
}

const EstadoMatrizBadge = ({ estado }) => {
    const c = ESTADOS_MATRIZ[estado] || ESTADOS_MATRIZ.BORRADOR

    return (
        <span
            className="label label-inline font-weight-bold"
            style={{ background: c.bg, color: c.color }}
        >
            <i className={`fas ${c.icon} mr-1`} />
            {c.label}
        </span>
    )
}

const AlcanceMatrizBadge = ({ alcance }) => {
    const c = ALCANCES_MATRIZ[alcance] || ALCANCES_MATRIZ.GLOBAL

    return (
        <span
            className="label label-inline font-weight-bold"
            style={{ background: c.bg, color: c.color }}
        >
            {c.label}
        </span>
    )
}

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
    { id: 'matrices', label: 'Matrices de Plaza', icon: 'fa-sitemap' },
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
    const auth = useSelector((state) => state.auth)
    const token = useToken()
    const headers = { Authorization: `Bearer ${token}` }

    const [tabActivo, setTabActivo] = useState('modalidades')

    const [roleInfo, setRoleInfo] = useState(null)
    const [provinciaUsuarioId, setProvinciaUsuarioId] = useState(null)
    const [provinciaUsuarioNombre, setProvinciaUsuarioNombre] = useState('')

    const [vistaCatalogoBase, setVistaCatalogoBase] = useState('modalidades')

    const [filtrosMatriz, setFiltrosMatriz] = useState({
        modalidad_id: '',
        nivel_id: '',
        especialidad_id: '',
    })

    const [modalidades, setModalidades] = useState([])
    const [niveles, setNiveles] = useState([])
    const [especialidades, setEspecialidades] = useState([])
    const [caracteristicas, setCaracteristicas] = useState([])

    const [matrices, setMatrices] = useState([])
    const [anioMatriz, setAnioMatriz] = useState(new Date().getFullYear())
    const [matrizSeleccionada, setMatrizSeleccionada] = useState(null)
    const [itemsMatriz, setItemsMatriz] = useState([])
    const [modalItemsMatrizAbierto, setModalItemsMatrizAbierto] = useState(false)
    const [cargandoItemsMatriz, setCargandoItemsMatriz] = useState(false)

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
        nombre: '',
        codigo: '',
        descripcion: '',
        orden: 1,
        activo: true,
    }

    const FORM_NIVEL_VACIO = {
        nombre: '',
        codigo: '',
        descripcion: '',
        modalidad_id: '',
        orden: 1,
        activo: true,
    }

    // _modalidadFiltro es campo auxiliar de UI, no se envía al backend
    const FORM_ESP_VACIO = {
        nombre: '',
        codigo: '',
        descripcion: '',
        nivel_id: '',
        _modalidadFiltro: '',
        color_folder: 'AMARILLO',
        color_folder_hex: '#FFD700',
        color_folder_rgb: '',
        anexo6_numero: '',
        anexo6_descripcion: '',
        orden: 1,
        activo: true,
    }

    const FORM_CARACT_VACIO = {
        nombre: '',
        codigo: '',
        descripcion: '',
        es_bilingue: false,
        es_convenio: false,
        activo: true,
        visible_docente: true,
    }

    const FORM_ITEM_MATRIZ_VACIO = {
        id: null,
        modalidad_id: '',
        nivel_id: '',
        especialidad_id: '',
        caracteristica_id: '',
        orden: 1,
        observaciones: '',
        activo: true,
    }

    const [formModalidad, setFormModalidad] = useState(FORM_MODALIDAD_VACIO)
    const [formNivel, setFormNivel] = useState(FORM_NIVEL_VACIO)
    const [formEsp, setFormEsp] = useState(FORM_ESP_VACIO)
    const [formCaract, setFormCaract] = useState(FORM_CARACT_VACIO)

    const [mostrarPanelItemMatriz, setMostrarPanelItemMatriz] = useState(false)
    const [guardandoItemMatriz, setGuardandoItemMatriz] = useState(false)
    const [editandoItemMatriz, setEditandoItemMatriz] = useState(false)
    const [formItemMatriz, setFormItemMatriz] = useState(FORM_ITEM_MATRIZ_VACIO)

    // ═══════════════════════════════════════════════════════════════════════════
    // CARGA DE DATOS
    // ═══════════════════════════════════════════════════════════════════════════
    useEffect(() => { cargarTodo() }, []) // eslint-disable-line

    const cargarRol = async () => {
        if (!token) return null

        try {
            const resp = await fetch(`${API_URL}/roles/mis-permisos`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (!resp.ok) return null

            const data = await resp.json()

            const provinciaId =
                data?.usuario?.provincia_id ||
                data?.user?.provincia_id ||
                data?.provincia_id ||
                auth?.user?.provincia_id ||
                auth?.user?.usuario?.provincia_id ||
                null

            const provinciaNombre =
                data?.usuario?.provincia_nombre ||
                data?.user?.provincia_nombre ||
                data?.provincia_nombre ||
                auth?.user?.provincia_nombre ||
                auth?.user?.usuario?.provincia_nombre ||
                ''

            setRoleInfo(data.role || null)
            setProvinciaUsuarioId(provinciaId)
            setProvinciaUsuarioNombre(provinciaNombre)

            return {
                role: data.role || null,
                provincia_id: provinciaId,
                provincia_nombre: provinciaNombre,
            }
        } catch (err) {
            console.warn('No se pudo cargar rol para catálogo:', err)
            return null
        }
    }

    const cargarTodo = async () => {
        setCargando(true)
        try {
            await cargarRol()

            await Promise.all([
                cargarModalidades(),
                cargarNiveles(),
                cargarEspecialidades(),
                cargarCaracteristicas(),
                cargarMatrices(),
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

    const cargarMatrices = async () => {
        try {
            const resp = await axios.get(`${API_URL}/catalogo/plaza/matrices`, {
                headers,
                params: {
                    anio: anioMatriz || undefined,
                },
            })

            const data = resp.data
            const lista = Array.isArray(data) ? data : data.data || []

            setMatrices(lista)

            if (lista.length > 0) {
                const actual = matrizSeleccionada?.id
                    ? lista.find((m) => Number(m.id) === Number(matrizSeleccionada.id))
                    : null

                await seleccionarMatriz(actual || lista[0])
            } else {
                setMatrizSeleccionada(null)
                setItemsMatriz([])
            }
        } catch (err) {
            console.error('Error matrices de plaza:', err)
        }
    }

    const inicializarMatrizGlobal = async () => {
        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Inicializar matriz global',
            html: `
            <div style="text-align:left;font-size:14px;color:#3F4254">
                Se creará una matriz global usando el catálogo actual de modalidades,
                niveles, especialidades y características activas.
                <br/><br/>
                <strong>Año:</strong> ${anioMatriz}
            </div>
        `,
            showCancelButton: true,
            confirmButtonColor: THEME.accent,
            cancelButtonColor: THEME.muted,
            confirmButtonText: 'Sí, inicializar',
            cancelButtonText: 'Cancelar',
        })

        if (!resultado.isConfirmed) return

        try {
            setCargando(true)

            await axios.post(`${API_URL}/catalogo/plaza/inicializar-global`, null, {
                headers,
                params: {
                    anio: anioMatriz,
                    nombre: `Matriz Global de Catálogo de Plaza ${anioMatriz}`,
                    publicar: true,
                },
            })

            await Swal.fire({
                icon: 'success',
                title: 'Matriz inicializada',
                text: 'La matriz global fue creada o ya existía correctamente.',
                confirmButtonColor: THEME.accent,
                timer: 2200,
                showConfirmButton: false,
            })

            await cargarMatrices()
        } catch (err) {
            const msg = err.response?.data?.detail || 'No se pudo inicializar la matriz global.'
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.accent,
            })
        } finally {
            setCargando(false)
        }
    }

    const verItemsMatriz = async (matriz) => {
        setMatrizSeleccionada(matriz)
        setItemsMatriz([])
        setModalItemsMatrizAbierto(true)
        setCargandoItemsMatriz(true)

        try {
            const resp = await axios.get(`${API_URL}/catalogo/plaza/matrices/${matriz.id}/items`, {
                headers,
                params: {
                    solo_activos: true,
                },
            })

            const data = resp.data
            setItemsMatriz(Array.isArray(data) ? data : data.data || [])
        } catch (err) {
            const msg = err.response?.data?.detail || 'No se pudieron cargar los items de la matriz.'
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.accent,
            })
        } finally {
            setCargandoItemsMatriz(false)
        }
    }

    const cerrarModalItemsMatriz = () => {
        setModalItemsMatrizAbierto(false)
        setMatrizSeleccionada(null)
        setItemsMatriz([])
    }

    const seleccionarMatriz = async (matriz) => {
        if (!matriz?.id) return

        setMatrizSeleccionada(matriz)
        setItemsMatriz([])
        setCargandoItemsMatriz(true)

        try {
            const resp = await axios.get(`${API_URL}/catalogo/plaza/matrices/${matriz.id}/items`, {
                headers,
                params: {
                    solo_activos: false,
                },
            })

            const data = resp.data
            setItemsMatriz(Array.isArray(data) ? data : data.data || [])
        } catch (err) {
            const msg = err.response?.data?.detail || 'No se pudieron cargar las combinaciones de la matriz.'
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.accent,
            })
        } finally {
            setCargandoItemsMatriz(false)
        }
    }

    const clonarMatrizAProvincia = async (matriz) => {
        if (!matriz?.id) return

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Clonar matriz a provincia',
            html: `
            <div style="text-align:left;font-size:14px;color:#3F4254">
                Se creará una matriz provincial usando como base:
                <br/>
                <strong>${matriz.nombre}</strong>
                <br/><br/>

                <label style="font-weight:600;margin-bottom:6px;display:block">
                    ID de provincia
                </label>
                <input 
                    id="provincia_id_clonar" 
                    type="number" 
                    class="swal2-input" 
                    placeholder="Ej: 1"
                    style="margin:0;width:100%"
                />

                <small style="display:block;margin-top:8px;color:#7E8299">
                    Por ahora ingresa el ID de la provincia. Luego lo conectamos a un selector visual.
                </small>
            </div>
        `,
            showCancelButton: true,
            confirmButtonColor: THEME.accent,
            cancelButtonColor: THEME.muted,
            confirmButtonText: 'Clonar matriz',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const provinciaId = document.getElementById('provincia_id_clonar')?.value

                if (!provinciaId || Number(provinciaId) <= 0) {
                    Swal.showValidationMessage('Debes ingresar un ID de provincia válido.')
                    return false
                }

                return Number(provinciaId)
            },
        })

        if (!resultado.isConfirmed) return

        try {
            setCargando(true)

            await axios.post(
                `${API_URL}/catalogo/plaza/matrices/${matriz.id}/clonar-provincia`,
                {
                    provincia_id: resultado.value,
                    anio: matriz.anio || anioMatriz,
                    nombre: `Matriz Provincial de Catálogo de Plaza ${matriz.anio || anioMatriz}`,
                    publicar: true,
                },
                { headers }
            )

            await Swal.fire({
                icon: 'success',
                title: 'Matriz provincial creada',
                text: 'La matriz fue clonada correctamente para la provincia seleccionada.',
                confirmButtonColor: THEME.accent,
                timer: 2200,
                showConfirmButton: false,
            })

            await cargarMatrices()
        } catch (err) {
            const msg = err.response?.data?.detail || 'No se pudo clonar la matriz a provincia.'

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.accent,
            })
        } finally {
            setCargando(false)
        }
    }

    const crearMatrizProvincialDesdeGlobal = async () => {
        if (!esAdmin) return

        if (!provinciaUsuarioId) {
            Swal.fire({
                icon: 'warning',
                title: 'Provincia no asignada',
                text: 'Tu usuario administrador no tiene provincia asignada. No se puede crear una matriz provincial.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        if (!matrizGlobalPublicada?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin matriz global publicada',
                text: 'Primero debe existir una matriz global publicada para usarla como referencia.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        if (matrizProvincialUsuario?.id) {
            Swal.fire({
                icon: 'info',
                title: 'Matriz provincial existente',
                text: 'Tu provincia ya tiene una matriz provincial activa. Puedes trabajar sobre esa matriz.',
                confirmButtonColor: THEME.accent,
            })

            await seleccionarMatriz(matrizProvincialUsuario)
            return
        }

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Crear matriz provincial',
            html: `
            <div style="text-align:left;font-size:14px;color:#3F4254">
                Se creará una matriz provincial usando como base:
                <br/>
                <strong>${matrizGlobalPublicada.nombre}</strong>
                <br/><br/>
                <strong>Provincia:</strong> ${provinciaUsuarioNombre || `ID ${provinciaUsuarioId}`}
                <br/><br/>
                Luego podrás adaptar las combinaciones solo para tu provincia.
            </div>
        `,
            showCancelButton: true,
            confirmButtonColor: THEME.accent,
            cancelButtonColor: THEME.muted,
            confirmButtonText: 'Crear matriz provincial',
            cancelButtonText: 'Cancelar',
        })

        if (!resultado.isConfirmed) return

        try {
            setCargando(true)

            await axios.post(
                `${API_URL}/catalogo/plaza/matrices/${matrizGlobalPublicada.id}/clonar-provincia`,
                {
                    provincia_id: Number(provinciaUsuarioId),
                    anio: matrizGlobalPublicada.anio || anioMatriz,
                    nombre: `Matriz Provincial de Catálogo de Plaza ${matrizGlobalPublicada.anio || anioMatriz}`,
                    publicar: true,
                },
                { headers }
            )

            await Swal.fire({
                icon: 'success',
                title: 'Matriz provincial creada',
                text: 'Ahora puedes adaptar las combinaciones de plaza para tu provincia.',
                confirmButtonColor: THEME.success,
                timer: 2200,
                showConfirmButton: false,
            })

            await cargarMatrices()
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'No se pudo crear la matriz provincial.'

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.danger,
            })
        } finally {
            setCargando(false)
        }
    }

    const editarEstadoMatriz = async (matriz) => {
        if (!matriz?.id) return

        const resultado = await Swal.fire({
            icon: 'question',
            title: 'Editar estado de matriz',
            html: `
            <div style="text-align:left;font-size:14px;color:#3F4254">
                <div style="margin-bottom:12px">
                    <strong>${matriz.nombre || 'Matriz seleccionada'}</strong>
                </div>

                <label style="font-weight:600;margin-bottom:6px;display:block">
                    Estado
                </label>

                <select id="estado_matriz_select" class="swal2-input" style="margin:0;width:100%">
                    <option value="BORRADOR" ${matriz.estado === 'BORRADOR' ? 'selected' : ''}>Borrador</option>
                    <option value="PUBLICADA" ${matriz.estado === 'PUBLICADA' ? 'selected' : ''}>Publicada</option>
                    <option value="CERRADA" ${matriz.estado === 'CERRADA' ? 'selected' : ''}>Cerrada</option>
                </select>

                <label style="display:flex;align-items:center;gap:8px;margin-top:16px;font-weight:600">
                    <input 
                        id="activo_matriz_check" 
                        type="checkbox" 
                        ${matriz.activo ? 'checked' : ''}
                    />
                    Matriz activa
                </label>

                <small style="display:block;margin-top:12px;color:#7E8299;line-height:1.5">
                    Una matriz publicada puede ser usada por el sistema. 
                    Una matriz cerrada bloquea cambios y sirve como histórico.
                </small>
            </div>
        `,
            showCancelButton: true,
            confirmButtonColor: THEME.accent,
            cancelButtonColor: THEME.muted,
            confirmButtonText: 'Guardar cambios',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const estado = document.getElementById('estado_matriz_select')?.value
                const activo = document.getElementById('activo_matriz_check')?.checked

                if (!estado) {
                    Swal.showValidationMessage('Selecciona un estado válido.')
                    return false
                }

                return {
                    estado,
                    activo,
                }
            },
        })

        if (!resultado.isConfirmed) return

        try {
            setCargando(true)

            await axios.put(
                `${API_URL}/catalogo/plaza/matrices/${matriz.id}`,
                {
                    estado: resultado.value.estado,
                    activo: resultado.value.activo,
                },
                { headers }
            )

            await Swal.fire({
                icon: 'success',
                title: 'Matriz actualizada',
                text: 'El estado de la matriz fue actualizado correctamente.',
                confirmButtonColor: THEME.success,
                timer: 2000,
                showConfirmButton: false,
            })

            await cargarMatrices()
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'No se pudo actualizar la matriz.'

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.danger,
            })
        } finally {
            setCargando(false)
        }
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

    const abrirPanelNuevoItemMatriz = () => {
        if (!matrizSeleccionada?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona una matriz',
                text: 'Primero selecciona una matriz para agregar combinaciones.',
                confirmButtonColor: THEME.accent,
            })
            return
        }

        if (matrizSeleccionada.estado === 'CERRADA') {
            Swal.fire({
                icon: 'warning',
                title: 'Matriz cerrada',
                text: 'No puedes agregar combinaciones a una matriz cerrada.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        if (!puedeEditarCombinaciones(matrizSeleccionada)) {
            Swal.fire({
                icon: 'warning',
                title: 'Acción no permitida',
                text: esAdmin
                    ? 'Solo puedes modificar tu matriz provincial. La matriz global es solo referencia.'
                    : 'No puedes modificar esta matriz.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        setEditandoItemMatriz(false)
        setFormItemMatriz(FORM_ITEM_MATRIZ_VACIO)
        setMostrarPanelItemMatriz(true)
    }

    const cerrarPanelItemMatriz = () => {
        setMostrarPanelItemMatriz(false)
        setEditandoItemMatriz(false)
        setFormItemMatriz(FORM_ITEM_MATRIZ_VACIO)
    }

    const abrirEditarItemMatriz = (item) => {
        if (!item?.id) return

        if (matrizSeleccionada?.estado === 'CERRADA') {
            Swal.fire({
                icon: 'warning',
                title: 'Matriz cerrada',
                text: 'No puedes editar combinaciones de una matriz cerrada.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        setEditandoItemMatriz(true)

        setFormItemMatriz({
            id: item.id,
            modalidad_id: item.modalidad_id || '',
            nivel_id: item.nivel_id || '',
            especialidad_id: item.especialidad_id || '',
            caracteristica_id: item.caracteristica_id || '',
            orden: item.orden || 1,
            observaciones: item.observaciones || '',
            activo: item.activo !== false,
        })

        setMostrarPanelItemMatriz(true)
    }

    const actualizarCampoItemMatriz = (campo, valor) => {
        setFormItemMatriz((prev) => {
            const nuevo = {
                ...prev,
                [campo]: valor,
            }

            if (campo === 'modalidad_id') {
                nuevo.nivel_id = ''
                nuevo.especialidad_id = ''
                nuevo.caracteristica_id = ''
            }

            if (campo === 'nivel_id') {
                nuevo.especialidad_id = ''
                nuevo.caracteristica_id = ''
            }

            if (campo === 'especialidad_id') {
                nuevo.caracteristica_id = ''
            }

            return nuevo
        })
    }

    const validarItemMatriz = () => {
        if (!matrizSeleccionada?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Matriz requerida',
                text: 'Selecciona una matriz antes de agregar una combinación.',
                confirmButtonColor: THEME.accent,
            })
            return false
        }

        if (
            !formItemMatriz.modalidad_id ||
            !formItemMatriz.nivel_id ||
            !formItemMatriz.especialidad_id ||
            !formItemMatriz.caracteristica_id
        ) {
            Swal.fire({
                icon: 'warning',
                title: 'Combinación incompleta',
                text: 'Selecciona modalidad, nivel, especialidad y característica.',
                confirmButtonColor: THEME.accent,
            })
            return false
        }

        return true
    }

    const guardarItemMatriz = async () => {
        if (!validarItemMatriz()) return

        if (!puedeEditarCombinaciones(matrizSeleccionada)) {
            Swal.fire({
                icon: 'warning',
                title: 'Acción no permitida',
                text: esAdmin
                    ? 'Solo puedes modificar tu matriz provincial. La matriz global es solo referencia.'
                    : 'No puedes modificar esta matriz.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        if (editandoItemMatriz && formItemMatriz.caracteristica_id === 'TODAS') {
            Swal.fire({
                icon: 'warning',
                title: 'Edición no permitida',
                text: 'La opción “Todas las características” solo se usa para crear nuevas combinaciones.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        const listaCaracteristicasGuardar =
            formItemMatriz.caracteristica_id === 'TODAS'
                ? caracteristicasFormItem
                : caracteristicasFormItem.filter(
                    (c) => Number(c.id) === Number(formItemMatriz.caracteristica_id)
                )

        if (!listaCaracteristicasGuardar.length) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin características',
                text: 'No se encontraron características activas para guardar.',
                confirmButtonColor: THEME.warning,
            })
            return
        }

        try {
            setGuardandoItemMatriz(true)

            let creadas = 0
            let omitidas = 0
            let errores = 0

            for (const caracteristica of listaCaracteristicasGuardar) {
                const payload = {
                    modalidad_id: Number(formItemMatriz.modalidad_id),
                    nivel_id: Number(formItemMatriz.nivel_id),
                    especialidad_id: Number(formItemMatriz.especialidad_id),
                    caracteristica_id: Number(caracteristica.id),
                    orden: Number(formItemMatriz.orden || 1),
                    observaciones: formItemMatriz.observaciones || null,
                    activo: formItemMatriz.activo !== false,
                    es_agregado_local: matrizSeleccionada?.alcance !== 'GLOBAL',
                }

                try {
                    if (editandoItemMatriz && formItemMatriz.id) {
                        await axios.put(
                            `${API_URL}/catalogo/plaza/items/${formItemMatriz.id}`,
                            payload,
                            { headers }
                        )
                    } else {
                        await axios.post(
                            `${API_URL}/catalogo/plaza/matrices/${matrizSeleccionada.id}/items`,
                            payload,
                            { headers }
                        )
                    }

                    creadas += 1
                } catch (err) {
                    const detalle = String(err.response?.data?.detail || '').toLowerCase()

                    if (
                        detalle.includes('ya existe') ||
                        detalle.includes('duplicado') ||
                        detalle.includes('combinación ya existe')
                    ) {
                        omitidas += 1
                    } else {
                        errores += 1
                    }
                }
            }

            cerrarPanelItemMatriz()

            await seleccionarMatriz(matrizSeleccionada)
            await cargarMatrices()

            await Swal.fire({
                icon: errores > 0 ? 'warning' : 'success',
                title: errores > 0 ? 'Proceso completado con observaciones' : 'Combinaciones guardadas',
                html: `
                <div style="text-align:left;font-size:14px;color:#3F4254">
                    <strong>Guardadas:</strong> ${creadas}<br/>
                    <strong>Omitidas por duplicado:</strong> ${omitidas}<br/>
                    <strong>Errores:</strong> ${errores}
                </div>
            `,
                confirmButtonColor: errores > 0 ? THEME.warning : THEME.success,
            })
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'No se pudo guardar la combinación.'

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.danger,
            })
        } finally {
            setGuardandoItemMatriz(false)
        }
    }

    const cambiarEstadoItemMatriz = async (item) => {
        const activar = item.activo !== true
        const accionTexto = activar ? 'reactivar' : 'desactivar'

        const resultado = await Swal.fire({
            icon: activar ? 'question' : 'warning',
            title: activar ? '¿Reactivar combinación?' : '¿Desactivar combinación?',
            text: activar
                ? 'La combinación volverá a estar disponible en esta matriz.'
                : 'La combinación dejará de estar disponible para la selección de plaza.',
            showCancelButton: true,
            confirmButtonColor: activar ? THEME.success : THEME.danger,
            cancelButtonColor: THEME.muted,
            confirmButtonText: activar ? 'Sí, reactivar' : 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
        })

        if (!resultado.isConfirmed) return

        try {
            await axios.put(
                `${API_URL}/catalogo/plaza/items/${item.id}`,
                { activo: activar },
                { headers }
            )

            await Swal.fire({
                icon: 'success',
                title: activar ? 'Combinación reactivada' : 'Combinación desactivada',
                text: `La combinación fue ${accionTexto} correctamente.`,
                confirmButtonColor: THEME.success,
                timer: 1800,
                showConfirmButton: false,
            })

            await seleccionarMatriz(matrizSeleccionada)
            await cargarMatrices()
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                `No se pudo ${accionTexto} la combinación.`

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                confirmButtonColor: THEME.danger,
            })
        }
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
                    Swal.fire({
                        icon: 'warning',
                        title: 'Campos requeridos',
                        text: 'Nombre, código y nivel son obligatorios.',
                        confirmButtonColor: THEME.accent,
                    })
                    return
                }

                const { _modalidadFiltro, ...payloadEsp } = formEsp
                payload = payloadEsp

                if (esAdmin) {
                    url = modoEditar
                        ? `${API_URL}/catalogo/especialidades-gestion/${itemEditar.id}`
                        : `${API_URL}/catalogo/especialidades-provinciales`
                } else {
                    url = modoEditar
                        ? `${API_URL}/catalogo/especialidades-gestion/${itemEditar.id}`
                        : `${API_URL}/catalogo/especialidades`
                }
            }

            if (tabActivo === 'caracteristicas') {
                if (!formCaract.nombre || !formCaract.codigo) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Campos requeridos',
                        text: 'Nombre y código son obligatorios.',
                        confirmButtonColor: THEME.accent,
                    })
                    return
                }

                payload = formCaract

                if (esAdmin) {
                    url = modoEditar
                        ? `${API_URL}/catalogo/caracteristicas-gestion/${itemEditar.id}`
                        : `${API_URL}/catalogo/caracteristicas-provinciales`
                } else {
                    url = modoEditar
                        ? `${API_URL}/catalogo/caracteristicas-gestion/${itemEditar.id}`
                        : `${API_URL}/catalogo/caracteristicas`
                }
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
            if (tabActivo === 'especialidades') {
                if (esAdmin) {
                    await axios.put(
                        `${API_URL}/catalogo/especialidades-gestion/${item.id}`,
                        { activo: false },
                        { headers }
                    )
                } else {
                    await axios.delete(`${API_URL}/catalogo/especialidades/${item.id}`, { headers })
                }
            } else {
                await axios.delete(url, { headers })
            }

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

    const roleNivel = Number(
        roleInfo?.nivel ||
        auth?.user?.role_nivel ||
        auth?.user?.role?.nivel ||
        5
    )

    const esSuperAdmin = roleNivel === 1
    const esAdmin = roleNivel === 2

    const esMatrizGlobal = (matriz) => matriz?.alcance === 'GLOBAL'

    const esMatrizProvincialPropia = (matriz) => {
        return (
            matriz?.alcance === 'PROVINCIA' &&
            Number(matriz?.provincia_id) === Number(provinciaUsuarioId)
        )
    }

    const puedeInicializarGlobal = esSuperAdmin

    const puedeEditarMatriz = (matriz) => {
        if (!matriz) return false
        if (esSuperAdmin) return true
        if (esAdmin) return esMatrizProvincialPropia(matriz)
        return false
    }

    const puedeEditarCombinaciones = (matriz) => {
        if (!matriz) return false
        if (matriz.estado === 'CERRADA') return false
        if (esSuperAdmin) return true
        if (esAdmin) return esMatrizProvincialPropia(matriz)
        return false
    }

    const puedeEditarCatalogoBase = (tipo, item = null) => {
        if (esSuperAdmin) return true

        if (esAdmin) {
            if (tipo === 'modalidades') return false
            if (tipo === 'niveles') return false

            if (tipo === 'especialidades' || tipo === 'caracteristicas') {
                if (!item) return true

                return (
                    item.alcance === 'PROVINCIA' &&
                    Number(item.provincia_id) === Number(provinciaUsuarioId)
                )
            }
        }

        return false
    }

    const matrizGlobalPublicada = matrices.find(
        (m) => m.alcance === 'GLOBAL' && m.estado === 'PUBLICADA' && m.activo
    )

    const matrizProvincialUsuario = matrices.find(
        (m) =>
            m.alcance === 'PROVINCIA' &&
            Number(m.provincia_id) === Number(provinciaUsuarioId) &&
            m.activo
    )

    const getNombreEspecialidad = (id) => {
        return especialidades.find((e) => Number(e.id) === Number(id))?.nombre || '—'
    }

    const totalMatricesGlobales = useMemo(
        () => matrices.filter((m) => m.alcance === 'GLOBAL').length,
        [matrices]
    )

    const totalMatricesProvinciales = useMemo(
        () => matrices.filter((m) => m.alcance === 'PROVINCIA').length,
        [matrices]
    )

    const totalMatricesPublicadas = useMemo(
        () => matrices.filter((m) => m.estado === 'PUBLICADA').length,
        [matrices]
    )

    const totalMatricesBorrador = useMemo(
        () => matrices.filter((m) => m.estado === 'BORRADOR').length,
        [matrices]
    )

    const nivelesFiltroMatriz = filtrosMatriz.modalidad_id
        ? niveles.filter((n) => Number(n.modalidad_id) === Number(filtrosMatriz.modalidad_id))
        : []

    const especialidadesFiltroMatriz = filtrosMatriz.nivel_id
        ? especialidades.filter((e) => Number(e.nivel_id) === Number(filtrosMatriz.nivel_id))
        : []

    const itemsMatrizFiltrados = useMemo(() => {
        return itemsMatriz.filter((item) => {
            if (filtrosMatriz.modalidad_id && Number(item.modalidad_id) !== Number(filtrosMatriz.modalidad_id)) {
                return false
            }

            if (filtrosMatriz.nivel_id && Number(item.nivel_id) !== Number(filtrosMatriz.nivel_id)) {
                return false
            }

            if (filtrosMatriz.especialidad_id && Number(item.especialidad_id) !== Number(filtrosMatriz.especialidad_id)) {
                return false
            }

            return true
        })
    }, [itemsMatriz, filtrosMatriz])

    const modalidadFormItem = modalidades.find(
        (m) => Number(m.id) === Number(formItemMatriz.modalidad_id)
    )

    const nivelesFormItem = modalidadFormItem
        ? niveles.filter((n) => n.activo && Number(n.modalidad_id) === Number(modalidadFormItem.id))
        : []

    const nivelFormItem = nivelesFormItem.find(
        (n) => Number(n.id) === Number(formItemMatriz.nivel_id)
    )

    const especialidadesFormItem = nivelFormItem
        ? especialidades.filter((e) => e.activo && Number(e.nivel_id) === Number(nivelFormItem.id))
        : []

    const caracteristicasFormItem = caracteristicas.filter((c) => c.activo)

    const cambiarVistaCatalogoBase = (tipo) => {
        setVistaCatalogoBase(tipo)
        setTabActivo(tipo)
    }

    const obtenerListaCatalogoBase = () => {
        if (vistaCatalogoBase === 'modalidades') return modalidades
        if (vistaCatalogoBase === 'niveles') return niveles
        if (vistaCatalogoBase === 'especialidades') return especialidades
        if (vistaCatalogoBase === 'caracteristicas') return caracteristicas
        return []
    }

    const listaCatalogoBase = obtenerListaCatalogoBase()

    const obtenerRelacionCatalogoBase = (item) => {
        if (vistaCatalogoBase === 'modalidades') {
            return item.descripcion || 'Catálogo nacional'
        }

        if (vistaCatalogoBase === 'niveles') {
            return getNombreModalidad(item.modalidad_id)
        }

        if (vistaCatalogoBase === 'especialidades') {
            return getNombreNivel(item.nivel_id)
        }

        if (vistaCatalogoBase === 'caracteristicas') {
            const flags = []

            if (item.es_bilingue) flags.push('Bilingüe')
            if (item.es_convenio) flags.push('Convenio')
            if (item.visible_docente) flags.push('Visible docente')

            return flags.length > 0 ? flags.join(' · ') : 'General'
        }

        return '—'
    }

    const obtenerTituloCatalogoBase = () => {
        if (vistaCatalogoBase === 'modalidades') return 'Modalidades'
        if (vistaCatalogoBase === 'niveles') return 'Niveles'
        if (vistaCatalogoBase === 'especialidades') return 'Especialidades'
        if (vistaCatalogoBase === 'caracteristicas') return 'Características'
        return 'Catálogo base'
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="container-fluid px-0">

            {/* ── HEADER ── */}
            <div
                className="card card-custom mb-7"
                style={{ background: HEADER_GRADIENT, border: 'none', borderRadius: 12 }}
            >
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 12 }}>
                        <div>
                            <h2 className="text-white font-weight-bolder mb-1">
                                <i className="fas fa-sitemap mr-3" style={{ opacity: 0.85 }} />
                                Catálogo de Plaza
                            </h2>

                            <p className="text-white mb-0" style={{ opacity: 0.75, fontSize: 14 }}>
                                Gestiona matrices, combinaciones válidas y catálogo base para la selección de plaza docente.
                            </p>
                        </div>

                        <div className="d-flex flex-wrap align-items-center" style={{ gap: 8 }}>
                            <span className="label label-inline label-lg font-weight-bold" style={{ background: '#EEF6FF', color: '#3699FF' }}>
                                {totalMatricesGlobales} globales
                            </span>

                            <span className="label label-inline label-lg font-weight-bold" style={{ background: '#EEE5FF', color: '#8950FC' }}>
                                {totalMatricesProvinciales} provinciales
                            </span>

                            <span className="label label-inline label-lg font-weight-bold" style={{ background: '#E8FFF3', color: '#1BC5BD' }}>
                                {totalMatricesPublicadas} publicadas
                            </span>

                            <span className="label label-inline label-lg font-weight-bold" style={{ background: '#FFF4DE', color: '#FFA800' }}>
                                {totalMatricesBorrador} borradores
                            </span>

                            {esSuperAdmin && (
                                <button
                                    type="button"
                                    className="btn btn-light-primary font-weight-bold ml-0 ml-md-3"
                                    onClick={inicializarMatrizGlobal}
                                    disabled={cargando}
                                >
                                    <i className="fas fa-magic mr-2" />
                                    Inicializar global
                                </button>
                            )}

                            {esAdmin && (
                                <button
                                    type="button"
                                    className="btn btn-light-success font-weight-bold ml-0 ml-md-3"
                                    onClick={crearMatrizProvincialDesdeGlobal}
                                    disabled={cargando || !matrizGlobalPublicada}
                                >
                                    <i className="fas fa-copy mr-2" />
                                    Crear matriz provincial
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {cargando && (
                <div className="text-center py-10">
                    <div className="spinner spinner-primary spinner-lg mb-4" />
                    <div className="text-muted font-weight-bold">Cargando catálogo de plaza...</div>
                </div>
            )}

            {esAdmin && (
                <div
                    className="alert alert-custom alert-light-primary mb-7"
                    style={{ borderLeft: '4px solid #3699FF' }}
                >
                    <div className="alert-icon">
                        <i className="fas fa-info-circle text-primary" />
                    </div>
                    <div className="alert-text">
                        <strong>Vista de administrador provincial:</strong> puedes trabajar sobre tu matriz provincial.
                        La matriz global funciona como referencia base. Modalidades y niveles son de lectura porque corresponden
                        a la estructura nacional.
                    </div>
                </div>
            )}

            {!cargando && (
                <>
                    {/* ── MATRICES REGISTRADAS ── */}
                    <div className="card card-custom mb-7">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-icon">
                                    <i className="fas fa-table text-primary" />
                                </span>
                                <h3 className="card-label font-weight-bolder">
                                    Matrices registradas
                                </h3>
                            </div>

                            <div className="card-toolbar">
                                <div className="d-flex align-items-center" style={{ gap: 10 }}>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        style={{ width: 110 }}
                                        value={anioMatriz}
                                        onChange={(e) => setAnioMatriz(Number(e.target.value))}
                                    />

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light-primary font-weight-bold"
                                        onClick={cargarMatrices}
                                        disabled={cargando}
                                    >
                                        <i className="fas fa-search mr-1" />
                                        Buscar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-0">
                            {matrices.length === 0 ? (
                                <div className="text-center py-12">
                                    <i className="fas fa-folder-open text-muted mb-4" style={{ fontSize: 38 }} />
                                    <div className="font-weight-bolder text-dark mb-1">
                                        Aún no hay matrices registradas
                                    </div>
                                    <div className="text-muted font-size-sm mb-4">
                                        Inicializa la matriz global para empezar a controlar combinaciones válidas.
                                    </div>

                                    {esSuperAdmin ? (
                                        <button
                                            type="button"
                                            className="btn btn-primary font-weight-bold"
                                            onClick={inicializarMatrizGlobal}
                                        >
                                            <i className="fas fa-magic mr-2" />
                                            Inicializar matriz global
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-success font-weight-bold"
                                            onClick={crearMatrizProvincialDesdeGlobal}
                                            disabled={!matrizGlobalPublicada}
                                        >
                                            <i className="fas fa-copy mr-2" />
                                            Crear matriz provincial
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-head-custom table-vertical-center mb-0">
                                        <thead>
                                            <tr>
                                                <th>Matriz</th>
                                                <th>Año</th>
                                                <th>Alcance</th>
                                                <th>Estado</th>
                                                <th>Items</th>
                                                <th>Activo</th>
                                                <th className="text-right">Acción</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {matrices.map((matriz) => {
                                                const seleccionada = Number(matrizSeleccionada?.id) === Number(matriz.id)

                                                return (
                                                    <tr
                                                        key={matriz.id}
                                                        style={{ background: seleccionada ? '#EEF6FF' : 'transparent' }}
                                                    >
                                                        <td>
                                                            <div className="font-weight-bolder text-dark">
                                                                {matriz.nombre}
                                                            </div>
                                                            <div className="text-muted font-size-xs">
                                                                ID: {matriz.id}
                                                                {matriz.provincia_nombre ? ` · Provincia: ${matriz.provincia_nombre}` : ''}
                                                                {matriz.convocatoria_nombre ? ` · Convocatoria: ${matriz.convocatoria_nombre}` : ''}
                                                            </div>
                                                        </td>

                                                        <td>{matriz.anio || '—'}</td>

                                                        <td>
                                                            <AlcanceMatrizBadge alcance={matriz.alcance} />
                                                        </td>

                                                        <td>
                                                            <EstadoMatrizBadge estado={matriz.estado} />
                                                        </td>

                                                        <td>
                                                            <span className="font-weight-bolder text-dark">
                                                                {matriz.total_items || 0}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {matriz.activo ? (
                                                                <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                            ) : (
                                                                <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                            )}
                                                        </td>

                                                        <td className="text-right">
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm font-weight-bold mr-2 ${seleccionada ? 'btn-primary' : 'btn-light-primary'}`}
                                                                onClick={() => seleccionarMatriz(matriz)}
                                                            >
                                                                <i className="fas fa-eye mr-1" />
                                                                Ver combinaciones
                                                            </button>

                                                            {puedeEditarMatriz(matriz) && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-warning font-weight-bold mr-2"
                                                                    onClick={() => editarEstadoMatriz(matriz)}
                                                                    title="Editar estado de matriz"
                                                                >
                                                                    <i className="fas fa-sliders-h mr-1" />
                                                                    Estado
                                                                </button>
                                                            )}

                                                            {esSuperAdmin && matriz.alcance === 'GLOBAL' && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-success font-weight-bold"
                                                                    onClick={() => clonarMatrizAProvincia(matriz)}
                                                                >
                                                                    <i className="fas fa-copy mr-1" />
                                                                    Clonar
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── DETALLE DE MATRIZ ── */}
                    <div className="card card-custom mb-7">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-icon">
                                    <i className="fas fa-project-diagram text-primary" />
                                </span>
                                <h3 className="card-label font-weight-bolder">
                                    Combinaciones de la matriz
                                </h3>
                            </div>

                            <div className="card-toolbar">
                                <button
                                    type="button"
                                    className="btn btn-primary font-weight-bold"
                                    onClick={abrirPanelNuevoItemMatriz}
                                    disabled={!puedeEditarCombinaciones(matrizSeleccionada)}
                                >
                                    <i className="fas fa-plus mr-2" />
                                    Agregar combinación
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-6">
                            {!matrizSeleccionada ? (
                                <div className="text-center py-10">
                                    <i className="fas fa-sitemap text-muted mb-4" style={{ fontSize: 36 }} />
                                    <div className="font-weight-bolder text-dark mb-1">
                                        Selecciona una matriz
                                    </div>
                                    <div className="text-muted font-size-sm">
                                        Al seleccionar una matriz podrás ver sus combinaciones válidas.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="rounded p-4 mb-6"
                                        style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}
                                    >
                                        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 12 }}>
                                            <div>
                                                <div className="font-weight-bolder text-dark">
                                                    {matrizSeleccionada.nombre}
                                                </div>
                                                <div className="text-muted font-size-sm">
                                                    Año {matrizSeleccionada.anio || '—'} · {matrizSeleccionada.observaciones || 'Sin observaciones'}
                                                </div>
                                            </div>

                                            <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                                                <AlcanceMatrizBadge alcance={matrizSeleccionada.alcance} />
                                                <EstadoMatrizBadge estado={matrizSeleccionada.estado} />
                                            </div>
                                        </div>
                                    </div>

                                    {mostrarPanelItemMatriz && (
                                        <div
                                            className="rounded p-5 mb-6"
                                            style={{ background: '#EEF6FF', border: '1px solid #B8DAFF' }}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-5">
                                                <div>
                                                    <h5 className="font-weight-bolder text-dark mb-1">
                                                        {editandoItemMatriz ? 'Editar combinación de plaza' : 'Nueva combinación de plaza'}
                                                    </h5>
                                                    <div className="text-muted font-size-sm">
                                                        {editandoItemMatriz
                                                            ? 'Actualiza la modalidad, nivel, especialidad o característica de esta combinación.'
                                                            : 'Agrega una modalidad, nivel, especialidad y característica a la matriz seleccionada.'}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light"
                                                    onClick={cerrarPanelItemMatriz}
                                                >
                                                    <i className="fas fa-times mr-1" />
                                                    Cerrar
                                                </button>
                                            </div>

                                            <div className="row">
                                                <div className="col-lg-3 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Modalidad</label>
                                                    <select
                                                        className="form-control"
                                                        value={formItemMatriz.modalidad_id}
                                                        onChange={(e) => actualizarCampoItemMatriz('modalidad_id', e.target.value)}
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {modalidades.filter((m) => m.activo).map((m) => (
                                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-lg-3 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Nivel</label>
                                                    <select
                                                        className="form-control"
                                                        value={formItemMatriz.nivel_id}
                                                        onChange={(e) => actualizarCampoItemMatriz('nivel_id', e.target.value)}
                                                        disabled={!formItemMatriz.modalidad_id}
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {nivelesFormItem.map((n) => (
                                                            <option key={n.id} value={n.id}>{n.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-lg-3 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Especialidad</label>
                                                    <select
                                                        className="form-control"
                                                        value={formItemMatriz.especialidad_id}
                                                        onChange={(e) => actualizarCampoItemMatriz('especialidad_id', e.target.value)}
                                                        disabled={!formItemMatriz.nivel_id}
                                                    >
                                                        <option value="">Seleccionar</option>
                                                        {especialidadesFormItem.map((e) => (
                                                            <option key={e.id} value={e.id}>{e.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-lg-3 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Característica</label>
                                                    <select
                                                        className="form-control"
                                                        value={formItemMatriz.caracteristica_id}
                                                        onChange={(e) => actualizarCampoItemMatriz('caracteristica_id', e.target.value)}
                                                    >
                                                        <option value="">Seleccionar</option>

                                                        {!editandoItemMatriz && caracteristicasFormItem.length > 1 && (
                                                            <option value="TODAS">Todas las características</option>
                                                        )}

                                                        {caracteristicasFormItem.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-lg-2 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Orden</label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min="1"
                                                        value={formItemMatriz.orden}
                                                        onChange={(e) => actualizarCampoItemMatriz('orden', e.target.value)}
                                                    />
                                                </div>

                                                <div className="col-lg-10 mb-4">
                                                    <label className="font-weight-bold font-size-sm">Observaciones</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Opcional"
                                                        value={formItemMatriz.observaciones}
                                                        onChange={(e) => actualizarCampoItemMatriz('observaciones', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-light font-weight-bold mr-3"
                                                    onClick={cerrarPanelItemMatriz}
                                                    disabled={guardandoItemMatriz}
                                                >
                                                    Cancelar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-primary font-weight-bold"
                                                    onClick={guardarItemMatriz}
                                                    disabled={guardandoItemMatriz}
                                                >
                                                    {guardandoItemMatriz ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm mr-2" />
                                                            Guardando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-save mr-2" />
                                                            {editandoItemMatriz ? 'Actualizar combinación' : 'Guardar combinación'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="row mb-5">
                                        <div className="col-lg-4 mb-3">
                                            <select
                                                className="form-control"
                                                value={filtrosMatriz.modalidad_id}
                                                onChange={(e) => setFiltrosMatriz({
                                                    modalidad_id: e.target.value,
                                                    nivel_id: '',
                                                    especialidad_id: '',
                                                })}
                                            >
                                                <option value="">Todas las modalidades</option>
                                                {modalidades.map((m) => (
                                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-lg-4 mb-3">
                                            <select
                                                className="form-control"
                                                value={filtrosMatriz.nivel_id}
                                                onChange={(e) => setFiltrosMatriz((prev) => ({
                                                    ...prev,
                                                    nivel_id: e.target.value,
                                                    especialidad_id: '',
                                                }))}
                                                disabled={!filtrosMatriz.modalidad_id}
                                            >
                                                <option value="">Todos los niveles</option>
                                                {nivelesFiltroMatriz.map((n) => (
                                                    <option key={n.id} value={n.id}>{n.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-lg-4 mb-3">
                                            <select
                                                className="form-control"
                                                value={filtrosMatriz.especialidad_id}
                                                onChange={(e) => setFiltrosMatriz((prev) => ({
                                                    ...prev,
                                                    especialidad_id: e.target.value,
                                                }))}
                                                disabled={!filtrosMatriz.nivel_id}
                                            >
                                                <option value="">Todas las especialidades</option>
                                                {especialidadesFiltroMatriz.map((e) => (
                                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {cargandoItemsMatriz ? (
                                        <SpinnerCarga texto="Cargando combinaciones..." />
                                    ) : itemsMatrizFiltrados.length === 0 ? (
                                        <div
                                            className="rounded p-6 text-center"
                                            style={{ background: '#F8F9FA', border: '1px dashed #D1D3E0' }}
                                        >
                                            <i className="fas fa-project-diagram text-muted mb-4" style={{ fontSize: 36 }} />
                                            <div className="font-weight-bolder text-dark mb-1">
                                                No hay combinaciones para esta selección
                                            </div>
                                            <div className="text-muted font-size-sm">
                                                Cambia los filtros o revisa si la matriz tiene items activos.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-head-custom table-vertical-center mb-0">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 55 }}>#</th>
                                                        <th>Modalidad</th>
                                                        <th>Nivel</th>
                                                        <th>Especialidad</th>
                                                        <th>Característica</th>
                                                        <th>Tipo</th>
                                                        <th>Estado</th>
                                                        <th className="text-right">Acciones</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {itemsMatrizFiltrados.map((item, idx) => (
                                                        <tr key={item.id} style={{ opacity: item.activo ? 1 : 0.55 }}>
                                                            <td className="font-weight-bold text-muted">{idx + 1}</td>

                                                            <td>
                                                                <span className="font-weight-bold text-dark font-size-sm">
                                                                    {item.modalidad_nombre || getNombreModalidad(item.modalidad_id)}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span className="font-weight-bold text-dark font-size-sm">
                                                                    {item.nivel_nombre || getNombreNivel(item.nivel_id)}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                                                    <div
                                                                        style={{
                                                                            width: 18,
                                                                            height: 18,
                                                                            borderRadius: 4,
                                                                            backgroundColor:
                                                                                item.color_folder_hex ||
                                                                                item.especialidad_color_hex ||
                                                                                item.especialidad?.color_folder_hex ||
                                                                                '#3699FF',
                                                                            border: '1px solid rgba(0,0,0,0.1)',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                    <div>
                                                                        <div className="font-weight-bold text-dark font-size-sm">
                                                                            {item.especialidad_nombre || getNombreEspecialidad(item.especialidad_id)}
                                                                        </div>
                                                                        {item.color_folder && (
                                                                            <div className="text-muted font-size-xs">
                                                                                {item.color_folder}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                <span className="label label-inline font-weight-bold" style={{ background: '#F3F6F9', color: '#7E8299' }}>
                                                                    {item.caracteristica_nombre || item.caracteristica?.nombre || `ID ${item.caracteristica_id}`}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {item.es_agregado_local ? (
                                                                    <Badge label="Local" bg={THEME.warningBg} color={THEME.warning} />
                                                                ) : (
                                                                    <Badge label="Base" bg={THEME.accentBg} color={THEME.accent} />
                                                                )}
                                                            </td>

                                                            <td>
                                                                {item.activo ? (
                                                                    <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                ) : (
                                                                    <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                                )}
                                                            </td>

                                                            <td className="text-right">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-icon btn-sm btn-light-primary mr-2"
                                                                    onClick={() => abrirEditarItemMatriz(item)}
                                                                    title="Editar combinación"
                                                                    disabled={!puedeEditarCombinaciones(matrizSeleccionada)}
                                                                >
                                                                    <i className="fas fa-pencil-alt" />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={`btn btn-icon btn-sm ${item.activo ? 'btn-light-danger' : 'btn-light-success'}`}
                                                                    onClick={() => cambiarEstadoItemMatriz(item)}
                                                                    title={item.activo ? 'Desactivar combinación' : 'Reactivar combinación'}
                                                                    disabled={!puedeEditarCombinaciones(matrizSeleccionada)}
                                                                >
                                                                    <i className={`fas ${item.activo ? 'fa-ban' : 'fa-check'}`} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── CATÁLOGO BASE ── */}
                    <div className="card card-custom mb-7">
                        <div className="card-header">
                            <div className="card-title">
                                <span className="card-icon">
                                    <i className="fas fa-cogs text-primary" />
                                </span>
                                <h3 className="card-label font-weight-bolder">
                                    Catálogo base
                                </h3>
                            </div>

                            <div className="card-toolbar">
                                {puedeEditarCatalogoBase(vistaCatalogoBase) && (
                                    <button
                                        type="button"
                                        className="btn btn-primary font-weight-bold"
                                        onClick={abrirCrear}
                                    >
                                        <i className="fas fa-plus mr-2" />
                                        Nuevo registro
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="card-body p-6">
                            <div className="d-flex flex-wrap mb-6" style={{ gap: 8 }}>
                                {[
                                    { id: 'modalidades', label: 'Modalidades', icon: 'fa-graduation-cap', count: modalidades.length },
                                    { id: 'niveles', label: 'Niveles', icon: 'fa-layer-group', count: niveles.length },
                                    { id: 'especialidades', label: 'Especialidades', icon: 'fa-folder', count: especialidades.length },
                                    { id: 'caracteristicas', label: 'Características', icon: 'fa-tags', count: caracteristicas.length },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        className={`btn font-weight-bold ${vistaCatalogoBase === tab.id ? 'btn-primary' : 'btn-light'}`}
                                        onClick={() => cambiarVistaCatalogoBase(tab.id)}
                                    >
                                        <i className={`fas ${tab.icon} mr-2`} />
                                        {tab.label}
                                        <span className="ml-2 label label-inline label-light font-weight-bold">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div
                                className="rounded p-4 mb-5"
                                style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}
                            >
                                <div className="font-weight-bolder text-dark">
                                    {obtenerTituloCatalogoBase()}
                                </div>
                                <div className="text-muted font-size-sm">
                                    Gestiona los registros base que alimentan las matrices de plaza.
                                </div>
                            </div>

                            {listaCatalogoBase.length === 0 ? (
                                <EstadoVacio
                                    mensaje="Sin registros"
                                    submensaje="Crea el primer registro para este catálogo."
                                    onAccion={abrirCrear}
                                    textoAccion="Crear registro"
                                />
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-head-custom table-vertical-center mb-0">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Código</th>
                                                <th>Relación / detalle</th>
                                                <th>Estado</th>
                                                <th className="text-right">Acciones</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {listaCatalogoBase.map((item) => (
                                                <tr key={item.id}>
                                                    <td>
                                                        <div className="font-weight-bolder text-dark">
                                                            {item.nombre}
                                                        </div>

                                                        {vistaCatalogoBase === 'especialidades' && (
                                                            <div className="d-flex align-items-center mt-1" style={{ gap: 6 }}>
                                                                <div
                                                                    style={{
                                                                        width: 16,
                                                                        height: 16,
                                                                        borderRadius: 4,
                                                                        backgroundColor: item.color_folder_hex || '#3699FF',
                                                                        border: '1px solid rgba(0,0,0,0.1)',
                                                                    }}
                                                                />
                                                                <span className="text-muted font-size-xs">
                                                                    {item.color_folder || 'Sin color'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td>
                                                        <span className="label label-inline label-light-primary font-weight-bold">
                                                            {item.codigo || '—'}
                                                        </span>
                                                    </td>

                                                    <td className="text-muted font-size-sm">
                                                        {obtenerRelacionCatalogoBase(item)}
                                                    </td>

                                                    <td>
                                                        {item.activo ? (
                                                            <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                        ) : (
                                                            <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                        )}
                                                    </td>

                                                    <td className="text-right">
                                                        {puedeEditarCatalogoBase(vistaCatalogoBase, item) ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-icon btn-sm btn-light-primary mr-2"
                                                                    onClick={() => abrirEditar(item)}
                                                                    title="Editar"
                                                                >
                                                                    <i className="fas fa-pencil-alt" />
                                                                </button>

                                                                {vistaCatalogoBase !== 'caracteristicas' && item.activo && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-icon btn-sm btn-light-danger"
                                                                        onClick={() => eliminar(item)}
                                                                        title="Desactivar"
                                                                    >
                                                                        <i className="fas fa-ban" />
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="label label-inline font-weight-bold" style={{ background: '#F3F6F9', color: '#7E8299' }}>
                                                                Solo lectura
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ════════════════════════════════════════════════════
                MODAL — ITEMS DE MATRIZ
            ════════════════════════════════════════════════════ */}
            {modalItemsMatrizAbierto && (
                <div
                    className="modal fade show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
                    onClick={(e) => { if (e.target === e.currentTarget) cerrarModalItemsMatriz() }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-xl">
                        <div className="modal-content border-0" style={{ borderRadius: 12 }}>
                            <div
                                className="modal-header border-0 px-7 pt-7 pb-4"
                                style={{ background: HEADER_GRADIENT, borderRadius: '12px 12px 0 0' }}
                            >
                                <div>
                                    <h5 className="modal-title text-white font-weight-bolder">
                                        Combinaciones de matriz
                                    </h5>
                                    <p className="text-white mb-0 font-size-sm" style={{ opacity: 0.75 }}>
                                        {matrizSeleccionada?.nombre || 'Matriz seleccionada'}
                                    </p>
                                </div>

                                <button
                                    className="btn btn-icon btn-sm"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                                    onClick={cerrarModalItemsMatriz}
                                >
                                    <i className="fas fa-times text-white" />
                                </button>
                            </div>

                            <div className="modal-body px-7 py-6">
                                {cargandoItemsMatriz ? (
                                    <SpinnerCarga texto="Cargando combinaciones..." />
                                ) : itemsMatriz.length === 0 ? (
                                    <EstadoVacio
                                        mensaje="Sin combinaciones"
                                        submensaje="Esta matriz no tiene items activos registrados."
                                    />
                                ) : (
                                    <div className="table-responsive" style={{ maxHeight: 520, overflowY: 'auto' }}>
                                        <table className="table table-hover">
                                            <thead>
                                                <tr style={{ backgroundColor: '#F3F6F9' }}>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0 pl-4">Modalidad</th>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0">Nivel</th>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0">Especialidad</th>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0">Característica</th>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Tipo</th>
                                                    <th className="font-weight-bolder text-muted font-size-sm border-0 text-center">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsMatriz.map((item) => (
                                                    <tr key={item.id} style={{ opacity: item.activo ? 1 : 0.55 }}>
                                                        <td className="pl-4 align-middle font-weight-bold text-dark">
                                                            {item.modalidad_nombre || item.modalidad?.nombre || `ID ${item.modalidad_id}`}
                                                        </td>

                                                        <td className="align-middle text-muted font-size-sm">
                                                            {item.nivel_nombre || item.nivel?.nombre || `ID ${item.nivel_id}`}
                                                        </td>

                                                        <td className="align-middle">
                                                            <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                                                <div
                                                                    style={{
                                                                        width: 18,
                                                                        height: 18,
                                                                        borderRadius: 4,
                                                                        backgroundColor: item.especialidad_color_hex || item.especialidad?.color_folder_hex || '#3699FF',
                                                                        border: '1px solid rgba(0,0,0,0.1)',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                                <span className="font-weight-bold text-dark font-size-sm">
                                                                    {item.especialidad_nombre || item.especialidad?.nombre || `ID ${item.especialidad_id}`}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="align-middle text-muted font-size-sm">
                                                            {item.caracteristica_nombre || item.caracteristica?.nombre || `ID ${item.caracteristica_id}`}
                                                        </td>

                                                        <td className="text-center align-middle">
                                                            {item.es_agregado_local ? (
                                                                <Badge label="Local" bg={THEME.warningBg} color={THEME.warning} />
                                                            ) : (
                                                                <Badge label="Base" bg={THEME.accentBg} color={THEME.accent} />
                                                            )}
                                                        </td>

                                                        <td className="text-center align-middle">
                                                            {item.activo
                                                                ? <Badge label="Activo" bg={THEME.successBg} color={THEME.success} />
                                                                : <Badge label="Inactivo" bg="#F3F6F9" color={THEME.muted} />
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer border-0 px-7 pb-7 pt-0">
                                <button
                                    className="btn btn-light font-weight-bold"
                                    onClick={cerrarModalItemsMatriz}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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