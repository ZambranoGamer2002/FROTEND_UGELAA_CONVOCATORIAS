import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

export default function MiPerfilPage() {
    const auth = useSelector((s) => s.auth)
    const token = auth?.authToken || ''
    const user = auth?.user || {}

    // Estados del formulario
    const [celular, setCelular] = useState('')
    const [departamentoId, setDepartamentoId] = useState('')
    const [provinciaId, setProvinciaId] = useState('')
    const [distritoId, setDistritoId] = useState('')
    const [direccion, setDireccion] = useState('')
    const [documentoDNI, setDocumentoDNI] = useState(null)
    const [documentoDNIUrl, setDocumentoDNIUrl] = useState(null) // ← AGREGAR

    // Ubigeo
    const [departamentos, setDepartamentos] = useState([])
    const [provincias, setProvincias] = useState([])
    const [distritos, setDistritos] = useState([])

    // Estados UI
    const [cargando, setCargando] = useState(false)
    const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true)
    const [cargandoProvincias, setCargandoProvincias] = useState(false)
    const [cargandoDistritos, setCargandoDistritos] = useState(false)
    const [modoEdicion, setModoEdicion] = useState(false)
    const [perfilCargado, setPerfilCargado] = useState(false)

    const headers = { Authorization: `Bearer ${token}` }

    // ========== CARGAR PERFIL EXISTENTE ==========
    useEffect(() => {
        const cargarPerfil = async () => {
            try {
                const resp = await fetch(`${API_BASE}/perfil/mi-perfil`, { headers })
                if (resp.ok) {
                    const data = await resp.json()

                    console.log('📊 Perfil cargado:', data)

                    // Extraer datos_personales del response
                    const datosPersonales = data.datos_personales

                    if (datosPersonales) {
                        // Llenar formulario con datos existentes
                        if (datosPersonales.celular) setCelular(datosPersonales.celular)
                        if (datosPersonales.direccion) setDireccion(datosPersonales.direccion)
                        if (datosPersonales.departamento_id) setDepartamentoId(datosPersonales.departamento_id.toString())
                        if (datosPersonales.provincia_id) setProvinciaId(datosPersonales.provincia_id.toString())
                        if (datosPersonales.distrito_id) setDistritoId(datosPersonales.distrito_id.toString())

                        // ← AGREGAR: Cargar URL del DNI
                        if (datosPersonales.documento_dni_url) {
                            setDocumentoDNIUrl(datosPersonales.documento_dni_url)
                        }

                        setPerfilCargado(true)

                        // Si ya tiene datos, está en modo visualización
                        if (datosPersonales.celular && datosPersonales.direccion) {
                            setModoEdicion(false)
                        } else {
                            // Si no tiene datos, está en modo edición
                            setModoEdicion(true)
                        }
                    } else {
                        // No hay datos_personales, primera vez
                        setModoEdicion(true)
                    }
                }
            } catch (err) {
                console.error('Error al cargar perfil:', err)
                setModoEdicion(true) // Si falla, permitir edición
            }
        }

        if (token) cargarPerfil()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    // Cargar departamentos
    useEffect(() => {
        const cargar = async () => {
            try {
                const resp = await fetch(`${API_BASE}/ubigeo/departamentos`, { headers })
                const data = await resp.json()
                setDepartamentos(Array.isArray(data) ? data : data.data || [])
            } catch (err) {
                console.error('Error al cargar departamentos:', err)
            } finally {
                setCargandoDepartamentos(false)
            }
        }
        if (token) cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    // Cargar provincias cuando se selecciona departamento o al cargar perfil
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
            } finally {
                setCargandoProvincias(false)
            }
        }
        cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [departamentoId])

    // Cargar distritos cuando se selecciona provincia o al cargar perfil
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
            } finally {
                setCargandoDistritos(false)
            }
        }
        cargar()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [provinciaId])

    // Cargar departamentos cuando cambia
    const handleDepartamentoChange = (e) => {
        const deptId = e.target.value
        setDepartamentoId(deptId)
        setProvinciaId('')
        setDistritoId('')
        setProvincias([])
        setDistritos([])
    }

    // Cargar provincias cuando cambia
    const handleProvinciaChange = (e) => {
        const provId = e.target.value
        setProvinciaId(provId)
        setDistritoId('')
        setDistritos([])
    }

    // Manejar cambio de archivo
    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ El archivo no debe superar 5 MB')
            e.target.value = ''
            return
        }

        // Validar formato
        const extensionesPermitidas = ['pdf', 'jpg', 'jpeg', 'png']
        const extension = file.name.split('.').pop().toLowerCase()
        if (!extensionesPermitidas.includes(extension)) {
            alert('❌ Solo se permiten archivos PDF, JPG o PNG')
            e.target.value = ''
            return
        }

        setDocumentoDNI(file)
    }

    // Enviar formulario
    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validaciones
        if (!celular || celular.length < 9) {
            alert('⚠️ Ingresa un número de celular válido')
            return
        }

        if (!departamentoId || !provinciaId || !distritoId) {
            alert('⚠️ Debes seleccionar departamento, provincia y distrito')
            return
        }

        if (!direccion.trim()) {
            alert('⚠️ Ingresa tu dirección completa')
            return
        }

        // Solo validar DNI si no está cargado y es primera vez
        if (!perfilCargado && !documentoDNI) {
            alert('⚠️ Debes subir tu documento de identidad (DNI)')
            return
        }

        setCargando(true)

        try {
            // Preparar FormData
            const formData = new FormData()
            formData.append('celular', celular)
            formData.append('departamento_id', departamentoId)
            formData.append('provincia_id', provinciaId)
            formData.append('distrito_id', distritoId)
            formData.append('direccion', direccion.toUpperCase())

            if (documentoDNI) {
                formData.append('documento_dni', documentoDNI)
            }

            // Enviar
            const resp = await fetch(`${API_BASE}/perfil/completar`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            })

            const data = await resp.json()

            if (!resp.ok) {
                throw new Error(data.detail || 'Error al guardar perfil')
            }

            alert('✅ Perfil guardado exitosamente')

            // Cambiar a modo visualización
            setModoEdicion(false)
            setPerfilCargado(true)

            // Actualizar usuario en localStorage
            const userStorage = JSON.parse(localStorage.getItem('user') || '{}')
            userStorage.perfil_completo = true
            localStorage.setItem('user', JSON.stringify(userStorage))

        } catch (err) {
            alert('❌ ' + err.message)
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className='card card-custom'>
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
                        <button
                            type='button'
                            className='btn btn-light-primary font-weight-bold'
                            onClick={() => setModoEdicion(true)}
                        >
                            <i className='fas fa-edit mr-2' />
                            Editar Perfil
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className='form'>
                <div className='card-body'>

                    {/* Alerta informativa */}
                    {!perfilCargado && (
                        <div className='alert alert-custom alert-light-warning mb-8'>
                            <div className='alert-icon'>
                                <i className='flaticon-warning text-warning' />
                            </div>
                            <div className='alert-text'>
                                <strong>Atención:</strong> Debes completar tu perfil para poder acceder a las convocatorias y realizar postulaciones.
                            </div>
                        </div>
                    )}

                    {/* Datos de usuario (solo lectura) */}
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
                                        value={user?.fullname || ''}
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

                    {/* Datos adicionales */}
                    <div className='mb-8'>
                        <h5 className='font-weight-bolder mb-4 text-dark'>
                            <i className='fas fa-phone mr-2 text-success' />
                            Datos de Contacto
                        </h5>

                        {/* Celular */}
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
                                        onChange={(e) => setCelular(e.target.value.replace(/\D/g, ''))}
                                        maxLength={15}
                                        disabled={!modoEdicion}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <h5 className='font-weight-bolder mb-4 mt-6 text-dark'>
                            <i className='fas fa-map-marker-alt mr-2 text-danger' />
                            Ubicación
                        </h5>

                        {/* Ubicación */}
                        <div className='row'>
                            <div className='col-md-4'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Departamento <span className='text-danger'>*</span></label>
                                    <select
                                        className='form-control form-control-lg'
                                        value={departamentoId}
                                        onChange={handleDepartamentoChange}
                                        disabled={!modoEdicion || cargandoDepartamentos}
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
                                        disabled={!modoEdicion || !departamentoId || cargandoProvincias}
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
                                        onChange={(e) => setDistritoId(e.target.value)}
                                        disabled={!modoEdicion || !provinciaId || cargandoDistritos}
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

                        {/* Dirección */}
                        <div className='row'>
                            <div className='col-12'>
                                <div className='form-group'>
                                    <label className='font-weight-bold'>Dirección exacta <span className='text-danger'>*</span></label>
                                    <textarea
                                        className='form-control form-control-lg'
                                        rows={2}
                                        placeholder='Calle, número, urbanización, referencia...'
                                        value={direccion}
                                        onChange={(e) => setDireccion(e.target.value)}
                                        disabled={!modoEdicion}
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

                    {/* Upload DNI - solo en modo edición y si no está cargado */}
                    {modoEdicion && (
                        <div className='mb-8'>
                            <h5 className='font-weight-bolder mb-4 text-dark'>
                                <i className='fas fa-file-upload mr-2 text-info' />
                                Documento de Identidad
                            </h5>

                            {/* Mostrar DNI actual si existe */}
                            {documentoDNIUrl && (
                                <div className='alert alert-custom alert-light-success mb-4'>
                                    <div className='alert-icon'>
                                        <i className='fas fa-check-circle text-success' />
                                    </div>
                                    <div className='alert-text'>
                                        <strong>DNI Cargado:</strong> Ya tienes un documento de identidad registrado.
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
                                            {perfilCargado ? 'Actualizar DNI (Opcional)' : 'Subir DNI (PDF, JPG o PNG)'}
                                            {!perfilCargado && <span className='text-danger'> *</span>}
                                        </label>
                                        <div className='custom-file'>
                                            <input
                                                type='file'
                                                className='custom-file-input'
                                                id='documentoDNI'
                                                accept='.pdf,.jpg,.jpeg,.png'
                                                onChange={handleFileChange}
                                                required={!perfilCargado}
                                            />
                                            <label className='custom-file-label' htmlFor='documentoDNI'>
                                                {documentoDNI ? documentoDNI.name : 'Seleccionar archivo...'}
                                            </label>
                                        </div>
                                        <span className='form-text text-muted'>
                                            Tamaño máximo: 5 MB. Formatos permitidos: PDF, JPG, PNG
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer - solo en modo edición */}
                {modoEdicion && (
                    <div className='card-footer border-top py-5'>
                        <div className='d-flex justify-content-between'>
                            {perfilCargado && (
                                <button
                                    type='button'
                                    className='btn btn-light-secondary font-weight-bold px-8'
                                    onClick={() => setModoEdicion(false)}
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