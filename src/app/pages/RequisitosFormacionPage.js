import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import EvaluacionesApi from './EvaluacionesApi'

const HEADER_GRADIENT = 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)'

const LABELS = {
    nombre_grado: 'Nombre de Grado',
    especialidad: 'Especialidad',
    fecha_grado: 'Fecha de Grado',
    institucion: 'Nombre de Institución',
    numero_resolucion: 'N° de Resolución',
    fecha_resolucion: 'Fecha de Resolución',

    nombre_capacitacion: 'Nombre de Capacitación',
    fecha_inicio: 'Fecha de Inicio',
    fecha_fin: 'Fecha de Fin',
    horas: 'Cantidad de Horas',
}

const PLACEHOLDERS = {
    nombre_grado: 'Ej: Licenciado en Educación Primaria',
    especialidad: 'Ej: Educación Primaria',
    institucion: 'Ej: Universidad Nacional...',
    numero_resolucion: 'Ej: 123-2026',
    nombre_capacitacion: 'Ej: Gestión pedagógica',
    horas: 'Ej: 120',
}

const DATE_FIELDS = [
    'fecha_grado',
    'fecha_resolucion',
    'fecha_inicio',
    'fecha_fin',
]

const NUMBER_FIELDS = [
    'horas',
]

const normalizarTexto = (valor) => {
    return String(valor || '')
        .trim()
        .toUpperCase()
        .replaceAll(' ', '_')
        .replaceAll('-', '_')
}

const prepararArchivoParaSubida = (archivo) => {
    if (!archivo) return null

    try {
        return new File([archivo], archivo.name, {
            type: archivo.type,
            lastModified: Date.now(),
        })
    } catch (e) {
        return archivo
    }
}

const esArchivoPdf = (archivo) => {
    if (!archivo) return false

    const nombre = String(archivo.name || '').toLowerCase()
    const tipo = String(archivo.type || '').toLowerCase()

    return nombre.endsWith('.pdf') || tipo === 'application/pdf'
}

const getLabel = (campo) => {
    if (!campo) return 'Campo'
    return LABELS[campo] || String(campo).replaceAll('_', ' ')
}

const getInputType = (campo) => {
    if (DATE_FIELDS.includes(campo)) return 'date'
    if (NUMBER_FIELDS.includes(campo)) return 'number'
    return 'text'
}

const getCampoName = (campo) => {
    if (typeof campo === 'string') return campo
    return campo?.name || ''
}

const getCampoLabel = (campo) => {
    if (typeof campo === 'string') return getLabel(campo)
    return campo?.label || getLabel(campo?.name || '')
}

const getCampoType = (campo) => {
    if (typeof campo === 'string') return getInputType(campo)
    return campo?.type || getInputType(campo?.name || '')
}

const getCampoRequired = (campo) => {
    if (typeof campo === 'string') return true
    return campo?.required === true
}

const getCampos = (requisito) => {
    return requisito?.campos_config?.campos || []
}

const getDocumentos = (requisito) => {
    return (
        requisito?.documentos_config?.documentos ||
        requisito?.campos_config?.documentos ||
        []
    )
}

const getDocumentoKey = (doc) => {
    if (typeof doc === 'string') return doc
    return doc?.codigo || doc?.label || JSON.stringify(doc)
}

const getDocumentoTipo = (doc) => {
    if (typeof doc === 'string') return normalizarTexto(doc)
    return normalizarTexto(doc?.codigo || doc?.tipo_documento || doc?.label || 'DOCUMENTO')
}

const getDocumentoLabel = (doc) => {
    if (typeof doc === 'string') return doc
    return doc?.label || doc?.codigo || 'Documento requerido'
}

const getDocumentoRequired = (doc) => {
    if (typeof doc === 'string') return true
    return doc?.required !== false
}

const obtenerDocumentosFaltantes = (documentosRequeridos, obtenerDocumentoUsuario) => {
    return documentosRequeridos.filter((doc) => {
        if (!getDocumentoRequired(doc)) return false

        const tipoDocumento = getDocumentoTipo(doc)
        const documentoExistente = obtenerDocumentoUsuario(tipoDocumento)

        return !documentoExistente
    })
}

const formatearBytes = (bytes) => {
    const numero = Number(bytes || 0)

    if (!numero) return '—'
    if (numero < 1024) return `${numero} B`
    if (numero < 1024 * 1024) return `${(numero / 1024).toFixed(1)} KB`

    return `${(numero / (1024 * 1024)).toFixed(1)} MB`
}

const normalizarDocumentosResponse = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.documentos)) return data.documentos
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.data)) return data.data

    return []
}

const obtenerMensajeError = (err, fallback) => {
    const detail = err.response?.data?.detail
    const error = err.response?.data?.error
    const message = err.response?.data?.message

    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(', ')
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message

    return err.message || fallback
}

const EstadoBadge = ({ estado }) => {
    const config = {
        PENDIENTE: { bg: '#FFF4DE', color: '#FFA800', label: 'Pendiente' },
        OBSERVADO: { bg: '#FFF5F8', color: '#F64E60', label: 'Observado' },
        APROBADO: { bg: '#E8FFF3', color: '#1BC5BD', label: 'Aprobado' },
        RECHAZADO: { bg: '#FFE2E5', color: '#F64E60', label: 'Rechazado' },
    }

    const c = config[estado] || {
        bg: '#F3F6F9',
        color: '#7E8299',
        label: estado || 'Sin estado',
    }

    return (
        <span
            className='label label-inline font-weight-bold'
            style={{ background: c.bg, color: c.color }}
        >
            {c.label}
        </span>
    )
}

const obtenerTipoBloqueoRequisitos = (mensaje = '') => {
    const texto = String(mensaje || '').toLowerCase()

    if (
        texto.includes('no hay una convocatoria activa') ||
        texto.includes('no hay convocatoria') ||
        texto.includes('convocatoria activa en este momento')
    ) {
        return 'SIN_CONVOCATORIA'
    }

    if (
        texto.includes('primero debes completar la selección de plaza') ||
        texto.includes('selección de plaza')
    ) {
        return 'SIN_POSTULACION'
    }

    if (
        texto.includes('concluyó') ||
        texto.includes('cerró') ||
        texto.includes('culmin') ||
        texto.includes('ya no se encuentra disponible') ||
        texto.includes('período de postulación')
    ) {
        return 'CONVOCATORIA_CULMINADA'
    }

    return null
}

const BloqueoRequisitosPage = ({
    tipo,
    mensaje,
    onVerConvocatorias,
    onSeleccionPlaza,
}) => {
    const config = {
        SIN_CONVOCATORIA: {
            icon: 'fa-calendar-times',
            color: '#F64E60',
            bg: '#FFF5F8',
            titulo: 'No hay convocatoria disponible',
            subtitulo:
                'Actualmente no existe una convocatoria activa para registrar requisitos de formación académica.',
            detalle:
                'Cuando se publique una nueva convocatoria, podrás seleccionar una plaza y continuar con este módulo.',
            badge: 'Sin convocatoria activa',
        },
        SIN_POSTULACION: {
            icon: 'fa-map-marker-alt',
            color: '#FFA800',
            bg: '#FFF4DE',
            titulo: 'Primero debes seleccionar una plaza',
            subtitulo:
                'Para registrar requisitos de formación académica, primero necesitas tener una postulación en proceso.',
            detalle:
                'Ingresa a Selección de Plaza, elige modalidad, nivel, especialidad y luego vuelve a esta sección.',
            badge: 'Plaza pendiente',
        },
        CONVOCATORIA_CULMINADA: {
            icon: 'fa-lock',
            color: '#F64E60',
            bg: '#FFF5F8',
            titulo: 'Convocatoria culminada',
            subtitulo:
                'El período de postulación ya finalizó. Este módulo queda disponible solo para consulta.',
            detalle:
                'Ya no puedes registrar ni modificar requisitos de formación académica para esta convocatoria.',
            badge: 'Modo consulta',
        },
    }

    const c = config[tipo] || config.SIN_CONVOCATORIA

    return (
        <div className='container-fluid px-0'>
            <div
                className='card card-custom mb-7'
                style={{ background: HEADER_GRADIENT, border: 'none' }}
            >
                <div className='card-body py-8 px-8'>
                    <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                        <div>
                            <h2 className='text-white font-weight-bolder mb-1'>
                                Requisitos de Formación Académica
                            </h2>
                            <p className='text-white mb-0' style={{ opacity: 0.78 }}>
                                Validación académica de la postulación docente.
                            </p>
                        </div>

                        <span
                            className='label label-inline label-lg font-weight-bold'
                            style={{
                                background: c.color,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <i className={`fas ${c.icon} mr-2`} />
                            {c.badge}
                        </span>
                    </div>
                </div>
            </div>

            <div className='card card-custom shadow-sm' style={{ borderRadius: 12 }}>
                <div className='card-body p-10 text-center'>
                    <div
                        className='d-flex align-items-center justify-content-center rounded-circle mx-auto mb-6'
                        style={{
                            width: 92,
                            height: 92,
                            background: c.bg,
                        }}
                    >
                        <i
                            className={`fas ${c.icon}`}
                            style={{
                                fontSize: 40,
                                color: c.color,
                            }}
                        />
                    </div>

                    <h3 className='font-weight-bolder text-dark mb-3'>
                        {c.titulo}
                    </h3>

                    <p
                        className='text-muted font-size-sm mb-4'
                        style={{ maxWidth: 540, margin: '0 auto' }}
                    >
                        {c.subtitulo}
                    </p>

                    <div
                        className='rounded p-5 mb-7 text-left mx-auto'
                        style={{
                            maxWidth: 620,
                            background: '#F8F9FA',
                            border: '1px solid #EBEDF3',
                        }}
                    >
                        <div className='d-flex align-items-start'>
                            <div
                                className='d-flex align-items-center justify-content-center rounded mr-4'
                                style={{
                                    width: 42,
                                    height: 42,
                                    background: c.bg,
                                    flex: '0 0 42px',
                                }}
                            >
                                <i
                                    className='fas fa-info-circle'
                                    style={{ color: c.color }}
                                />
                            </div>

                            <div>
                                <div className='font-weight-bolder text-dark mb-1'>
                                    Información importante
                                </div>

                                <div className='text-muted font-size-sm'>
                                    {c.detalle}
                                </div>

                                {mensaje && (
                                    <div className='text-muted font-size-xs mt-3'>
                                        Mensaje del sistema: {mensaje}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className='d-flex justify-content-center flex-wrap' style={{ gap: 10 }}>
                        <button
                            type='button'
                            className='btn btn-primary font-weight-bold px-8'
                            onClick={onVerConvocatorias}
                        >
                            <i className='fas fa-bullhorn mr-2' />
                            Ver convocatorias disponibles
                        </button>

                        {tipo === 'SIN_POSTULACION' && (
                            <button
                                type='button'
                                className='btn btn-light-primary font-weight-bold px-8'
                                onClick={onSeleccionPlaza}
                            >
                                <i className='fas fa-map-marker-alt mr-2' />
                                Ir a selección de plaza
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const RequisitosFormacionPage = () => {
    const history = useHistory()
    const { postulacionId: postulacionIdParam } = useParams()

    const fileInputsRef = useRef({})

    const [postulacionId, setPostulacionId] = useState(postulacionIdParam || null)

    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState(null)

    const [requisitosDisponibles, setRequisitosDisponibles] = useState([])
    const [requisitosRegistrados, setRequisitosRegistrados] = useState([])
    const [matrizInfo, setMatrizInfo] = useState(null)

    const [subcriterioId, setSubcriterioId] = useState('')
    const [formData, setFormData] = useState({})

    const [documentosUsuario, setDocumentosUsuario] = useState([])
    const [errorDocumentos, setErrorDocumentos] = useState(null)
    const [subiendoDocumento, setSubiendoDocumento] = useState({})

    const hayDocumentoSubiendo = useMemo(() => {
        return Object.values(subiendoDocumento).some(Boolean)
    }, [subiendoDocumento])

    const subcriterioSeleccionado = useMemo(() => {
        if (!subcriterioId) return null

        return requisitosDisponibles.find(
            (r) => String(r.id) === String(subcriterioId)
        ) || null
    }, [subcriterioId, requisitosDisponibles])

    const camposFormulario = useMemo(() => {
        return getCampos(subcriterioSeleccionado)
    }, [subcriterioSeleccionado])

    const documentosRequeridos = useMemo(() => {
        return getDocumentos(subcriterioSeleccionado)
    }, [subcriterioSeleccionado])

    const getDetalleRequisitoRegistrado = (registro) => {
        if (!registro) return null

        return requisitosDisponibles.find(
            (req) => Number(req.id) === Number(registro.prelacion_requisito_id)
        ) || null
    }

    const obtenerDocumentoUsuario = (tipoDocumento) => {
        return documentosUsuario.find((doc) => {
            return String(doc.tipo_documento || '').toUpperCase() === String(tipoDocumento || '').toUpperCase()
        }) || null
    }

    const limpiarInputArchivo = (key) => {
        const input = fileInputsRef.current[key]

        if (input) {
            input.value = ''
        }
    }

    const cargarDocumentosUsuario = async (mostrarError = true) => {
        setErrorDocumentos(null)

        try {
            const res = await EvaluacionesApi.listarMisDocumentos({
                categoria: 'PERMANENTE',
            })

            setDocumentosUsuario(normalizarDocumentosResponse(res.data))
        } catch (err) {
            const mensaje = obtenerMensajeError(
                err,
                'No se pudieron cargar los documentos del docente.'
            )

            setErrorDocumentos(mensaje)

            if (mostrarError) {
                Swal.fire({
                    icon: 'error',
                    title: 'No se pudieron cargar documentos',
                    text: mensaje,
                    confirmButtonColor: '#F64E60',
                })
            }
        }
    }

    useEffect(() => {
        cargarDatos()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postulacionIdParam])

    useEffect(() => {
        if (!subcriterioSeleccionado) {
            setFormData({})
            return
        }

        const registroActual = requisitosRegistrados.find(
            (req) => Number(req.prelacion_requisito_id) === Number(subcriterioSeleccionado.id)
        )

        if (registroActual?.datos_json) {
            setFormData(registroActual.datos_json || {})
            return
        }

        const campos = getCampos(subcriterioSeleccionado)
        const nuevo = {}

        campos.forEach((campo) => {
            const name = getCampoName(campo)
            if (name) nuevo[name] = ''
        })

        setFormData(nuevo)
    }, [subcriterioSeleccionado, requisitosRegistrados])

    const resolverPostulacionActiva = async () => {
        try {
            const resConv = await EvaluacionesApi.getConvocatoriaActiva()
            const convocatoria = resConv.data

            if (!convocatoria?.id) {
                throw new Error('No hay una convocatoria activa en este momento.')
            }

            const resPost = await EvaluacionesApi.getMiPostulacionPorConvocatoria(convocatoria.id)
            const postulacion = resPost.data

            if (!postulacion?.id) {
                throw new Error('Primero debes completar la selección de plaza para continuar con formación académica.')
            }

            setPostulacionId(String(postulacion.id))
            history.replace(`/requisitos-formacion/${postulacion.id}`)

            return postulacion.id
        } catch (err) {
            if (err.response?.status === 404) {
                throw new Error('Primero debes completar la selección de plaza para continuar con formación académica.')
            }

            throw err
        }
    }

    const cargarDatos = async () => {
        setCargando(true)
        setError(null)

        try {
            let id = postulacionIdParam || postulacionId

            if (!id) {
                id = await resolverPostulacionActiva()
            }

            setPostulacionId(String(id))

            const [resDisponibles, resRegistrado] = await Promise.all([
                EvaluacionesApi.getRequisitosDisponibles(id),
                EvaluacionesApi.getRequisitosPostulacion(id),
            ])

            const dataDisponibles = resDisponibles.data || {}

            setMatrizInfo({
                matriz_id: dataDisponibles.matriz_id,
                matriz_nombre: dataDisponibles.matriz_nombre,
                alcance: dataDisponibles.alcance,
                mensaje: dataDisponibles.mensaje,
            })

            const disponibles = Array.isArray(dataDisponibles)
                ? dataDisponibles
                : dataDisponibles.items || []

            setRequisitosDisponibles(disponibles)

            const registrado = resRegistrado.data

            const registrados = Array.isArray(registrado)
                ? registrado
                : registrado && registrado.id
                    ? [registrado]
                    : []

            setRequisitosRegistrados(registrados)

            if (registrados.length > 0) {
                const primero = registrados[0]

                if (primero?.prelacion_requisito_id) {
                    setSubcriterioId(String(primero.prelacion_requisito_id))
                    setFormData(primero.datos_json || {})
                }
            }

            await cargarDocumentosUsuario(false)
        } catch (err) {
            console.error(err)

            const mensaje =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                err.message ||
                'No se pudo cargar la información de requisitos.'

            setError(mensaje)
        } finally {
            setCargando(false)
        }
    }

    const handleChangeCampo = (campo, value) => {
        setFormData((prev) => ({
            ...prev,
            [campo]: value,
        }))
    }

    const handleSubirDocumento = async (doc, archivo) => {
        const key = getDocumentoKey(doc)

        if (!archivo) {
            limpiarInputArchivo(key)
            return
        }

        if (!esArchivoPdf(archivo)) {
            limpiarInputArchivo(key)

            Swal.fire({
                icon: 'warning',
                title: 'Formato no permitido',
                text: 'Solo se permite subir documentos en formato PDF.',
                confirmButtonColor: '#3699FF',
            })

            return
        }

        const tipoDocumento = getDocumentoTipo(doc)
        const archivoPreparado = prepararArchivoParaSubida(archivo)

        setSubiendoDocumento((prev) => ({
            ...prev,
            [key]: true,
        }))

        try {
            await EvaluacionesApi.subirDocumento({
                archivo: archivoPreparado,
                tipo_documento: tipoDocumento,
                categoria: 'PERMANENTE',
            })

            await cargarDocumentosUsuario(false)

            await Swal.fire({
                icon: 'success',
                title: 'Documento guardado',
                text: `${getDocumentoLabel(doc)} fue guardado correctamente.`,
                showConfirmButton: false,
                timer: 1400,
                timerProgressBar: true,
            })
        } catch (err) {
            const mensaje = obtenerMensajeError(
                err,
                'No se pudo subir el documento.'
            )

            Swal.fire({
                icon: 'error',
                title: 'No se pudo subir el documento',
                text: mensaje,
                confirmButtonColor: '#F64E60',
            })
        } finally {
            limpiarInputArchivo(key)

            setSubiendoDocumento((prev) => ({
                ...prev,
                [key]: false,
            }))
        }
    }

    const validarFormulario = () => {
        if (!subcriterioSeleccionado) {
            Swal.fire({
                icon: 'warning',
                title: 'Selecciona un requisito',
                text: 'Debes seleccionar un requisito de formación académica.',
                confirmButtonColor: '#3699FF',
            })
            return false
        }

        for (const campo of camposFormulario) {
            const name = getCampoName(campo)

            if (!name) continue
            if (!getCampoRequired(campo)) continue

            if (!String(formData[name] || '').trim()) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Campo requerido',
                    text: `Completa el campo: ${getCampoLabel(campo)}.`,
                    confirmButtonColor: '#3699FF',
                })

                return false
            }
        }

        const documentosFaltantes = obtenerDocumentosFaltantes(
            documentosRequeridos,
            obtenerDocumentoUsuario
        )

        if (documentosFaltantes.length > 0) {
            const nombres = documentosFaltantes
                .map((doc) => `• ${getDocumentoLabel(doc)}`)
                .join('<br />')

            Swal.fire({
                icon: 'warning',
                title: 'Faltan documentos por subir',
                html: `
                    <div style="text-align:left">
                        <p style="margin-bottom:8px">
                            Los documentos cargados correctamente ya fueron guardados.
                            Para continuar, falta subir:
                        </p>
                        <strong>${nombres}</strong>
                    </div>
                `,
                confirmButtonColor: '#3699FF',
            })

            return false
        }

        return true
    }

    const guardarRequisito = async () => {
        if (hayDocumentoSubiendo) {
            Swal.fire({
                icon: 'info',
                title: 'Documento en proceso',
                text: 'Espera a que termine la carga del documento antes de guardar el requisito.',
                confirmButtonColor: '#3699FF',
            })
            return
        }

        if (!validarFormulario()) return

        setGuardando(true)

        try {
            const id = postulacionIdParam || postulacionId

            const payload = {
                prelacion_requisito_id: Number(subcriterioId),
                datos_json: formData,
                observacion_docente: null,
            }

            await EvaluacionesApi.crearRequisito(id, payload)

            await Swal.fire({
                icon: 'success',
                title: 'Requisito guardado',
                text: 'La información fue registrada correctamente.',
                confirmButtonColor: '#1BC5BD',
            })

            await cargarDatos()
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text:
                    err.response?.data?.detail ||
                    err.response?.data?.error ||
                    'No se pudo guardar el requisito.',
                confirmButtonColor: '#F64E60',
            })
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) {
        return (
            <div className='d-flex justify-content-center align-items-center' style={{ minHeight: 420 }}>
                <div className='text-center'>
                    <div className='spinner spinner-primary spinner-lg mb-4' />
                    <p className='text-muted font-weight-bold'>
                        Cargando requisitos de formación...
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        const tipoBloqueo = obtenerTipoBloqueoRequisitos(error)

        if (tipoBloqueo) {
            return (
                <BloqueoRequisitosPage
                    tipo={tipoBloqueo}
                    mensaje={error}
                    onVerConvocatorias={() => history.push('/convocatorias/publicas')}
                    onSeleccionPlaza={() => history.push('/seleccion-plaza')}
                />
            )
        }

        return (
            <div className='card card-custom'>
                <div className='card-body p-10 text-center'>
                    <i
                        className='fas fa-exclamation-triangle text-danger mb-4'
                        style={{ fontSize: 42 }}
                    />

                    <h4 className='font-weight-bolder text-dark'>
                        No se pudo cargar la página
                    </h4>

                    <p className='text-muted'>{error}</p>

                    <button
                        type='button'
                        className='btn btn-primary font-weight-bold'
                        onClick={cargarDatos}
                    >
                        <i className='fas fa-redo mr-2' />
                        Reintentar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className='container-fluid px-0'>
            <div
                className='card card-custom mb-7'
                style={{ background: HEADER_GRADIENT, border: 'none' }}
            >
                <div className='card-body py-8 px-8'>
                    <div
                        className='d-flex align-items-center justify-content-between flex-wrap'
                        style={{ gap: 12 }}
                    >
                        <div>
                            <h2 className='text-white font-weight-bolder mb-1'>
                                Requisitos de Formación Académica
                            </h2>

                            <p className='text-white mb-0' style={{ opacity: 0.78 }}>
                                Selecciona y registra el requisito académico que habilita tu postulación según la plaza elegida.
                            </p>
                        </div>

                        <div className='d-flex flex-wrap' style={{ gap: 8 }}>
                            <button
                                type='button'
                                className='btn btn-light-primary font-weight-bold'
                                onClick={() => history.push('/convocatorias/publicas')}
                            >
                                <i className='fas fa-arrow-left mr-2' />
                                Volver a convocatorias
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {requisitosRegistrados.length > 0 && (
                <div
                    className='alert alert-custom alert-light-success mb-7'
                    style={{ borderLeft: '4px solid #1BC5BD' }}
                >
                    <div className='alert-icon'>
                        <i className='fas fa-check-circle text-success' />
                    </div>

                    <div className='alert-text'>
                        <strong>Requisito registrado:</strong> Ya tienes un requisito de formación académica guardado.
                        Puedes revisar los datos en el panel derecho o modificarlos si aún están pendientes de revisión.
                    </div>
                </div>
            )}

            {errorDocumentos && (
                <div
                    className='alert alert-custom alert-light-warning mb-7'
                    style={{ borderLeft: '4px solid #FFA800' }}
                >
                    <div className='alert-icon'>
                        <i className='fas fa-exclamation-triangle text-warning' />
                    </div>

                    <div className='alert-text'>
                        <strong>No se pudo cargar la lista de documentos:</strong> {errorDocumentos}
                    </div>

                    <div className='alert-close'>
                        <button
                            type='button'
                            className='btn btn-sm btn-light-warning font-weight-bold'
                            onClick={() => cargarDocumentosUsuario(true)}
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            )}

            <div className='row'>
                <div className='col-xl-8 col-lg-8'>
                    <div className='card card-custom mb-7'>
                        <div className='card-header'>
                            <div className='card-title'>
                                <span className='card-icon'>
                                    <i className='fas fa-graduation-cap text-primary' />
                                </span>

                                <h3 className='card-label font-weight-bolder'>
                                    Agregar requisito académico de prelación
                                </h3>
                            </div>
                        </div>

                        <div className='card-body p-8'>
                            <div className='form-group'>
                                <label className='font-weight-bold'>
                                    Seleccionar requisito de prelación <span className='text-danger'>*</span>
                                </label>

                                <select
                                    className='form-control'
                                    value={subcriterioId}
                                    onChange={(e) => setSubcriterioId(e.target.value)}
                                    disabled={guardando}
                                >
                                    <option value=''>Seleccionar grado o requisito</option>

                                    {requisitosDisponibles.map((req) => (
                                        <option key={req.id} value={req.id}>
                                            {req.descripcion}
                                        </option>
                                    ))}
                                </select>

                                <span className='form-text text-muted'>
                                    El orden de prelación será usado internamente para la revisión.
                                </span>

                                {matrizInfo?.matriz_nombre && (
                                    <span className='form-text text-muted'>
                                        Matriz: {matrizInfo.matriz_nombre}
                                        {matrizInfo.alcance ? ` · Alcance: ${matrizInfo.alcance}` : ''}
                                    </span>
                                )}
                            </div>

                            {subcriterioSeleccionado && (
                                <>
                                    <div
                                        className='rounded p-4 mb-6'
                                        style={{ background: '#EEF6FF', borderLeft: '4px solid #3699FF' }}
                                    >
                                        <div className='font-weight-bolder text-primary mb-1'>
                                            {subcriterioSeleccionado.tipo_requisito || 'Requisito académico'}
                                        </div>

                                        <div className='text-muted font-size-sm'>
                                            {subcriterioSeleccionado.descripcion}
                                        </div>
                                    </div>

                                    <div className='row'>
                                        {camposFormulario.map((campo) => {
                                            const name = getCampoName(campo)
                                            const label = getCampoLabel(campo)
                                            const type = getCampoType(campo)
                                            const required = getCampoRequired(campo)

                                            if (!name) return null

                                            return (
                                                <div key={name} className='col-md-6 mb-5'>
                                                    <label className='font-weight-bold font-size-sm'>
                                                        {label} {required && <span className='text-danger'>*</span>}
                                                    </label>

                                                    <input
                                                        type={type}
                                                        className='form-control'
                                                        placeholder={PLACEHOLDERS[name] || ''}
                                                        value={formData[name] || ''}
                                                        onChange={(e) => handleChangeCampo(name, e.target.value)}
                                                        min={type === 'number' ? 0 : undefined}
                                                        disabled={guardando}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {documentosRequeridos.length > 0 && (
                                        <div
                                            className='rounded p-4 mb-6'
                                            style={{ background: '#F3F6F9', border: '1px solid #EBEDF3' }}
                                        >
                                            <div className='font-weight-bolder text-dark mb-2'>
                                                <i className='fas fa-paperclip mr-2 text-primary' />
                                                Documentos requeridos
                                            </div>

                                            <div className='text-muted font-size-sm mb-4'>
                                                Sube los documentos requeridos en formato PDF. El archivo se guardará en la carpeta del docente dentro del sistema.
                                            </div>

                                            <div className='row'>
                                                {documentosRequeridos.map((doc) => {
                                                    const key = getDocumentoKey(doc)
                                                    const tipoDocumento = getDocumentoTipo(doc)
                                                    const label = getDocumentoLabel(doc)
                                                    const required = getDocumentoRequired(doc)
                                                    const documentoExistente = obtenerDocumentoUsuario(tipoDocumento)
                                                    const subiendo = subiendoDocumento[key] === true
                                                    const inputId = `documento-${key}`.replace(/[^a-zA-Z0-9-_]/g, '-')

                                                    return (
                                                        <div key={key} className='col-12 mb-4'>
                                                            <div
                                                                className='rounded p-4'
                                                                style={{
                                                                    background: '#FFFFFF',
                                                                    border: documentoExistente
                                                                        ? '1px solid #C9F7F5'
                                                                        : '1px solid #EBEDF3',
                                                                }}
                                                            >
                                                                <div className='d-flex align-items-center justify-content-between flex-wrap' style={{ gap: 12 }}>
                                                                    <div style={{ minWidth: 230 }}>
                                                                        <div className='font-weight-bolder text-dark font-size-sm'>
                                                                            {label} {required && <span className='text-danger'>*</span>}
                                                                        </div>

                                                                        <div className='text-muted font-size-xs'>
                                                                            Tipo interno: {tipoDocumento}
                                                                        </div>

                                                                        {documentoExistente && (
                                                                            <div className='mt-2'>
                                                                                <span
                                                                                    className='label label-inline font-weight-bold mr-2'
                                                                                    style={{ background: '#E8FFF3', color: '#1BC5BD' }}
                                                                                >
                                                                                    Cargado
                                                                                </span>

                                                                                <span className='text-muted font-size-xs'>
                                                                                    {documentoExistente.nombre_archivo} · {formatearBytes(documentoExistente.tamaño_bytes)}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {!documentoExistente && (
                                                                            <div className='mt-2'>
                                                                                <span
                                                                                    className='label label-inline font-weight-bold'
                                                                                    style={{ background: '#FFF4DE', color: '#FFA800' }}
                                                                                >
                                                                                    Pendiente
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className='d-flex align-items-center' style={{ gap: 8 }}>
                                                                        <input
                                                                            ref={(el) => {
                                                                                if (el) fileInputsRef.current[key] = el
                                                                            }}
                                                                            id={inputId}
                                                                            type='file'
                                                                            accept='.pdf,application/pdf'
                                                                            style={{ display: 'none' }}
                                                                            disabled={subiendo || guardando}
                                                                            onClick={(e) => {
                                                                                e.target.value = ''
                                                                            }}
                                                                            onChange={(e) => {
                                                                                const archivo = e.target.files?.[0]
                                                                                e.target.value = ''

                                                                                if (archivo) {
                                                                                    handleSubirDocumento(doc, archivo)
                                                                                }
                                                                            }}
                                                                        />

                                                                        <button
                                                                            type='button'
                                                                            className={documentoExistente ? 'btn btn-light-primary font-weight-bold' : 'btn btn-primary font-weight-bold'}
                                                                            disabled={subiendo || guardando}
                                                                            onClick={() => {
                                                                                const input = fileInputsRef.current[key]

                                                                                if (input) {
                                                                                    input.value = ''
                                                                                    input.click()
                                                                                }
                                                                            }}
                                                                        >
                                                                            {subiendo ? (
                                                                                <>
                                                                                    <span className='spinner-border spinner-border-sm mr-2' />
                                                                                    Subiendo documento...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <i className='fas fa-upload mr-2' />
                                                                                    {documentoExistente ? 'Reemplazar documento' : 'Subir documento'}
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className='text-muted font-size-xs mt-1'>
                                                Solo se permite subir archivos en formato PDF.
                                            </div>
                                        </div>
                                    )}

                                    <div className='d-flex justify-content-end mt-6'>
                                        <button
                                            type='button'
                                            className='btn btn-light font-weight-bold mr-3'
                                            disabled={guardando}
                                            onClick={() => {
                                                setSubcriterioId('')
                                                setFormData({})
                                            }}
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type='button'
                                            className='btn btn-primary font-weight-bold'
                                            onClick={guardarRequisito}
                                            disabled={guardando || hayDocumentoSubiendo}
                                        >
                                            {guardando ? (
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
                                </>
                            )}

                            {!subcriterioSeleccionado && (
                                <div
                                    className='rounded p-5 text-center'
                                    style={{ background: '#F8F9FA', border: '1px dashed #D1D3E0' }}
                                >
                                    <i
                                        className='fas fa-graduation-cap text-muted mb-3'
                                        style={{ fontSize: 34 }}
                                    />

                                    <div className='font-weight-bolder text-dark mb-1'>
                                        Selecciona un requisito académico
                                    </div>

                                    <div className='text-muted font-size-sm'>
                                        Al seleccionar un requisito se mostrarán los campos que debes completar y los documentos que debes subir.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className='col-xl-4 col-lg-4'>
                    <div className='card card-custom mb-7'>
                        <div className='card-header'>
                            <div className='card-title'>
                                <h3 className='card-label font-weight-bolder font-size-sm'>
                                    Requisitos registrados
                                </h3>
                            </div>
                        </div>

                        <div className='card-body p-6'>
                            {requisitosRegistrados.length === 0 ? (
                                <div className='text-center py-8'>
                                    <i
                                        className='fas fa-folder-open text-muted mb-4'
                                        style={{ fontSize: 36 }}
                                    />

                                    <div className='font-weight-bold text-dark mb-1'>
                                        Sin requisitos registrados
                                    </div>

                                    <div className='text-muted font-size-sm'>
                                        Agrega al menos un requisito para continuar tu expediente.
                                    </div>
                                </div>
                            ) : (
                                requisitosRegistrados.map((req) => {
                                    const detalle = getDetalleRequisitoRegistrado(req)

                                    return (
                                        <div
                                            key={req.id}
                                            className='rounded p-4 mb-4'
                                            style={{
                                                background: '#E8FFF3',
                                                border: '1px solid #C9F7F5',
                                            }}
                                        >
                                            <div className='d-flex justify-content-between align-items-start mb-2'>
                                                <div className='font-weight-bolder text-dark font-size-sm pr-2'>
                                                    {detalle?.descripcion || 'Requisito académico registrado'}
                                                </div>

                                                <EstadoBadge estado={req.estado_revision} />
                                            </div>

                                            {detalle?.tipo_requisito && (
                                                <div className='text-muted font-size-xs mb-3'>
                                                    Tipo:{' '}
                                                    <span className='font-weight-bold'>
                                                        {detalle.tipo_requisito}
                                                    </span>
                                                </div>
                                            )}

                                            {req.datos_json && Object.keys(req.datos_json).length > 0 && (
                                                <div
                                                    className='rounded p-3 mb-3'
                                                    style={{
                                                        background: '#FFFFFF',
                                                        border: '1px solid #EBEDF3',
                                                    }}
                                                >
                                                    {Object.entries(req.datos_json).map(([key, value]) => (
                                                        <div key={key} className='mb-2'>
                                                            <div className='text-muted font-size-xs'>
                                                                {getLabel(key)}
                                                            </div>

                                                            <div className='font-weight-bold text-dark font-size-sm'>
                                                                {value || '—'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {detalle && getDocumentos(detalle).length > 0 && (
                                                <div
                                                    className='rounded p-3 mb-3'
                                                    style={{
                                                        background: '#FFFFFF',
                                                        border: '1px solid #EBEDF3',
                                                    }}
                                                >
                                                    <div className='font-weight-bolder text-dark font-size-xs mb-2'>
                                                        Documentos relacionados
                                                    </div>

                                                    {getDocumentos(detalle).map((doc) => {
                                                        const tipoDocumento = getDocumentoTipo(doc)
                                                        const documentoExistente = obtenerDocumentoUsuario(tipoDocumento)

                                                        return (
                                                            <div
                                                                key={getDocumentoKey(doc)}
                                                                className='d-flex justify-content-between align-items-center mb-2'
                                                                style={{ gap: 8 }}
                                                            >
                                                                <div className='text-muted font-size-xs'>
                                                                    {getDocumentoLabel(doc)}
                                                                </div>

                                                                {documentoExistente ? (
                                                                    <span
                                                                        className='label label-inline font-weight-bold'
                                                                        style={{ background: '#E8FFF3', color: '#1BC5BD' }}
                                                                    >
                                                                        Cargado
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        className='label label-inline font-weight-bold'
                                                                        style={{ background: '#FFF4DE', color: '#FFA800' }}
                                                                    >
                                                                        Pendiente
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {req.observacion_revision && (
                                                <div
                                                    className='rounded p-3 mt-3'
                                                    style={{ background: '#FFF4DE', borderLeft: '3px solid #FFA800' }}
                                                >
                                                    <div
                                                        className='font-weight-bold font-size-xs mb-1'
                                                        style={{ color: '#FFA800' }}
                                                    >
                                                        Observación de revisión
                                                    </div>

                                                    <div className='text-muted font-size-xs'>
                                                        {req.observacion_revision}
                                                    </div>
                                                </div>
                                            )}

                                            {(req.estado_revision === 'PENDIENTE' || req.estado_revision === 'OBSERVADO') && (
                                                <div className='d-flex justify-content-end mt-3'>
                                                    <button
                                                        type='button'
                                                        className='btn btn-xs btn-light-primary font-weight-bold'
                                                        disabled={guardando}
                                                        onClick={() => {
                                                            setSubcriterioId(String(req.prelacion_requisito_id))
                                                            setFormData(req.datos_json || {})
                                                        }}
                                                    >
                                                        <i className='fas fa-pencil-alt mr-1' />
                                                        Modificar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className='card card-custom'>
                        <div className='card-body p-6'>
                            <div className='d-flex align-items-center mb-4'>
                                <div
                                    className='d-flex align-items-center justify-content-center rounded mr-3'
                                    style={{ width: 40, height: 40, background: '#E8FFF3' }}
                                >
                                    <i
                                        className='fas fa-info-circle'
                                        style={{ color: '#1BC5BD', fontSize: 18 }}
                                    />
                                </div>

                                <div>
                                    <div className='font-weight-bolder text-dark'>
                                        Información
                                    </div>

                                    <div className='text-muted font-size-xs'>
                                        Proceso de evaluación
                                    </div>
                                </div>
                            </div>

                            <p className='text-muted font-size-sm mb-0'>
                                Este requisito permite validar si cumples con la prelación mínima para la plaza seleccionada.
                                La revisión será realizada internamente por el equipo correspondiente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RequisitosFormacionPage
