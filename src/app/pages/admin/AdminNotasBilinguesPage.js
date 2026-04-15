/**
 * AdminNotasBilinguesPage.js
 * Panel del Admin para registrar/editar notas bilingüe de docentes
 *
 * Flujo:
 * 1. Admin busca docente por nombre o DNI
 * 2. Selecciona el docente de los resultados
 * 3. Llena lengua + nivel oral + nivel escrito + observaciones
 * 4. Guarda (crea o actualiza — upsert)
 */
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import debounce from "lodash/debounce";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// ─── Token ───────────────────────────────────────────────────────────────────
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

// ─── Opciones de nivel ────────────────────────────────────────────────────────
const NIVELES = [
    { value: "", label: "— Sin asignar —" },
    { value: "BASICO", label: "Básico" },
    { value: "AVANZADO", label: "Avanzado" },
    { value: "NATIVO", label: "Nativo" },
];

const NIVEL_COLORS = {
    BASICO: { bg: "#FFF4DE", text: "#FFA800" },
    AVANZADO: { bg: "#E8FFF3", text: "#1BC5BD" },
    NATIVO: { bg: "#EEE5FF", text: "#8950FC" },
};

const NivelBadge = ({ nivel }) => {
    if (!nivel) return <span className="text-muted">—</span>;
    const c = NIVEL_COLORS[nivel] || { bg: "#F3F6F9", text: "#7E8299" };
    return (
        <span
            className="label label-inline font-weight-bold"
            style={{ backgroundColor: c.bg, color: c.text, padding: "4px 12px" }}
        >
            {NIVELES.find((n) => n.value === nivel)?.label || nivel}
        </span>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const AdminNotasBilinguesPage = () => {
    const token = useToken();

    // ── Búsqueda de docente ───────────────────────────────────────────────
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [sinResultados, setSinResultados] = useState(false);

    // ── Docente seleccionado ──────────────────────────────────────────────
    const [docente, setDocente] = useState(null);
    const [notaExistente, setNotaExistente] = useState(null);
    const [cargandoNota, setCargandoNota] = useState(false);

    // ── Formulario ────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        lengua: "",
        nivel_oral: "",
        nivel_escrito: "",
        observaciones: "",
    });
    const [guardando, setGuardando] = useState(false);

    // ── Ref al token para usarlo dentro del debounce ──────────────────────
    const tokenRef = useRef(token);
    useEffect(() => { tokenRef.current = token; }, [token]);

    // ── Función debounced (única, estable) ────────────────────────────────
    const buscarDocentes = useRef(
        debounce(async (query) => {

            console.log("🚀 DEBOUNCE EJECUTADO");
            console.log("🔑 Token en debounce:", tokenRef.current);
            console.log("🌐 URL:", `${API_URL}/usuarios/buscar`);

            if (!query || query.trim().length < 2) {
                setResultados([]);
                setSinResultados(false);
                setBuscando(false);
                return;
            }

            setBuscando(true);
            setSinResultados(false);

            try {
                const res = await axios.get(`${API_URL}/usuarios/buscar`, {
                    params: { q: query.trim(), rol: "docente" },
                    headers: { Authorization: `Bearer ${tokenRef.current}` },
                });
                const lista = res.data?.results || res.data || [];
                setResultados(lista);
                setSinResultados(lista.length === 0);
            } catch (err) {
                console.error("❌ Error buscando docentes:", err);
                setResultados([]);
                setSinResultados(false);
            } finally {
                setBuscando(false);
            }
        }, 400)
    ).current;


    // ── Handler del input — ✅ CORREGIDO ──────────────────────────────────
    const handleChange = (event) => {
        const value = event.target.value; // ✅ guardamos INMEDIATAMENTE antes de cualquier async
        setBusqueda(value);              // ✅ usamos "value", no "val"

        if (!value || value.trim().length < 2) {
            setResultados([]);
            setSinResultados(false);
            setBuscando(false);
            buscarDocentes.cancel();
            return;
        }

        setBuscando(true); // spinner inmediato mientras espera el debounce
        buscarDocentes(value);
    };

    // ── Seleccionar docente y cargar nota existente ───────────────────────
    const seleccionarDocente = async (d) => {
        setDocente(d);
        setResultados([]);
        setBusqueda(`${d.first_name || ""} ${d.last_name || ""} — ${d.dni || d.username}`);
        setCargandoNota(true);
        setNotaExistente(null);
        setForm({ lengua: "", nivel_oral: "", nivel_escrito: "", observaciones: "" });

        try {
            const res = await axios.get(
                `${API_URL}/catalogo/bilingue/docente/${d.id}`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            if (res.data) {
                setNotaExistente(res.data);
                setForm({
                    lengua: res.data.lengua || "",
                    nivel_oral: res.data.nivel_oral || "",
                    nivel_escrito: res.data.nivel_escrito || "",
                    observaciones: res.data.observaciones || "",
                });
            }
        } catch {
            // Sin nota previa — formulario vacío
        } finally {
            setCargandoNota(false);
        }
    };

    // ── Limpiar selección ─────────────────────────────────────────────────
    const limpiarSeleccion = () => {
        setDocente(null);
        setNotaExistente(null);
        setBusqueda("");
        setResultados([]);
        setSinResultados(false);
        setBuscando(false);
        buscarDocentes.cancel();
        setForm({ lengua: "", nivel_oral: "", nivel_escrito: "", observaciones: "" });
    };

    // ── Guardar nota ──────────────────────────────────────────────────────
    const guardarNota = async () => {
        if (!docente) return;

        if (!form.lengua.trim()) {
            Swal.fire({ icon: "warning", title: "Campo requerido", text: "Debes ingresar la lengua." });
            return;
        }

        setGuardando(true);
        try {
            await axios.post(
                `${API_URL}/catalogo/bilingue/notas`,
                {
                    docente_id: docente.id,
                    lengua: form.lengua.trim(),
                    nivel_oral: form.nivel_oral || null,
                    nivel_escrito: form.nivel_escrito || null,
                    observaciones: form.observaciones.trim() || null,
                },
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );

            await Swal.fire({
                icon: "success",
                title: notaExistente ? "Nota actualizada" : "Nota registrada",
                text: `Los datos bilingüe de ${docente.first_name} fueron guardados correctamente.`,
                confirmButtonColor: "#3699FF",
            });

            await seleccionarDocente(docente);
        } catch (err) {
            const msg = err.response?.data?.detail || "Error al guardar la nota.";
            Swal.fire({ icon: "error", title: "Error", text: msg });
        } finally {
            setGuardando(false);
        }
    };

    // ── Eliminar nota ─────────────────────────────────────────────────────
    const eliminarNota = async () => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar nota?",
            text: `Se eliminará la nota bilingüe de ${docente?.first_name}. Esta acción no se puede deshacer.`,
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#F64E60",
        });
        if (!confirm.isConfirmed) return;

        try {
            await axios.delete(
                `${API_URL}/catalogo/bilingue/notas/${docente.id}`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            Swal.fire({ icon: "success", title: "Nota eliminada", confirmButtonColor: "#3699FF" });
            limpiarSeleccion();
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail || "No se pudo eliminar." });
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="container-fluid px-0">

            {/* HEADER */}
            <div className="card card-custom mb-7" style={{
                background: "linear-gradient(135deg, #3a1c71 0%, #8950FC 100%)", border: "none"
            }}>
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center justify-content-center rounded mr-5"
                            style={{ width: 56, height: 56, backgroundColor: "rgba(255,255,255,0.15)" }}>
                            <i className="fas fa-language text-white" style={{ fontSize: 26 }} />
                        </div>
                        <div>
                            <h2 className="text-white font-weight-bolder mb-1">
                                Gestión de Notas Bilingüe
                            </h2>
                            <p className="text-white mb-0" style={{ opacity: 0.8 }}>
                                Registra o actualiza los resultados de evaluación bilingüe de los docentes.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">

                {/* ── PANEL IZQUIERDO — Búsqueda ──────────────────────────── */}
                <div className="col-xl-5 col-lg-5 mb-7">
                    <div className="card card-custom h-100">
                        <div className="card-header border-0 pt-6">
                            <h5 className="card-title font-weight-bolder text-dark">
                                <i className="fas fa-search text-primary mr-2" />
                                Buscar Docente
                            </h5>
                        </div>
                        <div className="card-body pt-2">

                            {/* Input de búsqueda */}
                            <div className="position-relative mb-4">
                                <span className="position-absolute"
                                    style={{ left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
                                    {buscando
                                        ? <span className="spinner-border spinner-border-sm text-primary" />
                                        : <i className="fas fa-search text-muted" />
                                    }
                                </span>
                                <input
                                    type="text"
                                    className="form-control pl-10"
                                    placeholder="Buscar por nombre o DNI..."
                                    value={busqueda}
                                    onChange={handleChange}
                                    style={{ paddingLeft: 40 }}
                                />
                                {busqueda && (
                                    <button
                                        className="btn btn-icon btn-xs position-absolute"
                                        style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}
                                        onClick={limpiarSeleccion}
                                    >
                                        <i className="fas fa-times text-muted" />
                                    </button>
                                )}
                            </div>

                            {/* Resultados */}
                            {resultados.length > 0 && (
                                <div className="border rounded" style={{ maxHeight: 280, overflowY: "auto" }}>
                                    {resultados.map((d) => (
                                        <div
                                            key={d.id}
                                            className="d-flex align-items-center p-4 border-bottom"
                                            style={{ cursor: "pointer", transition: "background 0.15s" }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F3F6F9"}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                            onClick={() => seleccionarDocente(d)}
                                        >
                                            {/* Avatar */}
                                            <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                style={{ width: 38, height: 38, backgroundColor: "#EEE5FF", flexShrink: 0 }}>
                                                <span className="font-weight-bolder" style={{ color: "#8950FC", fontSize: 14 }}>
                                                    {(d.first_name?.[0] || d.username?.[0] || "?").toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-grow-1">
                                                <p className="font-weight-bold text-dark mb-0 font-size-sm">
                                                    {d.first_name} {d.last_name}
                                                </p>
                                                <span className="text-muted font-size-xs">
                                                    DNI: {d.dni || "—"} · {d.email || d.username}
                                                </span>
                                            </div>
                                            <i className="fas fa-chevron-right text-muted font-size-xs" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sinResultados && (
                                <div className="text-center py-6">
                                    <i className="fas fa-user-slash text-muted mb-3" style={{ fontSize: 32 }} />
                                    <p className="text-muted font-weight-bold mb-0">
                                        No se encontraron docentes
                                    </p>
                                    <span className="text-muted font-size-xs">
                                        Intenta con otro nombre o DNI
                                    </span>
                                </div>
                            )}

                            {/* Docente seleccionado */}
                            {docente && (
                                <div className="mt-4 border rounded p-4"
                                    style={{ borderColor: "#8950FC", backgroundColor: "#F8F5FF" }}>
                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                        <span className="font-weight-bolder text-dark font-size-sm">
                                            Docente seleccionado
                                        </span>
                                        <button
                                            className="btn btn-icon btn-xs btn-light"
                                            onClick={limpiarSeleccion}
                                            title="Cambiar docente"
                                        >
                                            <i className="fas fa-times" />
                                        </button>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                            style={{ width: 46, height: 46, backgroundColor: "#8950FC" }}>
                                            <span className="text-white font-weight-bolder" style={{ fontSize: 16 }}>
                                                {(docente.first_name?.[0] || "?").toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-weight-bolder text-dark mb-0">
                                                {docente.first_name} {docente.last_name}
                                            </p>
                                            <span className="text-muted font-size-xs">
                                                DNI: {docente.dni || "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Estado nota actual */}
                                    <div className="mt-3">
                                        {cargandoNota ? (
                                            <div className="d-flex align-items-center">
                                                <span className="spinner-border spinner-border-sm text-primary mr-2" />
                                                <span className="text-muted font-size-xs">Cargando nota...</span>
                                            </div>
                                        ) : notaExistente ? (
                                            <div>
                                                <span className="label label-light-success label-inline font-weight-bold mb-2">
                                                    <i className="fas fa-check-circle mr-1" />
                                                    Nota registrada
                                                </span>
                                                <div className="d-flex align-items-center mt-2" style={{ gap: 8 }}>
                                                    <span className="text-muted font-size-xs">Oral:</span>
                                                    <NivelBadge nivel={notaExistente.nivel_oral} />
                                                    <span className="text-muted font-size-xs ml-2">Escrito:</span>
                                                    <NivelBadge nivel={notaExistente.nivel_escrito} />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="label label-light-warning label-inline font-weight-bold">
                                                <i className="fas fa-exclamation-circle mr-1" />
                                                Sin nota registrada
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── PANEL DERECHO — Formulario ───────────────────────────── */}
                <div className="col-xl-7 col-lg-7 mb-7">
                    <div className="card card-custom h-100">
                        <div className="card-header border-0 pt-6">
                            <h5 className="card-title font-weight-bolder text-dark">
                                <i className="fas fa-edit text-primary mr-2" />
                                {notaExistente ? "Editar Nota Bilingüe" : "Registrar Nota Bilingüe"}
                            </h5>
                            {notaExistente && (
                                <div className="card-toolbar">
                                    <button
                                        className="btn btn-light-danger btn-sm font-weight-bold"
                                        onClick={eliminarNota}
                                    >
                                        <i className="fas fa-trash mr-2" />
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="card-body pt-2">

                            {!docente ? (
                                /* Estado vacío */
                                <div className="d-flex flex-column align-items-center justify-content-center"
                                    style={{ minHeight: 300 }}>
                                    <div className="d-flex align-items-center justify-content-center rounded-circle mb-5"
                                        style={{ width: 80, height: 80, backgroundColor: "#F3F6F9" }}>
                                        <i className="fas fa-user-edit text-muted" style={{ fontSize: 32 }} />
                                    </div>
                                    <p className="font-weight-bolder text-dark mb-2">
                                        Selecciona un docente
                                    </p>
                                    <p className="text-muted text-center" style={{ maxWidth: 280 }}>
                                        Busca al docente por nombre o DNI en el panel izquierdo para registrar o editar su nota bilingüe.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {/* ── Lengua ─────────────────────────────── */}
                                    <div className="form-group mb-6">
                                        <label className="font-weight-bold text-dark">
                                            Lengua *
                                            <span className="text-muted font-weight-normal ml-2 font-size-sm">
                                                (idioma en que rindió el examen)
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control mt-1"
                                            placeholder="Ej: Quechua, Chawi, Cocama, Aymara..."
                                            value={form.lengua}
                                            onChange={(e) => {
                                                const val = e.target.value;  // ✅ extraer ANTES del setter
                                                setForm((p) => ({ ...p, lengua: val }));
                                            }}
                                        />
                                    </div>

                                    <div className="row">
                                        {/* ── Nivel Oral ─────────────────────── */}
                                        <div className="col-md-6 mb-6">
                                            <label className="font-weight-bold text-dark d-block">
                                                Nivel Oral
                                            </label>
                                            <div className="mt-2">
                                                {NIVELES.filter((n) => n.value !== "").map((n) => (
                                                    <div
                                                        key={n.value}
                                                        className="d-flex align-items-center border rounded p-3 mb-2"
                                                        style={{
                                                            cursor: "pointer",
                                                            transition: "all 0.15s",
                                                            borderColor: form.nivel_oral === n.value
                                                                ? NIVEL_COLORS[n.value]?.text : "#EBEDF3",
                                                            backgroundColor: form.nivel_oral === n.value
                                                                ? NIVEL_COLORS[n.value]?.bg : "#fff",
                                                        }}
                                                        onClick={() => setForm((p) => ({ ...p, nivel_oral: n.value }))}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                            style={{
                                                                width: 20, height: 20, flexShrink: 0,
                                                                border: `2px solid ${form.nivel_oral === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "#EBEDF3"}`,
                                                                backgroundColor: form.nivel_oral === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "transparent",
                                                            }}>
                                                            {form.nivel_oral === n.value && (
                                                                <i className="fas fa-check text-white" style={{ fontSize: 10 }} />
                                                            )}
                                                        </div>
                                                        <span className="font-weight-bold font-size-sm"
                                                            style={{
                                                                color: form.nivel_oral === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "#3F4254"
                                                            }}>
                                                            {n.label}
                                                        </span>
                                                    </div>
                                                ))}
                                                {form.nivel_oral && (
                                                    <button
                                                        className="btn btn-link btn-sm text-muted p-0 mt-1"
                                                        onClick={() => setForm((p) => ({ ...p, nivel_oral: "" }))}
                                                    >
                                                        <i className="fas fa-times mr-1" />
                                                        Quitar selección
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── Nivel Escrito ──────────────────── */}
                                        <div className="col-md-6 mb-6">
                                            <label className="font-weight-bold text-dark d-block">
                                                Nivel Escrito
                                            </label>
                                            <div className="mt-2">
                                                {NIVELES.filter((n) => n.value !== "").map((n) => (
                                                    <div
                                                        key={n.value}
                                                        className="d-flex align-items-center border rounded p-3 mb-2"
                                                        style={{
                                                            cursor: "pointer",
                                                            transition: "all 0.15s",
                                                            borderColor: form.nivel_escrito === n.value
                                                                ? NIVEL_COLORS[n.value]?.text : "#EBEDF3",
                                                            backgroundColor: form.nivel_escrito === n.value
                                                                ? NIVEL_COLORS[n.value]?.bg : "#fff",
                                                        }}
                                                        onClick={() => setForm((p) => ({ ...p, nivel_escrito: n.value }))}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                            style={{
                                                                width: 20, height: 20, flexShrink: 0,
                                                                border: `2px solid ${form.nivel_escrito === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "#EBEDF3"}`,
                                                                backgroundColor: form.nivel_escrito === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "transparent",
                                                            }}>
                                                            {form.nivel_escrito === n.value && (
                                                                <i className="fas fa-check text-white" style={{ fontSize: 10 }} />
                                                            )}
                                                        </div>
                                                        <span className="font-weight-bold font-size-sm"
                                                            style={{
                                                                color: form.nivel_escrito === n.value
                                                                    ? NIVEL_COLORS[n.value]?.text : "#3F4254"
                                                            }}>
                                                            {n.label}
                                                        </span>
                                                    </div>
                                                ))}
                                                {form.nivel_escrito && (
                                                    <button
                                                        className="btn btn-link btn-sm text-muted p-0 mt-1"
                                                        onClick={() => setForm((p) => ({ ...p, nivel_escrito: "" }))}
                                                    >
                                                        <i className="fas fa-times mr-1" />
                                                        Quitar selección
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Observaciones ──────────────────────── */}
                                    <div className="form-group mb-6">
                                        <label className="font-weight-bold text-dark">
                                            Observaciones
                                            <span className="text-muted font-weight-normal ml-2 font-size-sm">
                                                (opcional)
                                            </span>
                                        </label>
                                        <textarea
                                            className="form-control mt-1"
                                            rows={3}
                                            placeholder="Notas adicionales sobre la evaluación..."
                                            value={form.observaciones}
                                            onChange={(e) => {
                                                const val = e.target.value;  // ✅ extraer ANTES del setter
                                                setForm((p) => ({ ...p, observaciones: val }));
                                            }}
                                        />
                                    </div>

                                    {/* ── Botón guardar ──────────────────────── */}
                                    <div className="d-flex justify-content-end">
                                        <button
                                            className="btn btn-primary font-weight-bolder px-8 py-4"
                                            onClick={guardarNota}
                                            disabled={guardando || !form.lengua.trim()}
                                        >
                                            {guardando ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm mr-2" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save mr-2" />
                                                    {notaExistente ? "Actualizar nota" : "Registrar nota"}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminNotasBilinguesPage;
