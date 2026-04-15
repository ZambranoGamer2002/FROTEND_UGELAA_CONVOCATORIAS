/**
 * SeleccionPlazaPage.js
 * Wizard de selección de plaza — v2
 *
 * Cambios vs v1:
 * - Color de carpeta lo asigna el sistema (solo informativo)
 * - Estatal es default (no requiere acción)
 * - Bilingüe muestra notas del docente (oral/escrito)
 * - Convenio permite subir documento + código anexo
 * - Fix: convocatoria_id desde query param
 */
import React, { useState, useEffect, useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import Swal from "sweetalert2";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// ─── Instancia pública (sin interceptors de auth) ────────────────────────────
const axiosPublico = axios.create({ baseURL: API_URL });

// ─── Helper token ────────────────────────────────────────────────────────────
const useToken = () => {
    const auth = useSelector((s) => s.auth);
    return (
        auth?.authToken ||
        auth?.accessToken ||
        auth?.token ||
        localStorage.getItem("token") ||
        null
    );
};

// ─── Niveles de lengua ───────────────────────────────────────────────────────
const NIVEL_LABEL = {
    BASICO: "Básico",
    AVANZADO: "Avanzado",
    NATIVO: "Nativo",
};

// ─── Badge de nivel ──────────────────────────────────────────────────────────
const NivelBadge = ({ nivel }) => {
    if (!nivel) return <span className="text-muted">—</span>;
    const colors = {
        BASICO: { bg: "#FFF4DE", text: "#FFA800" },
        AVANZADO: { bg: "#E8FFF3", text: "#1BC5BD" },
        NATIVO: { bg: "#EEE5FF", text: "#8950FC" },
    };
    const c = colors[nivel] || { bg: "#F3F6F9", text: "#7E8299" };
    return (
        <span
            className="label label-inline font-weight-bold"
            style={{ backgroundColor: c.bg, color: c.text, padding: "4px 10px" }}
        >
            {NIVEL_LABEL[nivel] || nivel}
        </span>
    );
};

// ─── Step Indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ pasoActual }) => {
    const pasos = [
        { num: 1, label: "Modalidad" },
        { num: 2, label: "Nivel" },
        { num: 3, label: "Especialidad" },
        { num: 4, label: "Confirmación" },
    ];
    return (
        <div className="d-flex align-items-center justify-content-center mb-8">
            {pasos.map((paso, idx) => (
                <React.Fragment key={paso.num}>
                    <div className="d-flex flex-column align-items-center">
                        <div
                            className="d-flex align-items-center justify-content-center rounded-circle font-weight-bolder"
                            style={{
                                width: 40, height: 40, fontSize: 15,
                                backgroundColor:
                                    pasoActual > paso.num ? "#1BC5BD" :
                                        pasoActual === paso.num ? "#3699FF" : "#EBEDF3",
                                color: pasoActual >= paso.num ? "#fff" : "#B5B5C3",
                                transition: "all 0.3s ease",
                            }}
                        >
                            {pasoActual > paso.num ? "✓" : paso.num}
                        </div>
                        <span
                            className="mt-2 font-size-xs font-weight-bold"
                            style={{ color: pasoActual === paso.num ? "#3699FF" : "#B5B5C3" }}
                        >
                            {paso.label}
                        </span>
                    </div>
                    {idx < pasos.length - 1 && (
                        <div style={{
                            flex: 1, height: 3, marginBottom: 22,
                            marginLeft: 6, marginRight: 6,
                            backgroundColor: pasoActual > paso.num ? "#1BC5BD" : "#EBEDF3",
                            transition: "all 0.3s ease",
                        }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const SeleccionPlazaPage = () => {
    const history = useHistory();
    const location = useLocation();
    const token = useToken();

    // convocatoria_id desde query param o state
    const convocatoriaId =
        new URLSearchParams(location.search).get("convocatoria_id") ||
        location.state?.convocatoria_id ||
        null;

    // ── Estado del wizard ─────────────────────────────────────────────────
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState(null);

    // ── Catálogo ──────────────────────────────────────────────────────────
    const [catalogo, setCatalogo] = useState([]);
    const [caracteristicas, setCaracteristicas] = useState([]);

    // ── Notas bilingüe del docente actual ─────────────────────────────────
    const [notaBilingue, setNotaBilingue] = useState(null);
    const [cargandoNota, setCargandoNota] = useState(false);

    // ── Convenio ──────────────────────────────────────────────────────────
    const [convenioArchivo, setConvenioArchivo] = useState(null);
    const [convenioCodigoAnexo, setConvenioCodigoAnexo] = useState("");
    const fileInputRef = useRef(null);

    // ── Selecciones ───────────────────────────────────────────────────────
    const [seleccion, setSeleccion] = useState({
        modalidad: null,
        nivel: null,
        especialidad: null,
        caracteristica: null,   // null = Estatal (default)
    });

    // ── Cargar catálogo al montar ─────────────────────────────────────────
    useEffect(() => { cargarCatalogo(); }, []); // eslint-disable-line

    // ── Cargar nota bilingüe cuando cambia la característica ──────────────
    useEffect(() => {
        const esbilingue = seleccion.caracteristica?.codigo === "BILINGUE" ||
            seleccion.caracteristica?.nombre?.toUpperCase().includes("BILING");
        if (esbilingue && token) {
            cargarNotaBilingue();
        } else {
            setNotaBilingue(null);
        }
    }, [seleccion.caracteristica]); // eslint-disable-line

    const cargarCatalogo = async () => {
        setCargando(true);
        setError(null);
        try {
            // ✅ axiosPublico — sin Authorization header
            const [resCatalogo, resCaract] = await Promise.allSettled([
                axiosPublico.get("/catalogo/plaza/cascada"),
                axiosPublico.get("/catalogo/caracteristicas"),
            ]);

            if (resCatalogo.status === "fulfilled") {
                setCatalogo(resCatalogo.value.data);
            } else {
                throw new Error("No se pudo cargar el catálogo");
            }

            if (resCaract.status === "fulfilled") {
                // Ordenar: Estatal primero
                const sorted = [...resCaract.value.data].sort((a, b) => {
                    if (a.nombre?.toUpperCase().includes("ESTATAL")) return -1;
                    if (b.nombre?.toUpperCase().includes("ESTATAL")) return 1;
                    return 0;
                });
                setCaracteristicas(sorted);
            }
        } catch (err) {
            console.error("❌ Error catálogo:", err.response?.status, err.config?.url);
            setError("No se pudo cargar el catálogo. Verifica tu conexión.");
        } finally {
            setCargando(false);
        }
    };

    const cargarNotaBilingue = async () => {
        if (!token) return;
        setCargandoNota(true);
        try {
            const res = await axios.get(`${API_URL}/catalogo/bilingue/docente/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotaBilingue(res.data);
        } catch (err) {
            // 404 = sin nota registrada — es válido, no es error crítico
            setNotaBilingue(null);
        } finally {
            setCargandoNota(false);
        }
    };

    // ── Helpers de selección en cascada ───────────────────────────────────
    const nivelesDisponibles = seleccion.modalidad?.niveles || [];
    const especialidadesDisponibles = seleccion.nivel?.especialidades || [];

    const seleccionarModalidad = (m) => {
        setSeleccion({ modalidad: m, nivel: null, especialidad: null, caracteristica: null });
        setPaso(2);
    };
    const seleccionarNivel = (n) => {
        setSeleccion((p) => ({ ...p, nivel: n, especialidad: null, caracteristica: null }));
        setPaso(3);
    };
    const seleccionarEspecialidad = (e) => {
        setSeleccion((p) => ({ ...p, especialidad: e, caracteristica: null }));
        setPaso(4);
    };
    const seleccionarCaracteristica = (c) => {
        // Toggle: si ya está seleccionada, deseleccionar (vuelve a Estatal)
        setSeleccion((p) => ({
            ...p,
            caracteristica: p.caracteristica?.id === c?.id ? null : c,
        }));
        setConvenioArchivo(null);
        setConvenioCodigoAnexo("");
    };

    // ── Determinar tipo de característica seleccionada ────────────────────
    const tipoCaracteristica = () => {
        if (!seleccion.caracteristica) return "ESTATAL";
        const nombre = seleccion.caracteristica.nombre?.toUpperCase() || "";
        if (nombre.includes("BILING")) return "BILINGUE";
        if (nombre.includes("CONVEN")) return "CONVENIO";
        return "OTRO";
    };

    // ── Confirmar postulación ─────────────────────────────────────────────
    const confirmarPostulacion = async () => {
        if (!convocatoriaId) {
            Swal.fire({
                icon: "error",
                title: "Sin convocatoria",
                text: "No se encontró la convocatoria. Regresa a Convocatorias y vuelve a intentarlo.",
                confirmButtonText: "Ir a Convocatorias",
                confirmButtonColor: "#3699FF",
            }).then(() => history.push("/convocatorias"));
            return;
        }

        // Validar convenio si aplica
        if (tipoCaracteristica() === "CONVENIO") {
            if (!convenioArchivo || !convenioCodigoAnexo.trim()) {
                Swal.fire({
                    icon: "warning",
                    title: "Datos incompletos",
                    text: "Debes subir el documento de convenio y el código de anexo.",
                });
                return;
            }
        }

        setEnviando(true);
        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const payload = {
                convocatoria_id: parseInt(convocatoriaId),
                modalidad_id: seleccion.modalidad.id,
                nivel_id: seleccion.nivel.id,
                especialidad_id: seleccion.especialidad.id,
                caracteristica_id: seleccion.caracteristica?.id || null,
            };

            const res = await axios.post(`${API_URL}/postulaciones/`, payload, { headers });

            // Si es convenio, subir documento
            if (tipoCaracteristica() === "CONVENIO" && convenioArchivo) {
                const formData = new FormData();
                formData.append("archivo", convenioArchivo);
                formData.append("codigo_anexo", convenioCodigoAnexo);
                await axios.post(
                    `${API_URL}/postulaciones/${res.data.id}/convenio`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            await Swal.fire({
                icon: "success",
                title: "¡Plaza seleccionada!",
                html: `
                    <p>Tu postulación fue creada correctamente.</p>
                    <p><strong>Código:</strong> ${res.data.codigo || "—"}</p>
                    <p class="text-muted">Ahora debes subir tus documentos obligatorios.</p>
                `,
                confirmButtonText: "Subir documentos",
                confirmButtonColor: "#3699FF",
            });

            history.push(`/postulaciones/${res.data.id}/documentos`);
        } catch (err) {
            const msg = err.response?.data?.detail || "Ocurrió un error al crear la postulación.";
            Swal.fire({ icon: "error", title: "Error", text: msg });
        } finally {
            setEnviando(false);
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // RENDER — Carga y error
    // ════════════════════════════════════════════════════════════════════════
    if (cargando) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
                <div className="text-center">
                    <div className="spinner spinner-primary spinner-lg mb-4" />
                    <p className="text-muted font-weight-bold">Cargando catálogo de plazas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
                <div className="text-center">
                    <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: 48 }} />
                    <p className="text-danger font-weight-bold mt-4">{error}</p>
                    <button className="btn btn-primary" onClick={cargarCatalogo}>Reintentar</button>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // RENDER PRINCIPAL
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="container-fluid px-0">

            {/* HEADER */}
            <div className="card card-custom mb-7" style={{
                background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)", border: "none"
            }}>
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h2 className="text-white font-weight-bolder mb-2">Selección de Plaza</h2>
                            <p className="text-white mb-0" style={{ opacity: 0.8 }}>
                                Elige tu modalidad, nivel y especialidad para postular.
                            </p>
                        </div>
                        {/* Resumen en header */}
                        <div className="text-right d-none d-md-block">
                            {seleccion.modalidad && (
                                <span className="label label-light-primary label-inline label-lg font-weight-bold mr-2">
                                    {seleccion.modalidad.nombre}
                                </span>
                            )}
                            {seleccion.nivel && (
                                <span className="label label-light-success label-inline label-lg font-weight-bold mr-2">
                                    {seleccion.nivel.nombre}
                                </span>
                            )}
                            {seleccion.especialidad && (
                                <span
                                    className="label label-inline label-lg font-weight-bold"
                                    style={{
                                        backgroundColor: seleccion.especialidad.color_folder_hex || "#ccc",
                                        color: "#fff"
                                    }}
                                >
                                    📁 {seleccion.especialidad.nombre}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* ── CONTENIDO PRINCIPAL ─────────────────────────────────── */}
                <div className="col-xl-8 col-lg-8">
                    <div className="card card-custom">
                        <div className="card-body">
                            <StepIndicator pasoActual={paso} />

                            {/* ══ PASO 1 — MODALIDAD ══════════════════════════ */}
                            {paso === 1 && (
                                <div>
                                    <h4 className="font-weight-bolder text-dark mb-2">
                                        ¿A qué modalidad postulas?
                                    </h4>
                                    <p className="text-muted mb-6">
                                        Selecciona la modalidad educativa correspondiente a tu plaza.
                                    </p>
                                    <div className="row">
                                        {catalogo.map((modalidad) => (
                                            <div key={modalidad.id} className="col-md-6 mb-4">
                                                <div
                                                    className="border rounded p-5 h-100"
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "all 0.2s ease",
                                                        borderColor: seleccion.modalidad?.id === modalidad.id ? "#3699FF" : "#EBEDF3",
                                                        backgroundColor: seleccion.modalidad?.id === modalidad.id ? "#EEF6FF" : "#fff",
                                                    }}
                                                    onClick={() => seleccionarModalidad(modalidad)}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div className="d-flex align-items-center justify-content-center rounded mr-4"
                                                            style={{ width: 48, height: 48, backgroundColor: "#EEF6FF", flexShrink: 0 }}>
                                                            <i className="fas fa-graduation-cap text-primary" style={{ fontSize: 22 }} />
                                                        </div>
                                                        <div>
                                                            <p className="font-weight-bolder text-dark mb-1 font-size-lg">
                                                                {modalidad.nombre}
                                                            </p>
                                                            <span className="text-muted font-size-sm">
                                                                {modalidad.niveles?.length || 0} nivel(es)
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ══ PASO 2 — NIVEL ══════════════════════════════ */}
                            {paso === 2 && (
                                <div>
                                    <div className="d-flex align-items-center mb-6">
                                        <button className="btn btn-icon btn-light btn-sm mr-3" onClick={() => setPaso(1)}>
                                            <i className="fas fa-arrow-left" />
                                        </button>
                                        <div>
                                            <h4 className="font-weight-bolder text-dark mb-1">¿A qué nivel postulas?</h4>
                                            <span className="text-muted">
                                                Modalidad: <strong className="text-primary">{seleccion.modalidad?.nombre}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    {nivelesDisponibles.length === 0 ? (
                                        <div className="alert alert-warning">
                                            <i className="fas fa-exclamation-triangle mr-2" />
                                            Esta modalidad no tiene niveles disponibles.
                                        </div>
                                    ) : (
                                        <div className="row">
                                            {nivelesDisponibles.map((nivel) => (
                                                <div key={nivel.id} className="col-md-6 mb-4">
                                                    <div
                                                        className="border rounded p-5"
                                                        style={{
                                                            cursor: "pointer",
                                                            transition: "all 0.2s ease",
                                                            borderColor: seleccion.nivel?.id === nivel.id ? "#1BC5BD" : "#EBEDF3",
                                                            backgroundColor: seleccion.nivel?.id === nivel.id ? "#E8FFF3" : "#fff",
                                                        }}
                                                        onClick={() => seleccionarNivel(nivel)}
                                                    >
                                                        <div className="d-flex align-items-center">
                                                            <div className="d-flex align-items-center justify-content-center rounded mr-4"
                                                                style={{ width: 48, height: 48, backgroundColor: "#E8FFF3", flexShrink: 0 }}>
                                                                <i className="fas fa-layer-group text-success" style={{ fontSize: 20 }} />
                                                            </div>
                                                            <div>
                                                                <p className="font-weight-bolder text-dark mb-1 font-size-lg">
                                                                    {nivel.nombre}
                                                                </p>
                                                                <span className="text-muted font-size-sm">
                                                                    {nivel.especialidades?.length || 0} especialidad(es)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ══ PASO 3 — ESPECIALIDAD ═══════════════════════ */}
                            {paso === 3 && (
                                <div>
                                    <div className="d-flex align-items-center mb-6">
                                        <button className="btn btn-icon btn-light btn-sm mr-3" onClick={() => setPaso(2)}>
                                            <i className="fas fa-arrow-left" />
                                        </button>
                                        <div>
                                            <h4 className="font-weight-bolder text-dark mb-1">¿Cuál es tu especialidad?</h4>
                                            <span className="text-muted">
                                                {seleccion.modalidad?.nombre} → <strong className="text-success">{seleccion.nivel?.nombre}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    {especialidadesDisponibles.length === 0 ? (
                                        <div className="alert alert-warning">
                                            <i className="fas fa-exclamation-triangle mr-2" />
                                            Este nivel no tiene especialidades disponibles.
                                        </div>
                                    ) : (
                                        <div className="row">
                                            {especialidadesDisponibles.map((esp) => (
                                                <div key={esp.id} className="col-md-6 col-lg-4 mb-4">
                                                    <div
                                                        className="border rounded p-4"
                                                        style={{
                                                            cursor: "pointer",
                                                            transition: "all 0.2s ease",
                                                            borderColor: seleccion.especialidad?.id === esp.id
                                                                ? esp.color_folder_hex || "#3699FF" : "#EBEDF3",
                                                            backgroundColor: seleccion.especialidad?.id === esp.id
                                                                ? `${esp.color_folder_hex}18` : "#fff",
                                                        }}
                                                        onClick={() => seleccionarEspecialidad(esp)}
                                                    >
                                                        {/* Ícono de carpeta con color del sistema */}
                                                        <div className="d-flex align-items-center justify-content-center rounded mx-auto mb-3"
                                                            style={{
                                                                width: 52, height: 52,
                                                                backgroundColor: esp.color_folder_hex || "#ccc",
                                                            }}>
                                                            <i className="fas fa-folder-open" style={{ fontSize: 24, color: "#fff" }} />
                                                        </div>
                                                        <p className="font-weight-bolder text-dark mb-1 font-size-sm text-center">
                                                            {esp.nombre}
                                                        </p>
                                                        {/* ✅ Color asignado por el sistema — solo informativo */}
                                                        <div className="text-center">
                                                            <span className="text-muted font-size-xs">
                                                                Carpeta: <strong>{esp.color_folder || "—"}</strong>
                                                            </span>
                                                        </div>
                                                        {esp.anexo6_numero && (
                                                            <p className="text-muted font-size-xs mt-1 mb-0 text-center">
                                                                Anexo 6 N° {esp.anexo6_numero}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ══ PASO 4 — CONFIRMACIÓN ═══════════════════════ */}
                            {paso === 4 && (
                                <div>
                                    <div className="d-flex align-items-center mb-6">
                                        <button className="btn btn-icon btn-light btn-sm mr-3" onClick={() => setPaso(3)}>
                                            <i className="fas fa-arrow-left" />
                                        </button>
                                        <div>
                                            <h4 className="font-weight-bolder text-dark mb-1">Confirma tu selección</h4>
                                            <p className="text-muted mb-0">Revisa los datos antes de continuar.</p>
                                        </div>
                                    </div>

                                    {/* Resumen selección */}
                                    <div className="bg-light-primary rounded p-6 mb-6">
                                        <div className="row">
                                            <div className="col-md-6 mb-4">
                                                <span className="text-muted font-size-sm d-block mb-1">Modalidad</span>
                                                <span className="font-weight-bolder text-dark font-size-h6">
                                                    {seleccion.modalidad?.nombre}
                                                </span>
                                            </div>
                                            <div className="col-md-6 mb-4">
                                                <span className="text-muted font-size-sm d-block mb-1">Nivel</span>
                                                <span className="font-weight-bolder text-dark font-size-h6">
                                                    {seleccion.nivel?.nombre}
                                                </span>
                                            </div>
                                            <div className="col-md-6 mb-4">
                                                <span className="text-muted font-size-sm d-block mb-1">Especialidad</span>
                                                <span className="font-weight-bolder text-dark font-size-h6">
                                                    {seleccion.especialidad?.nombre}
                                                </span>
                                            </div>
                                            <div className="col-md-6 mb-4">
                                                <span className="text-muted font-size-sm d-block mb-1">Carpeta asignada</span>
                                                {/* ✅ Solo informativo — asignado por el sistema */}
                                                <span
                                                    className="label label-inline font-weight-bold"
                                                    style={{
                                                        backgroundColor: seleccion.especialidad?.color_folder_hex || "#ccc",
                                                        color: "#fff", padding: "6px 14px", borderRadius: 4,
                                                    }}
                                                >
                                                    📁 {seleccion.especialidad?.color_folder || "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Característica ────────────────────────── */}
                                    <div className="mb-6">
                                        <label className="font-weight-bold text-dark mb-3 d-block">
                                            Característica de la plaza{" "}
                                            <span className="text-muted font-weight-normal">(opcional)</span>
                                        </label>

                                        <div className="row">
                                            {/* Estatal — siempre visible como opción default */}
                                            <div className="col-md-4 mb-3">
                                                <div
                                                    className="border rounded p-4 text-center"
                                                    style={{
                                                        cursor: "pointer",
                                                        borderColor: !seleccion.caracteristica ? "#3699FF" : "#EBEDF3",
                                                        backgroundColor: !seleccion.caracteristica ? "#EEF6FF" : "#fff",
                                                        transition: "all 0.2s ease",
                                                    }}
                                                    onClick={() => seleccionarCaracteristica(null)}
                                                >
                                                    <i className="fas fa-university mb-2"
                                                        style={{ fontSize: 20, color: !seleccion.caracteristica ? "#3699FF" : "#B5B5C3" }} />
                                                    <p className="font-weight-bold text-dark mb-1 font-size-sm">Estatal</p>
                                                    <span className="text-muted font-size-xs">Predeterminado</span>
                                                </div>
                                            </div>

                                            {/* Otras características (Bilingüe, Convenio) */}
                                            {caracteristicas
                                                .filter(c => !c.nombre?.toUpperCase().includes("ESTATAL"))
                                                .map((caract) => (
                                                    <div key={caract.id} className="col-md-4 mb-3">
                                                        <div
                                                            className="border rounded p-4 text-center"
                                                            style={{
                                                                cursor: "pointer",
                                                                transition: "all 0.2s ease",
                                                                borderColor: seleccion.caracteristica?.id === caract.id ? "#8950FC" : "#EBEDF3",
                                                                backgroundColor: seleccion.caracteristica?.id === caract.id ? "#EEE5FF" : "#fff",
                                                            }}
                                                            onClick={() => seleccionarCaracteristica(caract)}
                                                        >
                                                            <i className={`fas ${caract.nombre?.toUpperCase().includes("BILING")
                                                                ? "fa-language" : "fa-handshake"
                                                                } mb-2`}
                                                                style={{
                                                                    fontSize: 20,
                                                                    color: seleccion.caracteristica?.id === caract.id ? "#8950FC" : "#B5B5C3"
                                                                }}
                                                            />
                                                            <p className="font-weight-bold text-dark mb-1 font-size-sm">
                                                                {caract.nombre}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>

                                        {/* ── Panel Bilingüe ─────────────────────── */}
                                        {tipoCaracteristica() === "BILINGUE" && (
                                            <div className="border rounded p-5 mt-4"
                                                style={{ borderColor: "#8950FC", backgroundColor: "#F8F5FF" }}>
                                                <h6 className="font-weight-bolder mb-4" style={{ color: "#8950FC" }}>
                                                    <i className="fas fa-language mr-2" style={{ color: "#8950FC" }} />
                                                    Tus resultados de evaluación bilingüe
                                                </h6>

                                                {cargandoNota ? (
                                                    <div className="text-center py-3">
                                                        <div className="spinner spinner-sm spinner-primary" />
                                                        <span className="text-muted ml-2">Cargando notas...</span>
                                                    </div>
                                                ) : notaBilingue ? (
                                                    <div className="row">
                                                        <div className="col-md-4">
                                                            <span className="text-muted font-size-xs d-block mb-1">Lengua</span>
                                                            <span className="font-weight-bolder text-dark">
                                                                {notaBilingue.lengua}
                                                            </span>
                                                        </div>
                                                        <div className="col-md-4">
                                                            <span className="text-muted font-size-xs d-block mb-1">Oral</span>
                                                            <NivelBadge nivel={notaBilingue.nivel_oral} />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <span className="text-muted font-size-xs d-block mb-1">Escrito</span>
                                                            <NivelBadge nivel={notaBilingue.nivel_escrito} />
                                                        </div>
                                                        {notaBilingue.observaciones && (
                                                            <div className="col-12 mt-3">
                                                                <span className="text-muted font-size-xs d-block mb-1">Observaciones</span>
                                                                <span className="text-dark font-size-sm">
                                                                    {notaBilingue.observaciones}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="alert alert-warning mb-0">
                                                        <i className="fas fa-exclamation-triangle mr-2" />
                                                        No tienes notas bilingüe registradas.
                                                        Contacta al administrador para registrarlas.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Panel Convenio ─────────────────────── */}
                                        {tipoCaracteristica() === "CONVENIO" && (
                                            <div className="border rounded p-5 mt-4"
                                                style={{ borderColor: "#1BC5BD", backgroundColor: "#F0FFFE" }}>
                                                <h6 className="font-weight-bolder mb-4" style={{ color: "#1BC5BD" }}>
                                                    <i className="fas fa-handshake mr-2" style={{ color: "#1BC5BD" }} />
                                                    Documento de Convenio
                                                </h6>
                                                <div className="row">
                                                    <div className="col-md-6 mb-4">
                                                        <label className="font-weight-bold font-size-sm">
                                                            Código de Anexo *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control mt-1"
                                                            placeholder="Ej: CONV-2026-001"
                                                            value={convenioCodigoAnexo}
                                                            onChange={(e) => setConvenioCodigoAnexo(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-6 mb-4">
                                                        <label className="font-weight-bold font-size-sm">
                                                            Documento PDF *
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="file"
                                                                accept=".pdf"
                                                                ref={fileInputRef}
                                                                style={{ display: "none" }}
                                                                onChange={(e) => setConvenioArchivo(e.target.files[0] || null)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-light-primary btn-sm"
                                                                onClick={() => fileInputRef.current?.click()}
                                                            >
                                                                <i className="fas fa-upload mr-2" />
                                                                {convenioArchivo ? convenioArchivo.name : "Seleccionar PDF"}
                                                            </button>
                                                            {convenioArchivo && (
                                                                <span className="text-success font-size-xs ml-2">
                                                                    <i className="fas fa-check mr-1" />
                                                                    {(convenioArchivo.size / 1024).toFixed(0)} KB
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón confirmar */}
                                    <div className="d-flex justify-content-end">
                                        <button
                                            className="btn btn-primary font-weight-bolder px-8 py-4"
                                            onClick={confirmarPostulacion}
                                            disabled={enviando}
                                        >
                                            {enviando ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm mr-2" />
                                                    Creando postulación...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-check mr-2" />
                                                    Confirmar y continuar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── SIDEBAR ──────────────────────────────────────────────── */}
                <div className="col-xl-4 col-lg-4">
                    <div className="card card-custom">
                        <div className="card-header border-0 pt-6">
                            <h5 className="card-title font-weight-bolder text-dark">Tu selección</h5>
                        </div>
                        <div className="card-body pt-2">
                            {[
                                { label: "Modalidad", valor: seleccion.modalidad?.nombre, icon: "fa-graduation-cap", color: "#3699FF", bg: "#EEF6FF" },
                                { label: "Nivel", valor: seleccion.nivel?.nombre, icon: "fa-layer-group", color: "#1BC5BD", bg: "#E8FFF3" },
                                {
                                    label: "Especialidad", valor: seleccion.especialidad?.nombre, icon: "fa-folder",
                                    color: seleccion.especialidad?.color_folder_hex || "#B5B5C3",
                                    bg: seleccion.especialidad ? `${seleccion.especialidad.color_folder_hex}20` : "#F3F6F9"
                                },
                                {
                                    label: "Característica",
                                    valor: seleccion.caracteristica?.nombre || "Estatal (predeterminado)",
                                    icon: "fa-star", color: "#8950FC", bg: "#EEE5FF"
                                },
                            ].map(({ label, valor, icon, color, bg }) => (
                                <div key={label} className="d-flex align-items-center mb-5">
                                    <div className="d-flex align-items-center justify-content-center rounded mr-3"
                                        style={{ width: 36, height: 36, backgroundColor: bg, flexShrink: 0 }}>
                                        <i className={`fas ${icon}`} style={{ fontSize: 16, color }} />
                                    </div>
                                    <div>
                                        <span className="text-muted font-size-xs d-block">{label}</span>
                                        <span className={`font-weight-bold font-size-sm ${valor ? "text-dark" : "text-muted"}`}>
                                            {valor || "Sin seleccionar"}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            <div className="separator separator-dashed my-4" />

                            <div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted font-size-sm">Progreso</span>
                                    <span className="font-weight-bold font-size-sm text-primary">{paso - 1}/3</span>
                                </div>
                                <div className="progress progress-xs">
                                    <div className="progress-bar bg-primary"
                                        style={{ width: `${((paso - 1) / 3) * 100}%`, transition: "width 0.3s ease" }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Aviso sin convocatoria */}
                    {!convocatoriaId && (
                        <div className="card card-custom mt-4 border border-warning">
                            <div className="card-body py-4">
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-exclamation-triangle text-warning mr-3" style={{ fontSize: 20 }} />
                                    <div>
                                        <p className="font-weight-bold text-dark mb-1 font-size-sm">
                                            Sin convocatoria seleccionada
                                        </p>
                                        <p className="text-muted font-size-xs mb-0">
                                            Regresa a{" "}
                                            <span
                                                className="text-primary cursor-pointer"
                                                style={{ cursor: "pointer" }}
                                                onClick={() => history.push("/convocatorias")}
                                            >
                                                Convocatorias
                                            </span>{" "}
                                            y usa el botón Postular.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeleccionPlazaPage;
