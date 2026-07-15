import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Swal from 'sweetalert2'
import PrelacionesApi from './PrelacionesApi'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
const HEADER_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'

const ESTADOS = {
    BORRADOR: { label: 'Borrador', bg: '#FFF4DE', color: '#FFA800', icon: 'fa-edit' },
    PUBLICADA: { label: 'Publicada', bg: '#E8FFF3', color: '#1BC5BD', icon: 'fa-check-circle' },
    CERRADA: { label: 'Cerrada', bg: '#F3F6F9', color: '#7E8299', icon: 'fa-lock' },
}

const ALCANCES = {
    GLOBAL: { label: 'Global', bg: '#EEF6FF', color: '#3699FF' },
    PROVINCIA: { label: 'Provincia / UGEL', bg: '#EEE5FF', color: '#8950FC' },
    CONVOCATORIA: { label: 'Convocatoria', bg: '#FFF4DE', color: '#FFA800' },
}

const TIPOS_REQUISITO = [
    { value: 'TITULADO', label: 'Titulado' },
    { value: 'EGRESADO', label: 'Egresado' },
    { value: 'ESTUDIANTE', label: 'Estudiante' },
    { value: 'OTRO', label: 'Otro' },
]

const obtenerAnioActual = () => new Date().getFullYear()

const EstadoBadge = ({ estado }) => {
    const c = ESTADOS[estado] || ESTADOS.BORRADOR

    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ background: c.bg, color: c.color }}
        >
            <i className={`fas ${c.icon} mr-1`} />
            {c.label}
        </span>
    )
}

const AlcanceBadge = ({ alcance }) => {
    const c = ALCANCES[alcance] || ALCANCES.GLOBAL

    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ background: c.bg, color: c.color }}
        >
            {c.label}
        </span>
    )
}

const normalizarLista = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.matrices)) return data.matrices
    if (Array.isArray(data?.requisitos)) return data.requisitos
    return []
}

const formMatrizInicial = (roleNivel = 1, provinciaId = '') => ({
    nombre: `Matriz de Prelación Académica ${obtenerAnioActual()}`,
    anio: obtenerAnioActual(),
    alcance: roleNivel === 1 ? 'GLOBAL' : 'PROVINCIA',
    estado: 'BORRADOR',
    convocatoria_id: '',
    provincia_id: roleNivel === 1 ? '' : provinciaId || '',
    fuente_documento: '',
    numero_resolucion: '',
    observaciones: '',
    activo: true,
})

const formRequisitoInicial = () => ({
    id: null,
    modalidad_id: '',
    nivel_id: '',
    especialidad_id: '',
    caracteristica_id: '',
    orden: 1,
    orden_texto: 'Primero',
    tipo_requisito: 'TITULADO',
    descripcion: '',
    requiere_titulo: true,
    requiere_resolucion: true,
    requiere_constancia: false,
    requiere_experiencia: false,
    requiere_capacitacion: false,
    activo: true,
})

const PrelacionesPanelPage = () => {
    const auth = useSelector((state) => state.auth)

    const [cargando, setCargando] = useState(true)
    const [guardandoMatriz, setGuardandoMatriz] = useState(false)
    const [guardandoRequisito, setGuardandoRequisito] = useState(false)
    const [error, setError] = useState(null)

    const [roleInfo, setRoleInfo] = useState(null)
    const [provinciaUsuarioId, setProvinciaUsuarioId] = useState(null)

    const [matrices, setMatrices] = useState([])
    const [matrizSeleccionada, setMatrizSeleccionada] = useState(null)

    const [requisitos, setRequisitos] = useState([])
    const [cargandoRequisitos, setCargandoRequisitos] = useState(false)

    const [catalogo, setCatalogo] = useState([])
    const [caracteristicas, setCaracteristicas] = useState([])

    const [mostrarPanelMatriz, setMostrarPanelMatriz] = useState(false)
    const [mostrarPanelRequisito, setMostrarPanelRequisito] = useState(false)

    const [formMatriz, setFormMatriz] = useState(formMatrizInicial())
    const [formRequisito, setFormRequisito] = useState(formRequisitoInicial())

    const [filtros, setFiltros] = useState({
        modalidad_id: '',
        nivel_id: '',
        especialidad_id: '',
    })

    const getToken = () => (
        auth?.authToken ||
        auth?.accessToken ||
        auth?.token ||
        localStorage.getItem('token') ||
        null
    )

    const roleNivel = Number(
        roleInfo?.nivel ||
        auth?.user?.role_nivel ||
        auth?.user?.role?.nivel ||
        5
    )

    const esSuperAdmin = roleNivel === 1
    const esAdmin = roleNivel === 2

    const matricesGlobales = useMemo(() => {
        return matrices.filter((m) => m.alcance === 'GLOBAL')
    }, [matrices])

    const matrizGlobalReferencia = useMemo(() => {
        return (
            matricesGlobales.find((m) => m.estado === 'PUBLICADA') ||
            matricesGlobales[0] ||
            null
        )
    }, [matricesGlobales])

    const totalPublicadas = useMemo(
        () => matrices.filter((m) => m.estado === 'PUBLICADA').length,
        [matrices]
    )

    const totalBorradores = useMemo(
        () => matrices.filter((m) => m.estado === 'BORRADOR').length,
        [matrices]
    )

    const totalCerradas = useMemo(
        () => matrices.filter((m) => m.estado === 'CERRADA').length,
        [matrices]
    )

    const modalidades = catalogo || []

    const modalidadFiltro = modalidades.find(
        (m) => String(m.id) === String(filtros.modalidad_id)
    )

    const nivelesFiltro = modalidadFiltro?.niveles || []

    const nivelFiltro = nivelesFiltro.find(
        (n) => String(n.id) === String(filtros.nivel_id)
    )

    const especialidadesFiltro = nivelFiltro?.especialidades || []

    const modalidadForm = modalidades.find(
        (m) => String(m.id) === String(formRequisito.modalidad_id)
    )

    const nivelesForm = modalidadForm?.niveles || []

    const nivelForm = nivelesForm.find(
        (n) => String(n.id) === String(formRequisito.nivel_id)
    )

    const especialidadesForm = nivelForm?.especialidades || []

    const requisitosFiltrados = useMemo(() => {
        return requisitos.filter((req) => {
            if (filtros.modalidad_id && String(req.modalidad_id) !== String(filtros.modalidad_id)) {
                return false
            }

            if (filtros.nivel_id && String(req.nivel_id) !== String(filtros.nivel_id)) {
                return false
            }

            if (filtros.especialidad_id && String(req.especialidad_id) !== String(filtros.especialidad_id)) {
                return false
            }

            return true
        })
    }, [requisitos, filtros])

    const obtenerNombreModalidad = (req) => {
        if (req.modalidad_nombre) return req.modalidad_nombre

        const item = modalidades.find((m) => Number(m.id) === Number(req.modalidad_id))
        return item?.nombre || `ID: ${req.modalidad_id || '—'}`
    }

    const obtenerNombreNivel = (req) => {
        if (req.nivel_nombre) return req.nivel_nombre

        const modalidad = modalidades.find((m) => Number(m.id) === Number(req.modalidad_id))
        const nivel = modalidad?.niveles?.find((n) => Number(n.id) === Number(req.nivel_id))

        return nivel?.nombre || `ID: ${req.nivel_id || '—'}`
    }

    const obtenerNombreEspecialidad = (req) => {
        if (req.especialidad_nombre) return req.especialidad_nombre

        const modalidad = modalidades.find((m) => Number(m.id) === Number(req.modalidad_id))
        const nivel = modalidad?.niveles?.find((n) => Number(n.id) === Number(req.nivel_id))
        const especialidad = nivel?.especialidades?.find((e) => Number(e.id) === Number(req.especialidad_id))

        return especialidad?.nombre || `ID: ${req.especialidad_id || '—'}`
    }

    const obtenerNombreCaracteristica = (req) => {
        if (req.caracteristica_nombre) return req.caracteristica_nombre
        if (!req.caracteristica_id) return 'Todas'

        const item = caracteristicas.find((c) => Number(c.id) === Number(req.caracteristica_id))
        return item?.nombre || `ID: ${req.caracteristica_id}`
    }

    const cargarRol = async () => {
        const token = getToken()

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

            setRoleInfo(data.role || null)
            setProvinciaUsuarioId(provinciaId)

            return {
                role: data.role || null,
                provincia_id: provinciaId,
            }
        } catch {
            return null
        }
    }

    const cargarMatrices = async (mantenerSeleccion = true) => {
        const res = await PrelacionesApi.listarMatrices()
        const lista = normalizarLista(res.data)

        setMatrices(lista)

        const idActual = matrizSeleccionada?.id

        if (mantenerSeleccion && idActual) {
            const misma = lista.find((m) => Number(m.id) === Number(idActual))

            if (misma) {
                await seleccionarMatriz(misma)
                return lista
            }
        }

        if (lista.length > 0) {
            await seleccionarMatriz(lista[0])
        } else {
            setMatrizSeleccionada(null)
            setRequisitos([])
        }

        return lista
    }

    const cargarCatalogo = async () => {
        const [resCatalogo, resCaract] = await Promise.all([
            PrelacionesApi.obtenerCatalogoPlaza(),
            PrelacionesApi.obtenerCaracteristicas(),
        ])

        setCatalogo(normalizarLista(resCatalogo.data))
        setCaracteristicas(normalizarLista(resCaract.data))
    }

    const cargarInicial = async () => {
        setCargando(true)
        setError(null)

        try {
            const rol = await cargarRol()

            const nivel = Number(rol?.role?.nivel || auth?.user?.role_nivel || 5)
            const provinciaId = rol?.provincia_id || auth?.user?.provincia_id || ''

            setFormMatriz(formMatrizInicial(nivel, provinciaId))

            await cargarCatalogo()
            await cargarMatrices(false)
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                err.response?.data?.error ||
                'No se pudo cargar el módulo de prelaciones académicas.'
            )
        } finally {
            setCargando(false)
        }
    }

    const seleccionarMatriz = async (matriz) => {
        setMatrizSeleccionada(matriz)
        setCargandoRequisitos(true)
        setRequisitos([])

        try {
            const res = await PrelacionesApi.listarRequisitos(matriz.id)
            setRequisitos(normalizarLista(res.data))
        } catch (err) {
            console.warn('No se pudieron cargar requisitos:', err)
            setRequisitos([])
        } finally {
            setCargandoRequisitos(false)
        }
    }

    const actualizarCampoMatriz = (campo, valor) => {
        setFormMatriz((prev) => {
            const nuevo = {
                ...prev,
                [campo]: valor,
            }

            if (campo === 'alcance') {
                if (valor === 'GLOBAL') {
                    nuevo.convocatoria_id = ''
                    nuevo.provincia_id = ''
                }

                if (valor === 'PROVINCIA' && !esSuperAdmin) {
                    nuevo.provincia_id = provinciaUsuarioId || ''
                    nuevo.convocatoria_id = ''
                }

                if (valor === 'CONVOCATORIA') {
                    nuevo.provincia_id = ''
                }
            }

            return nuevo
        })
    }

    const actualizarCampoRequisito = (campo, valor) => {
        setFormRequisito((prev) => {
            const nuevo = {
                ...prev,
                [campo]: valor,
            }

            if (campo === 'modalidad_id') {
                nuevo.nivel_id = ''
                nuevo.especialidad_id = ''
            }

            if (campo === 'nivel_id') {
                nuevo.especialidad_id = ''
            }

            if (campo === 'tipo_requisito') {
                if (valor === 'TITULADO') {
                    nuevo.requiere_titulo = true
                    nuevo.requiere_resolucion = true
                    nuevo.requiere_constancia = false
                }

                if (valor === 'EGRESADO') {
                    nuevo.requiere_titulo = false
                    nuevo.requiere_resolucion = false
                    nuevo.requiere_constancia = true
                }

                if (valor === 'ESTUDIANTE') {
                    nuevo.requiere_titulo = false
                    nuevo.requiere_resolucion = false
                    nuevo.requiere_constancia = true
                }
            }

            return nuevo
        })
    }

    const crearCamposConfig = () => {
        const campos = []

        if (formRequisito.requiere_titulo) {
            campos.push(
                { name: 'nombre_grado', label: 'Nombre de Grado', type: 'text', required: true },
                { name: 'especialidad', label: 'Especialidad', type: 'text', required: true },
                { name: 'institucion', label: 'Nombre de Institución', type: 'text', required: true },
                { name: 'fecha_grado', label: 'Fecha de Grado', type: 'date', required: false }
            )
        }

        if (formRequisito.requiere_resolucion) {
            campos.push(
                { name: 'numero_resolucion', label: 'N° de Resolución', type: 'text', required: true },
                { name: 'fecha_resolucion', label: 'Fecha de Resolución', type: 'date', required: true }
            )
        }

        if (formRequisito.requiere_constancia) {
            campos.push(
                { name: 'institucion', label: 'Nombre de Institución', type: 'text', required: true },
                { name: 'especialidad', label: 'Especialidad', type: 'text', required: true },
                { name: 'fecha_constancia', label: 'Fecha de Constancia', type: 'date', required: false }
            )
        }

        if (formRequisito.requiere_experiencia) {
            campos.push({
                name: 'anios_experiencia',
                label: 'Años de Experiencia',
                type: 'number',
                required: false,
            })
        }

        if (formRequisito.requiere_capacitacion) {
            campos.push(
                { name: 'nombre_capacitacion', label: 'Nombre de Capacitación', type: 'text', required: false },
                { name: 'horas', label: 'Cantidad de Horas', type: 'number', required: false }
            )
        }

        return { campos }
    }

    const crearDocumentosConfig = () => {
        const documentos = []

        if (formRequisito.requiere_titulo) {
            documentos.push({
                codigo: 'TITULO_PROFESIONAL',
                label: 'Título profesional',
                required: true,
            })
        }

        if (formRequisito.requiere_resolucion) {
            documentos.push({
                codigo: 'RESOLUCION_RECONOCIMIENTO',
                label: 'Resolución o reconocimiento',
                required: true,
            })
        }

        if (formRequisito.requiere_constancia) {
            documentos.push({
                codigo: 'CONSTANCIA_EGRESADO',
                label: 'Constancia de egresado o estudios',
                required: true,
            })
        }

        if (formRequisito.requiere_experiencia) {
            documentos.push({
                codigo: 'EXPERIENCIA_DOCENTE',
                label: 'Documento de experiencia',
                required: false,
            })
        }

        if (formRequisito.requiere_capacitacion) {
            documentos.push({
                codigo: 'CERTIFICADO_CAPACITACION',
                label: 'Certificado de capacitación',
                required: false,
            })
        }

        return { documentos }
    }

    const validarMatriz = () => {
        if (!String(formMatriz.nombre || '').trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nombre requerido',
                text: 'Ingresa el nombre de la matriz.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        if (!formMatriz.anio) {
            Swal.fire({
                icon: 'warning',
                title: 'Año requerido',
                text: 'Ingresa el año de aplicación.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        if (!esSuperAdmin && !provinciaUsuarioId) {
            Swal.fire({
                icon: 'warning',
                title: 'Provincia no asignada',
                text: 'Tu usuario administrador no tiene provincia asignada. No se puede crear una matriz provincial.',
                confirmButtonColor: '#F64E60',
            })
            return false
        }

        return true
    }

    const crearMatriz = async () => {
        if (!validarMatriz()) return

        setGuardandoMatriz(true)

        try {
            const alcanceFinal = esSuperAdmin ? formMatriz.alcance : 'PROVINCIA'

            const payload = {
                nombre: formMatriz.nombre,
                anio: Number(formMatriz.anio),
                alcance: alcanceFinal,
                estado: formMatriz.estado,
                convocatoria_id:
                    alcanceFinal === 'CONVOCATORIA' && formMatriz.convocatoria_id
                        ? Number(formMatriz.convocatoria_id)
                        : null,
                provincia_id:
                    alcanceFinal === 'PROVINCIA' && formMatriz.provincia_id
                        ? Number(formMatriz.provincia_id)
                        : null,
                fuente_documento: formMatriz.fuente_documento || null,
                numero_resolucion: formMatriz.numero_resolucion || null,
                observaciones: formMatriz.observaciones || null,
                activo: true,
            }

            await PrelacionesApi.crearMatriz(payload)

            await Swal.fire({
                icon: 'success',
                title: 'Matriz creada',
                text: 'La matriz de prelación fue registrada correctamente.',
                confirmButtonColor: '#1BC5BD',
            })

            setMostrarPanelMatriz(false)
            setFormMatriz(formMatrizInicial(roleNivel, provinciaUsuarioId || ''))

            await cargarMatrices(false)
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo crear la matriz',
                text:
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    'Ocurrió un error al registrar la matriz.',
                confirmButtonColor: '#F64E60',
            })
        } finally {
            setGuardandoMatriz(false)
        }
    }

    const validarRequisito = () => {
        if (!matrizSeleccionada?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona una matriz',
                text: 'Debes seleccionar una matriz antes de registrar requisitos.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        if (!formRequisito.modalidad_id || !formRequisito.nivel_id || !formRequisito.especialidad_id) {
            Swal.fire({
                icon: 'warning',
                title: 'Plaza incompleta',
                text: 'Selecciona modalidad, nivel y especialidad.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        if (!String(formRequisito.descripcion || '').trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Requisito requerido',
                text: 'Ingresa la descripción del requisito académico.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        return true
    }

    const abrirNuevoRequisito = () => {
        if (!matrizSeleccionada?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona una matriz',
                text: 'Primero selecciona una matriz para agregar requisitos.',
                confirmButtonColor: '#3699FF',
            })
            return
        }

        setFormRequisito(formRequisitoInicial())
        setMostrarPanelRequisito(true)
    }

    const editarRequisito = (req) => {
        setFormRequisito({
            id: req.id,
            modalidad_id: req.modalidad_id || '',
            nivel_id: req.nivel_id || '',
            especialidad_id: req.especialidad_id || '',
            caracteristica_id: req.caracteristica_id || '',
            orden: req.orden || 1,
            orden_texto: req.orden_texto || '',
            tipo_requisito: req.tipo_requisito || 'OTRO',
            descripcion: req.descripcion || '',
            requiere_titulo: req.requiere_titulo === true,
            requiere_resolucion: req.requiere_resolucion === true,
            requiere_constancia: req.requiere_constancia === true,
            requiere_experiencia: req.requiere_experiencia === true,
            requiere_capacitacion: req.requiere_capacitacion === true,
            activo: req.activo !== false,
        })

        setMostrarPanelRequisito(true)
    }

    const guardarRequisito = async () => {
        if (!validarRequisito()) return

        setGuardandoRequisito(true)

        try {
            const payload = {
                modalidad_id: Number(formRequisito.modalidad_id),
                nivel_id: Number(formRequisito.nivel_id),
                especialidad_id: Number(formRequisito.especialidad_id),
                caracteristica_id: formRequisito.caracteristica_id
                    ? Number(formRequisito.caracteristica_id)
                    : null,
                orden: Number(formRequisito.orden || 1),
                orden_texto: formRequisito.orden_texto || null,
                tipo_requisito: formRequisito.tipo_requisito || 'OTRO',
                descripcion: formRequisito.descripcion,
                campos_config: crearCamposConfig(),
                documentos_config: crearDocumentosConfig(),
                requiere_titulo: formRequisito.requiere_titulo === true,
                requiere_resolucion: formRequisito.requiere_resolucion === true,
                requiere_constancia: formRequisito.requiere_constancia === true,
                requiere_experiencia: formRequisito.requiere_experiencia === true,
                requiere_capacitacion: formRequisito.requiere_capacitacion === true,
                activo: formRequisito.activo !== false,
            }

            if (formRequisito.id) {
                await PrelacionesApi.actualizarRequisito(formRequisito.id, payload)
            } else {
                await PrelacionesApi.crearRequisito(matrizSeleccionada.id, payload)
            }

            await Swal.fire({
                icon: 'success',
                title: formRequisito.id ? 'Requisito actualizado' : 'Requisito agregado',
                text: 'La fila de prelación fue guardada correctamente.',
                confirmButtonColor: '#1BC5BD',
            })

            setMostrarPanelRequisito(false)
            setFormRequisito(formRequisitoInicial())

            await seleccionarMatriz(matrizSeleccionada)
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo guardar el requisito',
                text:
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    'Ocurrió un error al guardar el requisito.',
                confirmButtonColor: '#F64E60',
            })
        } finally {
            setGuardandoRequisito(false)
        }
    }

    const desactivarRequisito = async (req) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Desactivar requisito',
            text: 'El requisito dejará de mostrarse como opción activa.',
            showCancelButton: true,
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#F64E60',
            cancelButtonColor: '#E4E6EF',
        })

        if (!result.isConfirmed) return

        try {
            await PrelacionesApi.actualizarRequisito(req.id, {
                activo: false,
            })

            await seleccionarMatriz(matrizSeleccionada)
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo desactivar',
                text:
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    'Ocurrió un error al desactivar el requisito.',
                confirmButtonColor: '#F64E60',
            })
        }
    }

    useEffect(() => {
        cargarInicial()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div className='container-fluid px-0'>
            <div
                className='card card-custom mb-7'
                style={{ background: HEADER_GRADIENT, border: 'none', borderRadius: 12 }}
            >
                <div className='card-body py-8 px-8'>
                    <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                        <div>
                            <h2 className='text-white font-weight-bolder mb-1'>
                                <i className='fas fa-list-ol mr-3' style={{ opacity: 0.85 }} />
                                Prelaciones Académicas
                            </h2>

                            <p className='text-white mb-0' style={{ opacity: 0.75, fontSize: 14 }}>
                                Gestiona las matrices y requisitos académicos habilitantes para la postulación docente.
                            </p>
                        </div>

                        <div className='d-flex flex-wrap align-items-center' style={{ gap: 8 }}>
                            <span className='label label-inline label-lg font-weight-bold' style={{ background: '#E8FFF3', color: '#1BC5BD' }}>
                                {totalPublicadas} publicadas
                            </span>

                            <span className='label label-inline label-lg font-weight-bold' style={{ background: '#FFF4DE', color: '#FFA800' }}>
                                {totalBorradores} borradores
                            </span>

                            <span className='label label-inline label-lg font-weight-bold' style={{ background: '#F3F6F9', color: '#7E8299' }}>
                                {totalCerradas} cerradas
                            </span>

                            <button
                                type='button'
                                className='btn btn-light-primary font-weight-bold ml-0 ml-md-3'
                                onClick={() => setMostrarPanelMatriz((prev) => !prev)}
                            >
                                <i className='fas fa-plus mr-2' />
                                Nueva matriz
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {cargando && (
                <div className='text-center py-12'>
                    <div className='spinner spinner-primary spinner-lg mb-4' />
                    <div className='text-muted font-weight-bold'>Cargando matrices de prelación...</div>
                </div>
            )}

            {!cargando && error && (
                <div className='alert alert-custom alert-light-danger'>
                    <div className='alert-icon'>
                        <i className='fas fa-exclamation-circle text-danger' />
                    </div>
                    <div className='alert-text'>{error}</div>
                    <div className='alert-close'>
                        <button type='button' className='btn btn-sm btn-light-danger' onClick={cargarInicial}>
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            {!cargando && !error && (
                <>
                    {!esSuperAdmin && (
                        <div
                            className='alert alert-custom alert-light-primary mb-6'
                            style={{ borderLeft: '4px solid #3699FF' }}
                        >
                            <div className='alert-icon'>
                                <i className='fas fa-info-circle text-primary' />
                            </div>
                            <div className='alert-text'>
                                <strong>Vista de administrador provincial:</strong> las matrices nuevas se registrarán como alcance
                                provincia/UGEL. La matriz global funciona como referencia base cuando esté disponible.
                            </div>
                        </div>
                    )}

                    {!esSuperAdmin && matrizGlobalReferencia && (
                        <div
                            className='rounded p-4 mb-6'
                            style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}
                        >
                            <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 10 }}>
                                <div>
                                    <div className='font-weight-bolder text-dark'>
                                        <i className='fas fa-globe-americas mr-2 text-primary' />
                                        Matriz global de referencia
                                    </div>
                                    <div className='text-muted font-size-sm'>
                                        {matrizGlobalReferencia.nombre} · Año {matrizGlobalReferencia.anio || '—'}
                                    </div>
                                </div>

                                <div className='d-flex align-items-center' style={{ gap: 8 }}>
                                    <AlcanceBadge alcance='GLOBAL' />
                                    <EstadoBadge estado={matrizGlobalReferencia.estado} />
                                </div>
                            </div>
                        </div>
                    )}

                    {!esSuperAdmin && !matrizGlobalReferencia && (
                        <div
                            className='rounded p-4 mb-6'
                            style={{ background: '#FFF4DE', border: '1px solid #FFE2A8' }}
                        >
                            <div className='font-weight-bolder mb-1' style={{ color: '#FFA800' }}>
                                <i className='fas fa-exclamation-triangle mr-2' />
                                Matriz global no visible en esta vista
                            </div>
                            <div className='text-muted font-size-sm'>
                                Si ya existe una matriz global publicada, el backend debe permitir que el administrador provincial la consulte como referencia.
                            </div>
                        </div>
                    )}

                    {mostrarPanelMatriz && (
                        <div className='card card-custom mb-7'>
                            <div className='card-header'>
                                <div className='card-title'>
                                    <span className='card-icon'>
                                        <i className='fas fa-plus-circle text-primary' />
                                    </span>
                                    <h3 className='card-label font-weight-bolder'>
                                        Nueva matriz de prelación
                                    </h3>
                                </div>

                                <div className='card-toolbar'>
                                    <button
                                        type='button'
                                        className='btn btn-sm btn-light'
                                        onClick={() => setMostrarPanelMatriz(false)}
                                    >
                                        <i className='fas fa-times mr-1' />
                                        Cerrar
                                    </button>
                                </div>
                            </div>

                            <div className='card-body p-6'>
                                <div className='row'>
                                    <div className='col-xl-4 col-lg-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Nombre</label>
                                            <input
                                                type='text'
                                                className='form-control'
                                                value={formMatriz.nombre}
                                                onChange={(e) => actualizarCampoMatriz('nombre', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className='col-xl-2 col-lg-3 col-md-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Año</label>
                                            <input
                                                type='number'
                                                className='form-control'
                                                value={formMatriz.anio}
                                                onChange={(e) => actualizarCampoMatriz('anio', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className='col-xl-2 col-lg-3 col-md-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Estado</label>
                                            <select
                                                className='form-control'
                                                value={formMatriz.estado}
                                                onChange={(e) => actualizarCampoMatriz('estado', e.target.value)}
                                            >
                                                <option value='BORRADOR'>Borrador</option>
                                                <option value='PUBLICADA'>Publicada</option>
                                                <option value='CERRADA'>Cerrada</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className='col-xl-4 col-lg-6'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Alcance</label>

                                            {esSuperAdmin ? (
                                                <select
                                                    className='form-control'
                                                    value={formMatriz.alcance}
                                                    onChange={(e) => actualizarCampoMatriz('alcance', e.target.value)}
                                                >
                                                    <option value='GLOBAL'>Global</option>
                                                    <option value='PROVINCIA'>Provincia / UGEL</option>
                                                    <option value='CONVOCATORIA'>Convocatoria</option>
                                                </select>
                                            ) : (
                                                <input
                                                    className='form-control'
                                                    value='Provincia / UGEL asignada'
                                                    disabled
                                                />
                                            )}

                                            <span className='form-text text-muted'>
                                                Prioridad: convocatoria, provincia y luego global.
                                            </span>
                                        </div>
                                    </div>

                                    {esSuperAdmin && formMatriz.alcance === 'CONVOCATORIA' && (
                                        <div className='col-xl-3 col-lg-4'>
                                            <div className='form-group'>
                                                <label className='font-weight-bold font-size-sm'>ID de convocatoria</label>
                                                <input
                                                    type='number'
                                                    className='form-control'
                                                    placeholder='Ej: 4'
                                                    value={formMatriz.convocatoria_id}
                                                    onChange={(e) => actualizarCampoMatriz('convocatoria_id', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {esSuperAdmin && formMatriz.alcance === 'PROVINCIA' && (
                                        <div className='col-xl-3 col-lg-4'>
                                            <div className='form-group'>
                                                <label className='font-weight-bold font-size-sm'>ID de provincia</label>
                                                <input
                                                    type='number'
                                                    className='form-control'
                                                    placeholder='Ej: 15'
                                                    value={formMatriz.provincia_id}
                                                    onChange={(e) => actualizarCampoMatriz('provincia_id', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className='col-xl-3 col-lg-4'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>N° de resolución</label>
                                            <input
                                                type='text'
                                                className='form-control'
                                                placeholder='Ej: RDR N° 001707-2024'
                                                value={formMatriz.numero_resolucion}
                                                onChange={(e) => actualizarCampoMatriz('numero_resolucion', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className='col-xl-3 col-lg-4'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Fuente / documento</label>
                                            <input
                                                type='text'
                                                className='form-control'
                                                placeholder='Referencia normativa'
                                                value={formMatriz.fuente_documento}
                                                onChange={(e) => actualizarCampoMatriz('fuente_documento', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className='col-xl-6 col-lg-8'>
                                        <div className='form-group'>
                                            <label className='font-weight-bold font-size-sm'>Observaciones</label>
                                            <input
                                                type='text'
                                                className='form-control'
                                                value={formMatriz.observaciones}
                                                onChange={(e) => actualizarCampoMatriz('observaciones', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className='d-flex justify-content-end'>
                                    <button
                                        type='button'
                                        className='btn btn-light font-weight-bold mr-3'
                                        onClick={() => setMostrarPanelMatriz(false)}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type='button'
                                        className='btn btn-primary font-weight-bold'
                                        onClick={crearMatriz}
                                        disabled={guardandoMatriz}
                                    >
                                        {guardandoMatriz ? (
                                            <>
                                                <span className='spinner-border spinner-border-sm mr-2' />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <i className='fas fa-save mr-2' />
                                                Crear matriz
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className='card card-custom mb-7'>
                        <div className='card-header'>
                            <div className='card-title'>
                                <span className='card-icon'>
                                    <i className='fas fa-table text-primary' />
                                </span>
                                <h3 className='card-label font-weight-bolder'>
                                    Matrices registradas
                                </h3>
                            </div>
                        </div>

                        <div className='card-body p-0'>
                            {matrices.length === 0 ? (
                                <div className='text-center py-12'>
                                    <i className='fas fa-folder-open text-muted mb-4' style={{ fontSize: 38 }} />
                                    <div className='font-weight-bolder text-dark mb-1'>
                                        Aún no hay matrices registradas
                                    </div>
                                    <div className='text-muted font-size-sm'>
                                        Crea una matriz para empezar a registrar requisitos de prelación.
                                    </div>
                                </div>
                            ) : (
                                <div className='table-responsive'>
                                    <table className='table table-head-custom table-vertical-center mb-0'>
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Año</th>
                                                <th>Alcance</th>
                                                <th>Estado</th>
                                                <th>Resolución</th>
                                                <th className='text-right'>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matrices.map((matriz) => {
                                                const seleccionada = Number(matrizSeleccionada?.id) === Number(matriz.id)

                                                return (
                                                    <tr
                                                        key={matriz.id}
                                                        style={{
                                                            background: seleccionada ? '#EEF6FF' : 'transparent',
                                                        }}
                                                    >
                                                        <td>
                                                            <div className='font-weight-bolder text-dark'>
                                                                {matriz.nombre}
                                                            </div>
                                                            <div className='text-muted font-size-xs'>
                                                                {matriz.observaciones || 'Sin observaciones'}
                                                            </div>
                                                        </td>
                                                        <td>{matriz.anio || '—'}</td>
                                                        <td>
                                                            <AlcanceBadge alcance={matriz.alcance} />
                                                        </td>
                                                        <td>
                                                            <EstadoBadge estado={matriz.estado} />
                                                        </td>
                                                        <td>{matriz.numero_resolucion || '—'}</td>
                                                        <td className='text-right'>
                                                            <button
                                                                type='button'
                                                                className={`btn btn-sm font-weight-bold ${seleccionada ? 'btn-primary' : 'btn-light-primary'}`}
                                                                onClick={() => seleccionarMatriz(matriz)}
                                                            >
                                                                <i className='fas fa-eye mr-1' />
                                                                Ver requisitos
                                                            </button>
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

                    <div className='card card-custom'>
                        <div className='card-header'>
                            <div className='card-title'>
                                <span className='card-icon'>
                                    <i className='fas fa-graduation-cap text-primary' />
                                </span>
                                <h3 className='card-label font-weight-bolder'>
                                    Listado de Prelación
                                </h3>
                            </div>

                            <div className='card-toolbar'>
                                <button
                                    type='button'
                                    className='btn btn-primary font-weight-bold'
                                    onClick={abrirNuevoRequisito}
                                    disabled={!matrizSeleccionada}
                                >
                                    <i className='fas fa-plus mr-2' />
                                    Agregar
                                </button>
                            </div>
                        </div>

                        <div className='card-body p-6'>
                            {!matrizSeleccionada ? (
                                <div className='text-center py-10'>
                                    <i className='fas fa-list-ol text-muted mb-4' style={{ fontSize: 36 }} />
                                    <div className='font-weight-bolder text-dark mb-1'>
                                        Selecciona una matriz
                                    </div>
                                    <div className='text-muted font-size-sm'>
                                        Al seleccionar una matriz podrás ver y registrar sus requisitos académicos.
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className='rounded p-4 mb-6'
                                        style={{ background: '#F8F9FA', border: '1px solid #EBEDF3' }}
                                    >
                                        <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                                            <div>
                                                <div className='font-weight-bolder text-dark'>
                                                    {matrizSeleccionada.nombre}
                                                </div>
                                                <div className='text-muted font-size-sm'>
                                                    Año {matrizSeleccionada.anio || '—'} · {matrizSeleccionada.numero_resolucion || 'Sin resolución'}
                                                </div>
                                            </div>

                                            <div className='d-flex flex-wrap' style={{ gap: 8 }}>
                                                <AlcanceBadge alcance={matrizSeleccionada.alcance} />
                                                <EstadoBadge estado={matrizSeleccionada.estado} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className='row mb-5'>
                                        <div className='col-lg-4 mb-3'>
                                            <select
                                                className='form-control'
                                                value={filtros.modalidad_id}
                                                onChange={(e) => setFiltros({
                                                    modalidad_id: e.target.value,
                                                    nivel_id: '',
                                                    especialidad_id: '',
                                                })}
                                            >
                                                <option value=''>Todas las modalidades</option>
                                                {modalidades.map((m) => (
                                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className='col-lg-4 mb-3'>
                                            <select
                                                className='form-control'
                                                value={filtros.nivel_id}
                                                onChange={(e) => setFiltros((prev) => ({
                                                    ...prev,
                                                    nivel_id: e.target.value,
                                                    especialidad_id: '',
                                                }))}
                                                disabled={!filtros.modalidad_id}
                                            >
                                                <option value=''>Todos los niveles</option>
                                                {nivelesFiltro.map((n) => (
                                                    <option key={n.id} value={n.id}>{n.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className='col-lg-4 mb-3'>
                                            <select
                                                className='form-control'
                                                value={filtros.especialidad_id}
                                                onChange={(e) => setFiltros((prev) => ({
                                                    ...prev,
                                                    especialidad_id: e.target.value,
                                                }))}
                                                disabled={!filtros.nivel_id}
                                            >
                                                <option value=''>Todas las especialidades</option>
                                                {especialidadesFiltro.map((e) => (
                                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {mostrarPanelRequisito && (
                                        <div
                                            className='rounded p-5 mb-6'
                                            style={{ background: '#EEF6FF', border: '1px solid #B8DAFF' }}
                                        >
                                            <div className='d-flex align-items-center justify-content-between mb-5'>
                                                <div>
                                                    <h5 className='font-weight-bolder text-dark mb-1'>
                                                        {formRequisito.id ? 'Editar requisito de prelación' : 'Nuevo requisito de prelación'}
                                                    </h5>
                                                    <div className='text-muted font-size-sm'>
                                                        Registra la fila según modalidad, nivel, especialidad y característica.
                                                    </div>
                                                </div>

                                                <button
                                                    type='button'
                                                    className='btn btn-sm btn-light'
                                                    onClick={() => {
                                                        setMostrarPanelRequisito(false)
                                                        setFormRequisito(formRequisitoInicial())
                                                    }}
                                                >
                                                    <i className='fas fa-times mr-1' />
                                                    Cerrar
                                                </button>
                                            </div>

                                            <div className='row'>
                                                <div className='col-lg-4 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Modalidad</label>
                                                    <select
                                                        className='form-control'
                                                        value={formRequisito.modalidad_id}
                                                        onChange={(e) => actualizarCampoRequisito('modalidad_id', e.target.value)}
                                                    >
                                                        <option value=''>Seleccionar</option>
                                                        {modalidades.map((m) => (
                                                            <option key={m.id} value={m.id}>{m.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className='col-lg-4 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Nivel</label>
                                                    <select
                                                        className='form-control'
                                                        value={formRequisito.nivel_id}
                                                        onChange={(e) => actualizarCampoRequisito('nivel_id', e.target.value)}
                                                        disabled={!formRequisito.modalidad_id}
                                                    >
                                                        <option value=''>Seleccionar</option>
                                                        {nivelesForm.map((n) => (
                                                            <option key={n.id} value={n.id}>{n.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className='col-lg-4 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Especialidad</label>
                                                    <select
                                                        className='form-control'
                                                        value={formRequisito.especialidad_id}
                                                        onChange={(e) => actualizarCampoRequisito('especialidad_id', e.target.value)}
                                                        disabled={!formRequisito.nivel_id}
                                                    >
                                                        <option value=''>Seleccionar</option>
                                                        {especialidadesForm.map((e) => (
                                                            <option key={e.id} value={e.id}>{e.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className='col-lg-4 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Característica</label>
                                                    <select
                                                        className='form-control'
                                                        value={formRequisito.caracteristica_id}
                                                        onChange={(e) => actualizarCampoRequisito('caracteristica_id', e.target.value)}
                                                    >
                                                        <option value=''>Todas</option>
                                                        {caracteristicas.map((c) => (
                                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className='col-lg-3 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Tipo</label>
                                                    <select
                                                        className='form-control'
                                                        value={formRequisito.tipo_requisito}
                                                        onChange={(e) => actualizarCampoRequisito('tipo_requisito', e.target.value)}
                                                    >
                                                        {TIPOS_REQUISITO.map((tipo) => (
                                                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className='col-lg-2 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Prelación</label>
                                                    <input
                                                        type='text'
                                                        className='form-control'
                                                        placeholder='Ej: A, B, Primero'
                                                        value={formRequisito.orden_texto}
                                                        onChange={(e) => actualizarCampoRequisito('orden_texto', e.target.value)}
                                                    />
                                                </div>

                                                <div className='col-lg-3 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Orden</label>
                                                    <input
                                                        type='number'
                                                        className='form-control'
                                                        min='1'
                                                        value={formRequisito.orden}
                                                        onChange={(e) => actualizarCampoRequisito('orden', e.target.value)}
                                                    />
                                                </div>

                                                <div className='col-12 mb-4'>
                                                    <label className='font-weight-bold font-size-sm'>Requisito</label>
                                                    <textarea
                                                        className='form-control'
                                                        rows='3'
                                                        placeholder='Describe el requisito académico tal como aparecerá al docente.'
                                                        value={formRequisito.descripcion}
                                                        onChange={(e) => actualizarCampoRequisito('descripcion', e.target.value)}
                                                    />
                                                </div>

                                                <div className='col-12 mb-4'>
                                                    <label className='font-weight-bold font-size-sm d-block mb-3'>
                                                        Configuración del requisito
                                                    </label>

                                                    <div className='d-flex flex-wrap' style={{ gap: 16 }}>
                                                        {[
                                                            ['requiere_titulo', 'Título'],
                                                            ['requiere_resolucion', 'Resolución'],
                                                            ['requiere_constancia', 'Constancia'],
                                                            ['requiere_experiencia', 'Experiencia'],
                                                            ['requiere_capacitacion', 'Capacitación'],
                                                        ].map(([campo, label]) => (
                                                            <label key={campo} className='checkbox checkbox-lg checkbox-primary mb-0'>
                                                                <input
                                                                    type='checkbox'
                                                                    checked={formRequisito[campo] === true}
                                                                    onChange={(e) => actualizarCampoRequisito(campo, e.target.checked)}
                                                                />
                                                                <span />
                                                                <strong className='ml-2'>{label}</strong>
                                                            </label>
                                                        ))}

                                                        <label className='checkbox checkbox-lg checkbox-success mb-0'>
                                                            <input
                                                                type='checkbox'
                                                                checked={formRequisito.activo === true}
                                                                onChange={(e) => actualizarCampoRequisito('activo', e.target.checked)}
                                                            />
                                                            <span />
                                                            <strong className='ml-2'>Activo</strong>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='d-flex justify-content-end'>
                                                <button
                                                    type='button'
                                                    className='btn btn-light font-weight-bold mr-3'
                                                    onClick={() => {
                                                        setMostrarPanelRequisito(false)
                                                        setFormRequisito(formRequisitoInicial())
                                                    }}
                                                >
                                                    Cancelar
                                                </button>

                                                <button
                                                    type='button'
                                                    className='btn btn-primary font-weight-bold'
                                                    onClick={guardarRequisito}
                                                    disabled={guardandoRequisito}
                                                >
                                                    {guardandoRequisito ? (
                                                        <>
                                                            <span className='spinner-border spinner-border-sm mr-2' />
                                                            Guardando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className='fas fa-save mr-2' />
                                                            Guardar requisito
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {cargandoRequisitos ? (
                                        <div className='text-center py-10'>
                                            <div className='spinner spinner-primary spinner-lg mb-4' />
                                            <div className='text-muted'>Cargando requisitos...</div>
                                        </div>
                                    ) : requisitosFiltrados.length === 0 ? (
                                        <div className='rounded p-6 text-center' style={{ background: '#F8F9FA', border: '1px dashed #D1D3E0' }}>
                                            <i className='fas fa-graduation-cap text-muted mb-4' style={{ fontSize: 36 }} />
                                            <div className='font-weight-bolder text-dark mb-1'>
                                                No hay requisitos para esta selección
                                            </div>
                                            <div className='text-muted font-size-sm'>
                                                Usa el botón Agregar para registrar una nueva fila de prelación.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className='table-responsive'>
                                            <table className='table table-head-custom table-vertical-center mb-0'>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 55 }}>#</th>
                                                        <th>Modalidad</th>
                                                        <th>Nivel</th>
                                                        <th>Especialidad</th>
                                                        <th>Requisitos</th>
                                                        <th>Prelación</th>
                                                        <th>Orden</th>
                                                        <th>Características</th>
                                                        <th className='text-right'>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {requisitosFiltrados.map((req, idx) => (
                                                        <tr key={req.id}>
                                                            <td className='font-weight-bold text-muted'>{idx + 1}</td>

                                                            <td>
                                                                <span className='font-weight-bold text-dark font-size-sm'>
                                                                    {obtenerNombreModalidad(req)}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span className='font-weight-bold text-dark font-size-sm'>
                                                                    {obtenerNombreNivel(req)}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span className='font-weight-bold text-dark font-size-sm'>
                                                                    {obtenerNombreEspecialidad(req)}
                                                                </span>
                                                            </td>

                                                            <td style={{ minWidth: 280 }}>
                                                                <div className='font-weight-bold text-dark font-size-sm'>
                                                                    {req.descripcion}
                                                                </div>
                                                                <div className='text-muted font-size-xs mt-1'>
                                                                    Tipo: {req.tipo_requisito || '—'}
                                                                </div>
                                                            </td>

                                                            <td>
                                                                <span className='label label-inline label-light-primary font-weight-bold'>
                                                                    {req.orden_texto || '—'}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span className='font-weight-bolder text-dark'>
                                                                    {req.orden || '—'}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span className='label label-inline font-weight-bold' style={{ background: '#F3F6F9', color: '#7E8299' }}>
                                                                    {obtenerNombreCaracteristica(req)}
                                                                </span>
                                                            </td>

                                                            <td className='text-right'>
                                                                <button
                                                                    type='button'
                                                                    className='btn btn-icon btn-sm btn-light-primary mr-2'
                                                                    onClick={() => editarRequisito(req)}
                                                                    title='Editar'
                                                                >
                                                                    <i className='fas fa-pencil-alt' />
                                                                </button>

                                                                <button
                                                                    type='button'
                                                                    className='btn btn-icon btn-sm btn-light-danger'
                                                                    onClick={() => desactivarRequisito(req)}
                                                                    title='Desactivar'
                                                                >
                                                                    <i className='fas fa-trash-alt' />
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
                </>
            )}
        </div>
    )
}

export default PrelacionesPanelPage