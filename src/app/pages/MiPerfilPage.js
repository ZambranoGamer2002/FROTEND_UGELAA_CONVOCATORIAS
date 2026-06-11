import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
const NEXT_ROUTE = '/seleccion-plaza'

const getErrorMessage = (data) => {
    if (!data) return 'Ocurrió un error inesperado.'

    if (typeof data.detail === 'string') return data.detail

    if (data.detail?.mensaje) return data.detail.mensaje

    if (Array.isArray(data.detail)) {
        return data.detail
            .map((item) => item?.msg || item?.message || 'Error de validación')
            .join(', ')
    }

    if (data.message) return data.message

    return 'No se pudo guardar el perfil.'
}

export default function MiPerfilPage() {
    const history = useHistory()
    const auth = useSelector((s) => s.auth)
    const token = auth?.authToken || ''
    const user = auth?.user || {}

    const [celular, setCelular] = useState('')
    const [departamentoId, setDepartamentoId] = useState('')
    const [provinciaId, setProvinciaId] = useState('')
    const [distritoId, setDistritoId] = useState('')
    const [direccion, setDireccion] = useState('')
    const [documentoDNI, setDocumentoDNI] = useState(null)
    const [documentoDNIUrl, setDocumentoDNIUrl] = useState(null)

    const [departamentos, setDepartamentos] = useState([])
    const [provincias, setProvincias] = useState([])
    const [distritos, setDistritos] = useState([])

    const [cargando, setCargando] = useState(false)
    const [cargandoPerfil, setCargandoPerfil] = useState(true)
    const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true)
    const [cargandoProvincias, setCargandoProvincias] = useState(false)
    const [cargandoDistritos, setCargandoDistritos] = useState(false)

    const [modoEdicion, setModoEdicion] = useState(false)
    const [perfilCargado, setPerfilCargado] = useState(false)
    const [perfilCompleto, setPerfilCompleto] = useState(false)

    const [error, setError] = useState('')
    const [successInfo, setSuccessInfo] = useState(null)

    const headers = { Authorization: `Bearer ${token}` }

    const perfilTieneDatosCompletos = (datos) => {
        return Boolean(
            datos?.celular &&
            datos?.departamento_id &&
            datos?.provincia_id &&
            datos?.distrito_id &&
            datos?.direccion &&
            datos?.documento_dni_url
        )
    }

    const actualizarUsuarioLocal = () => {
        try {
            const userStorage = JSON.parse(localStorage.getItem('user') || '{}')
            userStorage.perfil_completo = true
            userStorage.registro_completo = true
            userStorage.estado = 'activo'
            localStorage.setItem('user', JSON.stringify(userStorage))
        } catch (err) {
            console.warn('No se pudo actualizar el usuario local:', err)
        }
    }

    const irASeleccionPlaza = (replace = false) => {
        const navigationState = {
            desdePerfil: true,
            perfilCompletado: true,
        }

        if (replace) {
            history.replace({
                pathname: NEXT_ROUTE,
                state: navigationState,
            })
        } else {
            history.push({
                pathname: NEXT_ROUTE,
                state: navigationState,
            })
        }

        window.setTimeout(() => {
            if (window.location.pathname !== NEXT_ROUTE) {
                window.location.assign(NEXT_ROUTE)
            }
        }, 300)
    }

    const redirigirASeleccionPlaza = () => {
        window.setTimeout(() => {
            irASeleccionPlaza(true)
        }, 1500)
    }

    const cargarPerfil = async () => {
        setCargandoPerfil(true)

        try {
            const resp = await fetch(`${API_BASE}/perfil/mi-perfil`, { headers })

            if (!resp.ok) {
                setModoEdicion(true)
                return
            }

            const data = await resp.json()
            const datosPersonales = data?.datos_personales

            if (!datosPersonales) {
                setModoEdicion(true)
                setPerfilCargado(false)
                setPerfilCompleto(false)
                return
            }

            if (datosPersonales.celular) {
                setCelular(datosPersonales.celular)
            }

            if (datosPersonales.direccion) {
                setDireccion(datosPersonales.direccion)
            }

            if (datosPersonales.departamento_id) {
                setDepartamentoId(datosPersonales.departamento_id.toString())
            }

            if (datosPersonales.provincia_id) {
                setProvinciaId(datosPersonales.provincia_id.toString())
            }

            if (datosPersonales.distrito_id) {
                setDistritoId(datosPersonales.distrito_id.toString())
            }

            if (datosPersonales.documento_dni_url) {
                setDocumentoDNIUrl(datosPersonales.documento_dni_url)
            }

            const completo = perfilTieneDatosCompletos(datosPersonales)

            setPerfilCargado(true)
            setPerfilCompleto(completo)
            setModoEdicion(!completo)
        } catch (err) {
            console.error('Error al cargar perfil:', err)
            setModoEdicion(true)
            setPerfilCargado(false)
            setPerfilCompleto(false)
        } finally {
            setCargandoPerfil(false)
        }
    }

    useEffect(() => {
        if (token) cargarPerfil()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    useEffect(() => {
        const cargar = async () => {
            try {
                const resp = await fetch(`${API_BASE}/ubigeo/departamentos`, { headers })
                const data = await resp.json()
                setDepartamentos(Array.isArray(data) ? data : data.data || [])
            } catch (err) {
                console.error('Error al cargar departamentos:', err)
                setError('No se pudieron cargar los departamentos.')
            } finally {
                setCargandoDepartamentos(false)
            }
        }

        if (token) cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    useEffect(() => {
        if (!departamentoId) return

        const cargar = async () => {
            setCargandoProvincias(true)

            try {
                const resp = await fetch(`${API_BASE}/ubigeo/provincias/${departamentoId}`, { headers })
                const data = await resp.json()
                setProvincias(Array.isArray(data) ? data : data.data || [])
            } catch (err) {
                console.error('Error al cargar provincias:', err)
                setError('No se pudieron cargar las provincias.')
            } finally {
                setCargandoProvincias(false)
            }
        }

        cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departamentoId])

    useEffect(() => {
        if (!provinciaId) return

        const cargar = async () => {
            setCargandoDistritos(true)

            try {
                const resp = await fetch(`${API_BASE}/ubigeo/distritos/${provinciaId}`, { headers })
                const data = await resp.json()
                setDistritos(Array.isArray(data) ? data : data.data || [])
            } catch (err) {
                console.error('Error al cargar distritos:', err)
                setError('No se pudieron cargar los distritos.')
            } finally {
                setCargandoDistritos(false)
            }
        }

        cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provinciaId])

    const handleDepartamentoChange = (e) => {
        const deptId = e.target.value
        setDepartamentoId(deptId)
        setProvinciaId('')
        setDistritoId('')
        setProvincias([])
        setDistritos([])
        setError('')
    }

    const handleProvinciaChange = (e) => {
        const provId = e.target.value
        setProvinciaId(provId)
        setDistritoId('')
        setDistritos([])
        setError('')
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        setError('')

        if (!file) {
            setDocumentoDNI(null)
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo no debe superar 5 MB.')
            e.target.value = ''
            setDocumentoDNI(null)
            return
        }

        const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png']
        const extension = file.name.split('.').pop().toLowerCase()

        if (!extensionesPermitidas.includes(extension)) {
            setError('Solo se permiten archivos PDF, JPG o PNG.')
            e.target.value = ''
            setDocumentoDNI(null)
            return
        }

        setDocumentoDNI(file)
    }

    const completarPerfilConDocumento = async () => {
        const formData = new FormData()
        formData.append('celular', celular)
        formData.append('departamento_id', departamentoId)
        formData.append('provincia_id', provinciaId)
        formData.append('distrito_id', distritoId)
        formData.append('direccion', direccion.toUpperCase())
        formData.append('documento_dni', documentoDNI)

        const resp = await fetch(`${API_BASE}/perfil/completar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        })

        const data = await resp.json().catch(() => ({}))

        if (!resp.ok) {
            throw new Error(getErrorMessage(data))
        }

        return data
    }

    const actualizarPerfilSinDocumento = async () => {
        const resp = await fetch(`${API_BASE}/perfil/mi-perfil`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                celular,
                departamento_id: Number(departamentoId),
                provincia_id: Number(provinciaId),
                distrito_id: Number(distritoId),
                direccion: direccion.toUpperCase(),
            }),
        })

        const data = await resp.json().catch(() => ({}))

        if (!resp.ok) {
            throw new Error(getErrorMessage(data))
        }

        return data
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!celular || celular.length < 9) {
            setError('Ingresa un número de celular válido.')
            return
        }

        if (!departamentoId || !provinciaId || !distritoId) {
            setError('Debes seleccionar departamento, provincia y distrito.')
            return
        }

        if (!direccion.trim()) {
            setError('Ingresa tu dirección completa.')
            return
        }

        if (!documentoDNIUrl && !documentoDNI) {
            setError('Debes subir tu documento de identidad DNI.')
            return
        }

        setCargando(true)

        try {
            const usarDocumento = Boolean(documentoDNI)
            const data = usarDocumento
                ? await completarPerfilConDocumento()
                : await actualizarPerfilSinDocumento()

            if (data?.documento_dni?.ruta_relativa) {
                setDocumentoDNIUrl(data.documento_dni.ruta_relativa)
            }

            actualizarUsuarioLocal()

            setPerfilCargado(true)
            setPerfilCompleto(true)
            setModoEdicion(false)

            setSuccessInfo({
                modo: perfilCargado ? 'actualizacion' : 'creacion',
                archivo: usarDocumento
                    ? data?.documento_dni?.nombre_archivo || documentoDNI?.name || 'Documento DNI'
                    : null,
            })

            redirigirASeleccionPlaza()
        } catch (err) {
            setError(err.message || 'Ocurrió un error al guardar el perfil.')
        } finally {
            setCargando(false)
        }
    }

    const SuccessModal = () => {
        if (!successInfo) return null

        const esActualizacion = successInfo.modo === 'actualizacion'

        return (
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(17, 24, 39, 0.55)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 520,
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: 8,
                            background: 'linear-gradient(90deg, #1E3A5F 0%, #10B981 100%)',
                        }}
                    />

                    <div style={{ padding: '34px 34px 30px' }}>
                        <div className='d-flex justify-content-center mb-6'>
                            <div
                                className='d-flex align-items-center justify-content-center'
                                style={{
                                    width: 76,
                                    height: 76,
                                    borderRadius: '50%',
                                    backgroundColor: '#ECFDF5',
                                    border: '2px solid #A7F3D0',
                                    color: '#059669',
                                    fontSize: 34,
                                }}
                            >
                                <i className='fas fa-check' />
                            </div>
                        </div>

                        <div className='text-center mb-5'>
                            <h3 className='font-weight-bolder text-dark mb-3'>
                                {esActualizacion ? 'Perfil actualizado correctamente' : 'Perfil guardado correctamente'}
                            </h3>

                            <p className='text-muted font-size-lg mb-0'>
                                Serás dirigido automáticamente a la selección de plaza.
                            </p>
                        </div>

                        {successInfo.archivo && (
                            <div
                                className='d-flex align-items-center mb-6'
                                style={{
                                    backgroundColor: '#F3F6F9',
                                    borderRadius: 12,
                                    padding: '13px 15px',
                                }}
                            >
                                <div
                                    className='d-flex align-items-center justify-content-center mr-3'
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 10,
                                        backgroundColor: '#E1F0FF',
                                        color: '#1E3A5F',
                                        flex: '0 0 38px',
                                    }}
                                >
                                    <i className='fas fa-file-alt' />
                                </div>

                                <div>
                                    <div className='font-weight-bold text-dark font-size-sm'>
                                        Documento registrado
                                    </div>
                                    <div className='text-muted font-size-sm'>
                                        {successInfo.archivo}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div
                            className='progress'
                            style={{
                                height: 7,
                                borderRadius: 20,
                                backgroundColor: '#E5E7EB',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                className='progress-bar progress-bar-striped progress-bar-animated'
                                role='progressbar'
                                style={{
                                    width: '100%',
                                    backgroundColor: '#10B981',
                                }}
                            />
                        </div>

                        <div className='text-center text-success font-size-sm font-weight-bold mt-4'>
                            Redirigiendo
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const perfilPuedeContinuar = perfilCompleto && perfilCargado && !modoEdicion

    return (
        <div className='card card-custom'>
            <SuccessModal />

            <div className='card-header border-0 pt-5' style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)' }}>
                <div className='d-flex justify-content-between align-items-center w-100'>
                    <div>
                        <h3 className='card-label font-weight-bolder text-white font-size-h3'>
                            <i className='fas fa-user-circle mr-3' />
                            Mi Perfil
                        </h3>
                        <span className='text-white opacity-70 mt-1 font-weight-bold font-size-sm d-block'>
                            {modoEdicion ? 'Completa o actualiza tus datos personales' : 'Información personal'}
                        </span>
                    </div>

                    {!modoEdicion && perfilCargado && (
                        <div className='d-flex align-items-center'>
                            {perfilPuedeContinuar && (
                                <button
                                    type='button'
                                    className='btn btn-success font-weight-bold mr-3'
                                    onClick={() => irASeleccionPlaza(false)}
                                >
                                    Continuar a selección de plaza
                                </button>
                            )}

                            <button
                                type='button'
                                className='btn btn-light-primary font-weight-bold'
                                onClick={() => setModoEdicion(true)}
                            >
                                <i className='fas fa-edit mr-2' />
                                Editar Perfil
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className='form'>
                <div className='card-body'>

                    {error && (
                        <div className='alert alert-custom alert-light-danger mb-8'>
                            <div className='alert-icon'>
                                <i className='fas fa-exclamation-circle text-danger' />
                            </div>
                            <div className='alert-text'>
                                <strong>No se pudo continuar:</strong> {error}
                            </div>
                        </div>
                    )}

                    {!perfilCargado && !cargandoPerfil && (
                        <div className='alert alert-custom alert-light-warning mb-8'>
                            <div className='alert-icon'>
                                <i className='flaticon-warning text-warning' />
                            </div>
                            <div className='alert-text'>
                                <strong>Atención:</strong> Debes completar tu perfil para poder acceder a las convocatorias y realizar postulaciones.
                            </div>
                        </div>
                    )}

                    {cargandoPerfil && (
                        <div className='alert alert-custom alert-light mb-8'>
                            <div className='alert-icon'>
                                <span className='spinner spinner-primary' />
                            </div>
                            <div className='alert-text'>
                                Cargando datos del perfil...
                            </div>
                        </div>
                    )}

                    <div className='mb-8'>
                        <h5 className='font-weight-bolder mb-4 text-dark'>
                            <i className='fas fa-id-card mr-2 text-primary' />
                            Datos de Registro
                        </h5>
                        <div className='row'>
                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='text-muted font-size-sm'>Nombres completos</label>
                                    <input
                                        type='text'
                                        className='form-control form-control-solid'
                                        value={user?.fullname || user?.nombre_completo || ''}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='text-muted font-size-sm'>DNI</label>
                                    <input
                                        type='text'
                                        className='form-control form-control-solid'
                                        value={user?.numero_documento || ''}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='text-muted font-size-sm'>Correo electrónico</label>
                                    <input
                                        type='text'
                                        className='form-control form-control-solid'
                                        value={user?.email || ''}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='mb-8'>
                        <h5 className='font-weight-bolder mb-4 text-dark'>
                            <i className='fas fa-phone mr-2 text-success' />
                            Datos de Contacto
                        </h5>

                        <div className='row'>
                            <div className='col-md-6'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>
                                        Celular <span className='text-danger'>*</span>
                                    </label>
                                    <input
                                        type='tel'
                                        className='form-control form-control-lg'
                                        placeholder='965 123 456'
                                        value={celular}
                                        onChange={(e) => {
                                            setCelular(e.target.value.replace(/\D/g, ''))
                                            setError('')
                                        }}
                                        maxLength={15}
                                        disabled={!modoEdicion || cargando}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <h5 className='font-weight-bolder mb-4 mt-6 text-dark'>
                            <i className='fas fa-map-marker-alt mr-2 text-danger' />
                            Ubicación
                        </h5>

                        <div className='row'>
                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Departamento <span className='text-danger'>*</span></label>
                                    <select
                                        className='form-control form-control-lg'
                                        value={departamentoId}
                                        onChange={handleDepartamentoChange}
                                        disabled={!modoEdicion || cargandoDepartamentos || cargando}
                                        required
                                    >
                                        <option value=''>
                                            {cargandoDepartamentos ? 'Cargando...' : 'Selecciona...'}
                                        </option>
                                        {departamentos.map((d) => (
                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Provincia <span className='text-danger'>*</span></label>
                                    <select
                                        className='form-control form-control-lg'
                                        value={provinciaId}
                                        onChange={handleProvinciaChange}
                                        disabled={!modoEdicion || !departamentoId || cargandoProvincias || cargando}
                                        required
                                    >
                                        <option value=''>
                                            {cargandoProvincias ? 'Cargando...' : 'Selecciona...'}
                                        </option>
                                        {provincias.map((p) => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Distrito <span className='text-danger'>*</span></label>
                                    <select
                                        className='form-control form-control-lg'
                                        value={distritoId}
                                        onChange={(e) => {
                                            setDistritoId(e.target.value)
                                            setError('')
                                        }}
                                        disabled={!modoEdicion || !provinciaId || cargandoDistritos || cargando}
                                        required
                                    >
                                        <option value=''>
                                            {cargandoDistritos ? 'Cargando...' : 'Selecciona...'}
                                        </option>
                                        {distritos.map((d) => (
                                            <option key={d.id} value={d.id}>{d.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className='row'>
                            <div className='col-12'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Dirección exacta <span className='text-danger'>*</span></label>
                                    <textarea
                                        className='form-control form-control-lg'
                                        rows={2}
                                        placeholder='Calle, número, urbanización, referencia...'
                                        value={direccion}
                                        onChange={(e) => {
                                            setDireccion(e.target.value)
                                            setError('')
                                        }}
                                        disabled={!modoEdicion || cargando}
                                        required
                                        style={{ resize: 'none' }}
                                    />
                                    <span className='form-text text-muted'>
                                        Ejemplo: Jr. Los Pinos 123, Urb. Las Flores, frente al parque
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {modoEdicion && (
                        <div className='mb-8'>
                            <h5 className='font-weight-bolder mb-4 text-dark'>
                                <i className='fas fa-file-upload mr-2 text-info' />
                                Documento de Identidad
                            </h5>

                            {documentoDNIUrl && (
                                <div className='alert alert-custom alert-light-success mb-4'>
                                    <div className='alert-icon'>
                                        <i className='fas fa-check-circle text-success' />
                                    </div>
                                    <div className='alert-text'>
                                        <strong>DNI cargado:</strong> Ya tienes un documento de identidad registrado.
                                        {' '}
                                        <a
                                            href={`http://localhost:8000/storage/${documentoDNIUrl}?v=${Date.now()}`}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='font-weight-bold'
                                        >
                                            Ver documento <i className='fas fa-external-link-alt ml-1' />
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className='row'>
                                <div className='col-md-6'>
                                    <div className='form-group'>
                                        <label className='font-weight-bold'>
                                            {documentoDNIUrl ? 'Actualizar DNI (Opcional)' : 'Subir DNI (PDF, JPG o PNG)'}
                                            {!documentoDNIUrl && <span className='text-danger'> *</span>}
                                        </label>
                                        <div className='custom-file'>
                                            <input
                                                type='file'
                                                className='custom-file-input'
                                                id='documentoDNI'
                                                accept='.pdf,.jpg,.jpeg,.png'
                                                onChange={handleFileChange}
                                                required={!documentoDNIUrl}
                                                disabled={cargando}
                                            />
                                            <label className='custom-file-label' htmlFor='documentoDNI'>
                                                {documentoDNI ? documentoDNI.name : 'Seleccionar archivo...'}
                                            </label>
                                        </div>
                                        <span className='form-text text-muted'>
                                            Tamaño máximo: 5 MB. Formatos permitidos: PDF, JPG, PNG.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {modoEdicion && (
                    <div className='card-footer border-top py-5'>
                        <div className='d-flex justify-content-between'>
                            {perfilCargado && (
                                <button
                                    type='button'
                                    className='btn btn-light-secondary font-weight-bold px-8'
                                    onClick={() => {
                                        setModoEdicion(false)
                                        setError('')
                                        setDocumentoDNI(null)
                                    }}
                                    disabled={cargando}
                                >
                                    Cancelar
                                </button>
                            )}

                            <button
                                type='submit'
                                className='btn btn-primary font-weight-bold px-8 ml-auto'
                                disabled={cargando}
                            >
                                {cargando ? (
                                    <>
                                        <span className='spinner-border spinner-border-sm mr-2' />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <i className='fas fa-save mr-2' />
                                        {perfilCargado ? 'Guardar Cambios' : 'Completar Perfil'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    )
}