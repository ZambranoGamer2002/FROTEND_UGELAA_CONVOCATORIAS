/**
 * AdminNotasBilinguesPage.js
 * Tab 1 → Registro manual individual
 * Tab 2 → Carga masiva desde Excel del Estado
 * Tab 3 → Ver todos los registros
 * ACTUALIZADO 2026-05-27:
 * - guardar() usa POST para crear y PUT /{nota_id} para editar
 * - Formulario incluye ugel, dre, fecha_vencimiento
 * - eliminar() usa nota_id (no docente_id)
 * - TabLista eliminar usa item.id (nota_id)
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import debounce from "lodash/debounce";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

const useToken = () => {
    const auth = useSelector((s) => s.auth);
    return auth?.authToken || auth?.accessToken || auth?.token || localStorage.getItem("token") || null;
};

const NIVELES = [
    { value: "AVANZADO", label: "Avanzado", color: "#1BC5BD", bg: "#E8FFF3" },
    { value: "INTERMEDIO", label: "Intermedio", color: "#3699FF", bg: "#E1F0FF" },
    { value: "BASICO", label: "Básico", color: "#FFA800", bg: "#FFF4DE" },
    { value: "EN_INICIO", label: "En Inicio", color: "#F64E60", bg: "#FFE2E5" },
    { value: "NO_DOMINA", label: "No Domina", color: "#B5B5C3", bg: "#F3F6F9" },
];

const NivelBadge = ({ nivel }) => {
    if (!nivel) return <span className="text-muted">—</span>;
    const n = NIVELES.find((x) => x.value === nivel);
    if (!n) return <span className="text-muted">{nivel}</span>;
    return (
        <span className="label label-inline font-weight-bold"
            style={{ backgroundColor: n.bg, color: n.color, padding: "4px 10px", borderRadius: 4 }}>
            {n.label}
        </span>
    );
};

const FuenteBadge = ({ fuente }) => {
    if (fuente === "EXCEL_IMPORTACION") return (
        <span className="label label-light-primary label-inline font-weight-bold">
            <i className="fas fa-file-excel mr-1" />Excel
        </span>
    );
    return (
        <span className="label label-light-dark label-inline font-weight-bold">
            <i className="fas fa-hand-paper mr-1" />Manual
        </span>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const AdminNotasBilinguesPage = () => {
    const token = useToken();
    const tokenRef = useRef(token);
    useEffect(() => { tokenRef.current = token; }, [token]);

    const [tabActivo, setTabActivo] = useState("manual");

    return (
        <div className="container-fluid px-0">
            {/* HEADER */}
            <div className="card card-custom mb-7" style={{
                background: "linear-gradient(135deg, #3a1c71 0%, #8950FC 100%)", border: "none"
            }}>
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <div className="d-flex align-items-center justify-content-center rounded mr-5"
                                style={{ width: 56, height: 56, backgroundColor: "rgba(255,255,255,0.15)" }}>
                                <i className="fas fa-language text-white" style={{ fontSize: 26 }} />
                            </div>
                            <div>
                                <h2 className="text-white font-weight-bolder mb-1">Gestión de Notas Bilingüe</h2>
                                <p className="text-white mb-0" style={{ opacity: 0.8 }}>
                                    Registra, importa y consulta los resultados de evaluación bilingüe de los docentes.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex mt-6" style={{ gap: 8 }}>
                        {[
                            { key: "manual", icon: "fas fa-user-edit", label: "Registro Manual" },
                            { key: "excel", icon: "fas fa-file-excel", label: "Importar Excel" },
                            { key: "lista", icon: "fas fa-list", label: "Ver Registros" },
                        ].map((tab) => (
                            <button key={tab.key}
                                onClick={() => setTabActivo(tab.key)}
                                className="btn btn-sm font-weight-bold"
                                style={{
                                    backgroundColor: tabActivo === tab.key ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                                    color: "white",
                                    border: tabActivo === tab.key ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
                                    borderRadius: 8,
                                }}>
                                <i className={`${tab.icon} mr-2`} />{tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {tabActivo === "manual" && <TabManual tokenRef={tokenRef} />}
            {tabActivo === "excel" && <TabExcel tokenRef={tokenRef} />}
            {tabActivo === "lista" && <TabLista tokenRef={tokenRef} />}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — Registro Manual
// ════════════════════════════════════════════════════════════════════════════
const FORM_VACIO = {
    lengua: "", nivel_oral: "", nivel_escrito: "",
    observaciones: "", ugel: "", dre: "", fecha_vencimiento: "",
};

const TabManual = ({ tokenRef }) => {
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [sinResultados, setSinResultados] = useState(false);
    const [docente, setDocente] = useState(null);
    const [notaExistente, setNotaExistente] = useState(null);  // objeto completo de la nota
    const [notaId, setNotaId] = useState(null);  // ← ID de la nota para PUT
    const [cargandoNota, setCargandoNota] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState(FORM_VACIO);
    const [historial, setHistorial] = useState([]);

    // ── Buscador con debounce ─────────────────────────────────────────────
    const buscarDocentes = useRef(debounce(async (query) => {
        if (!query || query.trim().length < 2) {
            setResultados([]); setSinResultados(false); setBuscando(false); return;
        }
        setBuscando(true);
        try {
            const res = await axios.get(`${API_URL}/usuarios/buscar`, {
                params: { q: query.trim(), rol: "docente" },
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            const lista = res.data?.results || res.data || [];
            setResultados(lista);
            setSinResultados(lista.length === 0);
        } catch { setResultados([]); }
        finally { setBuscando(false); }
    }, 400)).current;

    const handleBusqueda = (e) => {
        const val = e.target.value;
        setBusqueda(val);
        if (!val || val.trim().length < 2) {
            setResultados([]); setSinResultados(false); setBuscando(false);
            buscarDocentes.cancel(); return;
        }
        setBuscando(true);
        buscarDocentes(val);
    };

    // ── Seleccionar docente → cargar nota actual + historial ──────────────
    const seleccionarDocente = useCallback(async (d) => {
        setDocente(d);
        setResultados([]);
        setBusqueda(`${d.first_name || ""} ${d.last_name || ""} — ${d.dni || d.username}`);
        setCargandoNota(true);
        setNotaExistente(null);
        setNotaId(null);
        setHistorial([]);
        setForm(FORM_VACIO);

        try {
            // ── Nota activa del docente ───────────────────────────────────
            const res = await axios.get(
                `${API_URL}/catalogo/bilingue/docente/${d.id}`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            if (res.data) {
                const nota = res.data;
                setNotaExistente(nota);
                setNotaId(nota.id);   // ← guardar nota_id para el PUT
                setForm({
                    lengua: nota.lengua || "",
                    nivel_oral: nota.nivel_oral || "",
                    nivel_escrito: nota.nivel_escrito || "",
                    observaciones: nota.observaciones || "",
                    ugel: nota.ugel || "",
                    dre: nota.dre || "",
                    fecha_vencimiento: nota.fecha_vencimiento ? String(nota.fecha_vencimiento) : "",
                });
            }

            // ── Historial de años anteriores ──────────────────────────────
            const hist = await axios.get(
                `${API_URL}/catalogo/bilingue/docente/${d.id}/historial`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            setHistorial(hist.data?.historial || []);

        } catch { /* sin nota previa — formulario vacío */ }
        finally { setCargandoNota(false); }
    }, [tokenRef]);

    // ── Limpiar todo ──────────────────────────────────────────────────────
    const limpiar = () => {
        setDocente(null); setNotaExistente(null); setNotaId(null);
        setBusqueda(""); setResultados([]); setSinResultados(false); setBuscando(false);
        buscarDocentes.cancel();
        setHistorial([]);
        setForm(FORM_VACIO);
    };

    // ── Guardar: POST si es nuevo, PUT si ya existe ───────────────────────
    const guardar = async () => {
        if (!docente || !form.lengua.trim()) return;

        // ── Validar año de vencimiento ────────────────────────────────────
        if (form.fecha_vencimiento) {
            const anio = parseInt(form.fecha_vencimiento, 10);
            const anioActual = new Date().getFullYear();

            if (isNaN(anio) || anio < 2000 || anio > 2099) {
                Swal.fire({
                    icon: "warning",
                    title: "Año inválido",
                    text: "El año de vencimiento debe estar entre 2000 y 2099.",
                    confirmButtonColor: "#8950FC",
                });
                return;
            }

            if (anio < anioActual) {
                const ok = await Swal.fire({
                    icon: "warning",
                    title: "Certificado vencido",
                    html: `El año de vencimiento <strong>${anio}</strong> ya pasó
                       (año actual: <strong>${anioActual}</strong>).<br/><br/>
                       Los certificados vencidos <strong>no son válidos</strong>
                       para postulaciones activas.`,
                    showCancelButton: true,
                    confirmButtonText: "Registrar de todas formas",
                    cancelButtonText: "Corregir año",
                    confirmButtonColor: "#F64E60",
                    cancelButtonColor: "#8950FC",
                });
                if (!ok.isConfirmed) return;
            }

            if (anio === anioActual) {
                await Swal.fire({
                    icon: "info",
                    title: "Certificado vence este año",
                    html: `El certificado vence en <strong>${anio}</strong>.
                       El docente <strong>no podrá postular</strong>
                       después de que venza.`,
                    confirmButtonColor: "#8950FC",
                });
                // solo aviso, no bloquea
            }
        }
        // ── FIN validación año ────────────────────────────────────────────

        setGuardando(true);

        const payload = {
            docente_id: docente.id,
            lengua: form.lengua.trim(),
            nivel_oral: form.nivel_oral || null,
            nivel_escrito: form.nivel_escrito || null,
            observaciones: form.observaciones.trim() || null,
            ugel: form.ugel.trim() || null,
            dre: form.dre.trim() || null,
            fecha_vencimiento: form.fecha_vencimiento
                ? parseInt(form.fecha_vencimiento, 10)
                : null,
            distrito_id: docente.distrito_id || null,
        };

        try {
            let res;

            if (notaId) {
                // ── Editar nota existente — PUT /{nota_id} ────────────────
                res = await axios.put(
                    `${API_URL}/catalogo/bilingue/notas/${notaId}`,
                    payload,
                    { headers: { Authorization: `Bearer ${tokenRef.current}` } }
                );
            } else {
                // ── Crear nota nueva — POST ───────────────────────────────
                res = await axios.post(
                    `${API_URL}/catalogo/bilingue/notas`,
                    payload,
                    { headers: { Authorization: `Bearer ${tokenRef.current}` } }
                );

                // Backend devuelve "ya_existe" → cambiar a modo edición
                if (res.data?.accion === "ya_existe") {
                    setNotaId(res.data.nota_id);
                    setNotaExistente(res.data);
                    await Swal.fire({
                        icon: "info",
                        title: "Nota ya registrada",
                        text: "Se cargaron los datos existentes. Modifica y guarda nuevamente.",
                        confirmButtonColor: "#8950FC",
                    });
                    setGuardando(false);
                    return;
                }
            }

            // ── Aviso extra si el backend reporta certificado vencido ────
            if (res.data?.vencido) {
                await Swal.fire({
                    icon: "warning",
                    title: "Guardado con advertencia",
                    html: res.data.aviso || "El certificado registrado está vencido.",
                    confirmButtonColor: "#FFA800",
                });
            } else {
                await Swal.fire({
                    icon: "success",
                    title: notaId ? "Nota actualizada" : "Nota registrada",
                    html: `Los datos de <strong>${docente.first_name}</strong> fueron guardados correctamente.
                        <br/><small class="text-muted">
                            Convocatoria: <strong>${res.data.convocatoria || "—"}</strong>
                            ${res.data.ugel ? ` · UGEL: <strong>${res.data.ugel}</strong>` : ""}
                        </small>`,
                    confirmButtonColor: "#8950FC",
                });
            }

            // Recargar datos frescos del docente
            await seleccionarDocente(docente);

        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "Error al guardar.",
            });
        } finally { setGuardando(false); }
    };

    // ── Eliminar nota (usa nota_id) ───────────────────────────────────────
    const eliminar = async () => {
        if (!notaId) return;
        const ok = await Swal.fire({
            icon: "warning", title: "¿Eliminar nota?",
            text: `Se eliminará la nota bilingüe de ${docente?.first_name}.`,
            showCancelButton: true, confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar", confirmButtonColor: "#F64E60",
        });
        if (!ok.isConfirmed) return;
        try {
            await axios.delete(
                `${API_URL}/catalogo/bilingue/notas/${notaId}`,
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            Swal.fire({ icon: "success", title: "Nota eliminada", confirmButtonColor: "#8950FC" });
            limpiar();
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail || "No se pudo eliminar." });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="row">
            {/* ── Panel búsqueda (izquierda) ─────────────────────────────── */}
            <div className="col-xl-5 mb-7">
                <div className="card card-custom h-100">
                    <div className="card-header border-0 pt-6">
                        <h5 className="card-title font-weight-bolder text-dark">
                            <i className="fas fa-search text-primary mr-2" />Buscar Docente
                        </h5>
                    </div>
                    <div className="card-body pt-2">

                        {/* Input búsqueda */}
                        <div className="position-relative mb-4">
                            <span className="position-absolute"
                                style={{ left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
                                {buscando
                                    ? <span className="spinner-border spinner-border-sm text-primary" />
                                    : <i className="fas fa-search text-muted" />}
                            </span>
                            <input type="text" className="form-control"
                                placeholder="Buscar por nombre o DNI..."
                                value={busqueda} onChange={handleBusqueda}
                                style={{ paddingLeft: 40 }} />
                            {busqueda && (
                                <button className="btn btn-icon btn-xs position-absolute"
                                    style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}
                                    onClick={limpiar}>
                                    <i className="fas fa-times text-muted" />
                                </button>
                            )}
                        </div>

                        {/* Lista de resultados */}
                        {resultados.length > 0 && (
                            <div className="border rounded" style={{ maxHeight: 260, overflowY: "auto" }}>
                                {resultados.map((d) => (
                                    <div key={d.id}
                                        className="d-flex align-items-center p-3 border-bottom"
                                        style={{ cursor: "pointer" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F3F6F9"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        onClick={() => seleccionarDocente(d)}>
                                        <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                            style={{ width: 36, height: 36, backgroundColor: "#EEE5FF", flexShrink: 0 }}>
                                            <span style={{ color: "#8950FC", fontWeight: 700, fontSize: 13 }}>
                                                {(d.first_name?.[0] || "?").toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-grow-1">
                                            <p className="font-weight-bold text-dark mb-0 font-size-sm">
                                                {d.first_name} {d.last_name}
                                            </p>
                                            <span className="text-muted font-size-xs">DNI: {d.dni || "—"}</span>
                                        </div>
                                        <i className="fas fa-chevron-right text-muted font-size-xs" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {sinResultados && (
                            <div className="text-center py-6">
                                <i className="fas fa-user-slash text-muted mb-2" style={{ fontSize: 28 }} />
                                <p className="text-muted font-weight-bold mb-0">No se encontraron docentes</p>
                            </div>
                        )}

                        {/* ── Card del docente seleccionado ─────────────────── */}
                        {docente && (
                            <div className="mt-4 border rounded p-4"
                                style={{ borderColor: "#8950FC", backgroundColor: "#F8F5FF" }}>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <span className="font-weight-bolder text-dark font-size-sm">Docente seleccionado</span>
                                    <button className="btn btn-icon btn-xs btn-light" onClick={limpiar}>
                                        <i className="fas fa-times" />
                                    </button>
                                </div>

                                <div className="d-flex align-items-center">
                                    <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                        style={{ width: 44, height: 44, backgroundColor: "#8950FC" }}>
                                        <span className="text-white font-weight-bolder" style={{ fontSize: 15 }}>
                                            {(docente.first_name?.[0] || "?").toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-weight-bolder text-dark mb-0">
                                            {docente.first_name} {docente.last_name}
                                        </p>
                                        <span className="text-muted font-size-xs">DNI: {docente.dni || "—"}</span>
                                    </div>
                                </div>

                                {/* Estado de la nota actual */}
                                <div className="mt-3">
                                    {cargandoNota ? (
                                        <span className="spinner-border spinner-border-sm text-primary" />
                                    ) : notaExistente ? (
                                        <div>
                                            <span className="label label-light-success label-inline font-weight-bold mb-2">
                                                <i className="fas fa-check-circle mr-1" />Nota registrada
                                            </span>
                                            <div className="d-flex align-items-center mt-2" style={{ gap: 8 }}>
                                                <span className="text-muted font-size-xs">Oral:</span>
                                                <NivelBadge nivel={notaExistente.nivel_oral} />
                                                <span className="text-muted font-size-xs ml-2">Escrito:</span>
                                                <NivelBadge nivel={notaExistente.nivel_escrito} />
                                            </div>
                                            {/* UGEL registrada */}
                                            {(notaExistente.ugel || notaExistente.dre) && (
                                                <div className="mt-2">
                                                    <span className="text-muted font-size-xs">
                                                        {notaExistente.dre && <><strong>DRE:</strong> {notaExistente.dre} · </>}
                                                        {notaExistente.ugel && <><strong>UGEL:</strong> {notaExistente.ugel}</>}
                                                    </span>
                                                </div>
                                            )}
                                            {notaExistente.fuente && (
                                                <div className="mt-2">
                                                    <FuenteBadge fuente={notaExistente.fuente} />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="label label-light-warning label-inline font-weight-bold">
                                            <i className="fas fa-exclamation-circle mr-1" />Sin nota registrada
                                        </span>
                                    )}
                                </div>

                                {/* Historial de años anteriores */}
                                {historial.length > 1 && (
                                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid #E0D5FF" }}>
                                        <p className="font-weight-bolder text-dark font-size-xs mb-2">
                                            <i className="fas fa-history text-muted mr-1" />
                                            Historial ({historial.length} registros)
                                        </p>
                                        <div style={{ maxHeight: 130, overflowY: "auto" }}>
                                            {historial.map((h, i) => (
                                                <div key={i}
                                                    className="d-flex align-items-center justify-content-between mb-1 px-2 py-1 rounded"
                                                    style={{ backgroundColor: "#EDE8FF" }}>
                                                    <span className="font-weight-bolder font-size-xs text-dark"
                                                        style={{ minWidth: 36 }}>
                                                        {h.convocatoria_anio || "—"}
                                                    </span>
                                                    <div className="d-flex" style={{ gap: 4 }}>
                                                        <NivelBadge nivel={h.nivel_oral} />
                                                        <NivelBadge nivel={h.nivel_escrito} />
                                                    </div>
                                                    <span className="label label-xs font-weight-bold"
                                                        style={{
                                                            backgroundColor: "#8950FC", color: "#fff",
                                                            padding: "2px 6px", borderRadius: 4, fontSize: 10,
                                                        }}>
                                                        {h.convocatoria_codigo || "—"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Panel formulario (derecha) ─────────────────────────────── */}
            <div className="col-xl-7 mb-7">
                <div className="card card-custom h-100">
                    <div className="card-header border-0 pt-6">
                        <h5 className="card-title font-weight-bolder text-dark">
                            <i className="fas fa-edit text-primary mr-2" />
                            {notaExistente ? "Editar Nota Bilingüe" : "Registrar Nota Bilingüe"}
                        </h5>
                        {notaExistente && notaId && (
                            <div className="card-toolbar">
                                <button className="btn btn-light-danger btn-sm font-weight-bold" onClick={eliminar}>
                                    <i className="fas fa-trash mr-2" />Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="card-body pt-2">
                        {!docente ? (
                            <div className="d-flex flex-column align-items-center justify-content-center"
                                style={{ minHeight: 300 }}>
                                <div className="d-flex align-items-center justify-content-center rounded-circle mb-4"
                                    style={{ width: 72, height: 72, backgroundColor: "#F3F6F9" }}>
                                    <i className="fas fa-user-edit text-muted" style={{ fontSize: 28 }} />
                                </div>
                                <p className="font-weight-bolder text-dark mb-1">Selecciona un docente</p>
                                <p className="text-muted text-center" style={{ maxWidth: 260 }}>
                                    Busca al docente por nombre o DNI en el panel izquierdo.
                                </p>
                            </div>
                        ) : (
                            <div>
                                {/* Lengua */}
                                <div className="form-group mb-5">
                                    <label className="font-weight-bold text-dark">
                                        Lengua *
                                        <span className="text-muted font-weight-normal ml-2 font-size-sm">
                                            (idioma evaluado)
                                        </span>
                                    </label>
                                    <input type="text" className="form-control mt-1"
                                        placeholder="Ej: Quechua Sureño, Awajún, Aimara..."
                                        value={form.lengua}
                                        onChange={(e) => { const v = e.target.value; setForm(p => ({ ...p, lengua: v })); }} />
                                </div>

                                {/* Niveles */}
                                <div className="row">
                                    {/* Nivel Oral */}
                                    <div className="col-md-6 mb-5">
                                        <label className="font-weight-bold text-dark d-block mb-2">Nivel Oral</label>
                                        {NIVELES.map((n) => (
                                            <div key={n.value}
                                                className="d-flex align-items-center border rounded p-3 mb-2"
                                                style={{
                                                    cursor: "pointer",
                                                    borderColor: form.nivel_oral === n.value ? n.color : "#EBEDF3",
                                                    backgroundColor: form.nivel_oral === n.value ? n.bg : "#fff",
                                                }}
                                                onClick={() => setForm(p => ({ ...p, nivel_oral: n.value }))}>
                                                <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                    style={{
                                                        width: 18, height: 18, flexShrink: 0,
                                                        border: `2px solid ${form.nivel_oral === n.value ? n.color : "#EBEDF3"}`,
                                                        backgroundColor: form.nivel_oral === n.value ? n.color : "transparent",
                                                    }}>
                                                    {form.nivel_oral === n.value &&
                                                        <i className="fas fa-check text-white" style={{ fontSize: 9 }} />}
                                                </div>
                                                <span className="font-weight-bold font-size-sm"
                                                    style={{ color: form.nivel_oral === n.value ? n.color : "#3F4254" }}>
                                                    {n.label}
                                                </span>
                                            </div>
                                        ))}
                                        {form.nivel_oral && (
                                            <button className="btn btn-link btn-sm text-muted p-0"
                                                onClick={() => setForm(p => ({ ...p, nivel_oral: "" }))}>
                                                <i className="fas fa-times mr-1" />Quitar
                                            </button>
                                        )}
                                    </div>

                                    {/* Nivel Escrito */}
                                    <div className="col-md-6 mb-5">
                                        <label className="font-weight-bold text-dark d-block mb-2">Nivel Escrito</label>
                                        {NIVELES.map((n) => (
                                            <div key={n.value}
                                                className="d-flex align-items-center border rounded p-3 mb-2"
                                                style={{
                                                    cursor: "pointer",
                                                    borderColor: form.nivel_escrito === n.value ? n.color : "#EBEDF3",
                                                    backgroundColor: form.nivel_escrito === n.value ? n.bg : "#fff",
                                                }}
                                                onClick={() => setForm(p => ({ ...p, nivel_escrito: n.value }))}>
                                                <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                    style={{
                                                        width: 18, height: 18, flexShrink: 0,
                                                        border: `2px solid ${form.nivel_escrito === n.value ? n.color : "#EBEDF3"}`,
                                                        backgroundColor: form.nivel_escrito === n.value ? n.color : "transparent",
                                                    }}>
                                                    {form.nivel_escrito === n.value &&
                                                        <i className="fas fa-check text-white" style={{ fontSize: 9 }} />}
                                                </div>
                                                <span className="font-weight-bold font-size-sm"
                                                    style={{ color: form.nivel_escrito === n.value ? n.color : "#3F4254" }}>
                                                    {n.label}
                                                </span>
                                            </div>
                                        ))}
                                        {form.nivel_escrito && (
                                            <button className="btn btn-link btn-sm text-muted p-0"
                                                onClick={() => setForm(p => ({ ...p, nivel_escrito: "" }))}>
                                                <i className="fas fa-times mr-1" />Quitar
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── DRE / UGEL / Año vencimiento ──────────────────────────── */}
                                <div className="row mb-5">
                                    <div className="col-md-4">
                                        <label className="font-weight-bold text-dark font-size-sm">DRE</label>
                                        <input type="text" className="form-control form-control-sm mt-1"
                                            placeholder="Ej: DRE Loreto"
                                            value={form.dre}
                                            onChange={(e) => { const v = e.target.value; setForm(p => ({ ...p, dre: v })); }} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="font-weight-bold text-dark font-size-sm">UGEL</label>
                                        <input type="text" className="form-control form-control-sm mt-1"
                                            placeholder="Ej: UGEL Maynas"
                                            value={form.ugel}
                                            onChange={(e) => { const v = e.target.value; setForm(p => ({ ...p, ugel: v })); }} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="font-weight-bold text-dark font-size-sm">
                                            Año vencimiento
                                            <span className="text-muted font-weight-normal ml-1">(opcional)</span>
                                        </label>
                                        <input type="number" className="form-control form-control-sm mt-1"
                                            placeholder="Ej: 2028"
                                            min="2020" max="2099"
                                            value={form.fecha_vencimiento}
                                            onChange={(e) => { const v = e.target.value; setForm(p => ({ ...p, fecha_vencimiento: v })); }} />
                                    </div>
                                </div>
                                {/* ── FIN DRE / UGEL / Año vencimiento ─────────────── */}

                                {/* Observaciones */}
                                <div className="form-group mb-5">
                                    <label className="font-weight-bold text-dark">
                                        Observaciones{" "}
                                        <span className="text-muted font-weight-normal font-size-sm">(opcional)</span>
                                    </label>
                                    <textarea className="form-control mt-1" rows={3}
                                        placeholder="Notas adicionales..."
                                        value={form.observaciones}
                                        onChange={(e) => { const v = e.target.value; setForm(p => ({ ...p, observaciones: v })); }} />
                                </div>

                                <div className="d-flex justify-content-end">
                                    <button className="btn btn-primary font-weight-bolder px-8 py-4"
                                        onClick={guardar}
                                        disabled={guardando || !form.lengua.trim()}>
                                        {guardando
                                            ? <><span className="spinner-border spinner-border-sm mr-2" />Guardando...</>
                                            : <><i className="fas fa-save mr-2" />
                                                {notaId ? "Actualizar nota" : "Registrar nota"}</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Importar Excel
// ════════════════════════════════════════════════════════════════════════════
const TabExcel = ({ tokenRef }) => {
    const [archivo, setArchivo] = useState(null);
    const [arrastrando, setArrastrando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const inputRef = useRef();

    const procesarArchivo = (file) => {
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            Swal.fire({ icon: "warning", title: "Formato inválido", text: "Solo se aceptan archivos .xlsx o .xls" });
            return;
        }
        setArchivo(file);
        setResultado(null);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setArrastrando(false);
        procesarArchivo(e.dataTransfer.files[0]);
    };

    const importar = async () => {
        if (!archivo) return;
        setImportando(true);
        setResultado(null);
        try {
            const formData = new FormData();
            formData.append("archivo", archivo);
            const res = await axios.post(`${API_URL}/catalogo/bilingue/importar-excel`, formData, {
                headers: {
                    Authorization: `Bearer ${tokenRef.current}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setResultado(res.data);
        } catch (err) {
            Swal.fire({
                icon: "error", title: "Error al importar",
                text: err.response?.data?.detail || "No se pudo procesar el archivo.",
            });
        } finally { setImportando(false); }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-xl-8">
                <div className="card card-custom mb-7">
                    <div className="card-header border-0 pt-6">
                        <h5 className="card-title font-weight-bolder text-dark">
                            <i className="fas fa-file-excel text-success mr-2" />
                            Importar desde Excel del Estado
                        </h5>
                    </div>
                    <div className="card-body pt-2">
                        <div className="alert alert-custom alert-light-info mb-6" role="alert">
                            <div className="alert-icon"><i className="fas fa-info-circle text-info" /></div>
                            <div className="alert-text font-size-sm">
                                <strong>Columnas detectadas automáticamente:</strong>{" "}
                                DNI · Lengua · Nivel Oral · Nivel Escrito · DRE · UGEL · Vencimiento
                                <br />
                                <span className="text-muted">
                                    Los niveles se normalizan automáticamente: "Avanzado" → AVANZADO, etc.
                                </span>
                            </div>
                        </div>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                            onDragLeave={() => setArrastrando(false)}
                            onDrop={onDrop}
                            onClick={() => inputRef.current?.click()}
                            style={{
                                border: `2px dashed ${arrastrando ? "#8950FC" : archivo ? "#1BC5BD" : "#EBEDF3"}`,
                                borderRadius: 12, padding: "40px 20px", textAlign: "center",
                                cursor: "pointer",
                                backgroundColor: arrastrando ? "#F8F5FF" : archivo ? "#E8FFF3" : "#FAFAFA",
                                transition: "all 0.2s",
                            }}>
                            <input ref={inputRef} type="file" accept=".xlsx,.xls"
                                style={{ display: "none" }}
                                onChange={(e) => procesarArchivo(e.target.files[0])} />
                            {archivo ? (
                                <>
                                    <i className="fas fa-file-excel mb-3" style={{ fontSize: 40, color: "#1BC5BD" }} />
                                    <p className="font-weight-bolder text-dark mb-1">{archivo.name}</p>
                                    <span className="text-muted font-size-sm">
                                        {(archivo.size / 1024).toFixed(1)} KB — Listo para importar
                                    </span>
                                    <br />
                                    <button className="btn btn-link btn-sm text-muted mt-2"
                                        onClick={(e) => { e.stopPropagation(); setArchivo(null); setResultado(null); }}>
                                        <i className="fas fa-times mr-1" />Cambiar archivo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-upload-alt mb-3" style={{ fontSize: 40, color: "#B5B5C3" }} />
                                    <p className="font-weight-bolder text-dark mb-1">Arrastra el archivo aquí</p>
                                    <span className="text-muted font-size-sm">
                                        o haz clic para seleccionar · .xlsx / .xls
                                    </span>
                                </>
                            )}
                        </div>

                        {archivo && (
                            <div className="d-flex justify-content-end mt-5">
                                <button className="btn btn-success font-weight-bolder px-8 py-4"
                                    onClick={importar} disabled={importando}>
                                    {importando
                                        ? <><span className="spinner-border spinner-border-sm mr-2" />Procesando...</>
                                        : <><i className="fas fa-upload mr-2" />Importar Excel</>}
                                </button>
                            </div>
                        )}

                        {resultado && (
                            <div className="mt-7">
                                <h6 className="font-weight-bolder text-dark mb-4">
                                    <i className="fas fa-chart-bar text-primary mr-2" />Resultado de la importación
                                </h6>
                                {resultado.aviso && (
                                    <div className="alert alert-custom alert-light-warning mb-5" role="alert">
                                        <div className="alert-icon"><i className="fas fa-exclamation-triangle text-warning" /></div>
                                        <div className="alert-text font-size-sm">{resultado.aviso}</div>
                                    </div>
                                )}
                                <div className="row mb-5">
                                    {[
                                        { label: "Total filas", value: resultado.total_filas, color: "#3699FF", icon: "fa-list" },
                                        { label: "Nuevos", value: resultado.insertados, color: "#1BC5BD", icon: "fa-plus-circle" },
                                        { label: "Actualizados", value: resultado.actualizados, color: "#FFA800", icon: "fa-sync" },
                                        { label: "Vinculados", value: resultado.vinculados, color: "#8950FC", icon: "fa-link" },
                                        { label: "En espera", value: resultado.en_espera, color: "#F64E60", icon: "fa-clock" },
                                    ].map((m) => (
                                        <div key={m.label} className="col-6 col-md-4 col-lg mb-3">
                                            <div className="border rounded p-4 text-center h-100">
                                                <i className={`fas ${m.icon} mb-2`} style={{ fontSize: 22, color: m.color }} />
                                                <p className="font-weight-bolder mb-0"
                                                    style={{ fontSize: 22, color: m.color }}>{m.value}</p>
                                                <span className="text-muted font-size-xs">{m.label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {resultado.en_espera > 0 && (
                                    <div className="alert alert-custom alert-light-warning mb-5" role="alert">
                                        <div className="alert-icon"><i className="fas fa-clock text-warning" /></div>
                                        <div className="alert-text font-size-sm">
                                            <strong>{resultado.en_espera} docentes en espera.</strong>{" "}
                                            Sus notas están guardadas. Cuando se registren con su DNI,
                                            la vinculación se hará <strong>automáticamente</strong>.
                                        </div>
                                    </div>
                                )}
                                {resultado.errores?.length > 0 && (
                                    <div>
                                        <h6 className="font-weight-bold text-danger mb-3">
                                            <i className="fas fa-exclamation-triangle mr-2" />
                                            Errores ({resultado.errores.length})
                                        </h6>
                                        <div className="border rounded" style={{ maxHeight: 200, overflowY: "auto" }}>
                                            <table className="table table-sm mb-0">
                                                <thead style={{ backgroundColor: "#FFF5F8" }}>
                                                    <tr>
                                                        <th className="font-size-sm">Fila</th>
                                                        <th className="font-size-sm">Error</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {resultado.errores.map((e, i) => (
                                                        <tr key={i}>
                                                            <td className="font-size-sm text-muted">{e.fila}</td>
                                                            <td className="text-danger font-size-sm">{e.error}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Ver todos los registros
// ════════════════════════════════════════════════════════════════════════════
const TabLista = ({ tokenRef }) => {
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(1);
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [cargando, setCargando] = useState(false);

    const cargar = useCallback(async (pagina = 1, busq = "") => {
        setCargando(true);
        try {
            const res = await axios.get(`${API_URL}/catalogo/bilingue/lista`, {
                params: { page: pagina, limit: 20, q: busq || undefined },
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            setItems(res.data.items || []);
            setTotal(res.data.total || 0);
            setPages(res.data.pages || 1);
            setPage(pagina);
        } catch (err) {
            console.error("Error cargando lista:", err);
        } finally { setCargando(false); }
    }, [tokenRef]);

    useEffect(() => { cargar(1, ""); }, [cargar]);

    const buscarDebounced = useRef(debounce((valor) => cargar(1, valor), 400)).current;

    const handleBusqueda = (e) => {
        const val = e.target.value;
        setQ(val);
        buscarDebounced(val);
    };

    // ── Eliminar usa item.id (nota_id), NO docente_id ─────────────────────
    const eliminarNota = async (notaId, nombre) => {
        const ok = await Swal.fire({
            icon: "warning", title: "¿Eliminar nota?",
            text: `Se eliminará la nota bilingüe de ${nombre}.`,
            showCancelButton: true, confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar", confirmButtonColor: "#F64E60",
        });
        if (!ok.isConfirmed) return;
        try {
            await axios.delete(
                `${API_URL}/catalogo/bilingue/notas/${notaId}`,   // ← nota_id
                { headers: { Authorization: `Bearer ${tokenRef.current}` } }
            );
            Swal.fire({
                icon: "success", title: "Nota eliminada",
                confirmButtonColor: "#8950FC", timer: 1500, showConfirmButton: false,
            });
            cargar(page, q);
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.detail || "No se pudo eliminar." });
        }
    };

    return (
        <div className="card card-custom">
            <div className="card-header border-0 pt-6">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <div className="d-flex align-items-center">
                        <h5 className="card-title font-weight-bolder text-dark mb-0">
                            <i className="fas fa-list text-primary mr-2" />Todos los registros bilingüe
                        </h5>
                        {!cargando && (
                            <span className="label label-light-primary label-inline font-weight-bold ml-3">
                                {total} docentes
                            </span>
                        )}
                    </div>
                    <div className="position-relative" style={{ width: 280 }}>
                        <span className="position-absolute"
                            style={{ left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}>
                            {cargando
                                ? <span className="spinner-border spinner-border-sm text-primary"
                                    style={{ width: 14, height: 14 }} />
                                : <i className="fas fa-search text-muted" style={{ fontSize: 13 }} />}
                        </span>
                        <input type="text" className="form-control form-control-sm"
                            placeholder="Buscar por nombre, DNI o lengua..."
                            value={q} onChange={handleBusqueda}
                            style={{ paddingLeft: 34 }} />
                        {q && (
                            <button className="btn btn-icon btn-xs position-absolute"
                                style={{ right: 6, top: "50%", transform: "translateY(-50%)" }}
                                onClick={() => { setQ(""); cargar(1, ""); }}>
                                <i className="fas fa-times text-muted" style={{ fontSize: 11 }} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="card-body pt-3 px-0">
                <div className="table-responsive">
                    <table className="table table-head-custom table-vertical-center mb-0">
                        <thead>
                            <tr style={{ backgroundColor: "#F3F6F9" }}>
                                <th className="pl-7 font-size-sm text-uppercase font-weight-bolder text-muted">Docente</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">DNI</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">Lengua</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">Nivel Oral</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">Nivel Escrito</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">DRE / UGEL</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">Vence</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted">Fuente</th>
                                <th className="font-size-sm text-uppercase font-weight-bolder text-muted text-right pr-7">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando && items.length === 0 ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <td key={j}>
                                                <div style={{
                                                    height: 14, borderRadius: 4,
                                                    backgroundColor: "#F3F6F9",
                                                    width: j === 0 ? "80%" : j === 8 ? "60%" : "70%",
                                                    animation: "pulse 1.5s infinite",
                                                }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={9}>
                                        <div className="d-flex flex-column align-items-center justify-content-center py-12">
                                            <i className="fas fa-inbox text-muted mb-3" style={{ fontSize: 40 }} />
                                            <p className="font-weight-bolder text-dark mb-1">Sin registros</p>
                                            <span className="text-muted font-size-sm">
                                                {q ? "No se encontraron resultados." : "Aún no hay notas bilingüe registradas."}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id}
                                        style={{ borderBottom: "1px solid #EBEDF3" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#FAFAFA"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                                        <td className="pl-7">
                                            <div className="d-flex align-items-center">
                                                <div className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                    style={{ width: 34, height: 34, backgroundColor: "#EEE5FF", flexShrink: 0 }}>
                                                    <span style={{ color: "#8950FC", fontWeight: 700, fontSize: 12 }}>
                                                        {(item.docente_nombre?.[0] || "?").toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="font-weight-bold text-dark font-size-sm">
                                                    {item.docente_nombre || "—"}
                                                </span>
                                            </div>
                                        </td>
                                        <td><span className="font-weight-bold text-muted font-size-sm">{item.docente_dni || "—"}</span></td>
                                        <td><span className="font-weight-bold text-dark font-size-sm">{item.lengua || "—"}</span></td>
                                        <td><NivelBadge nivel={item.nivel_oral} /></td>
                                        <td><NivelBadge nivel={item.nivel_escrito} /></td>
                                        <td>
                                            <div>
                                                {item.dre && <span className="d-block font-size-xs font-weight-bold text-dark">{item.dre}</span>}
                                                {item.ugel && <span className="d-block font-size-xs text-muted">{item.ugel}</span>}
                                                {!item.dre && !item.ugel && <span className="text-muted font-size-xs">—</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {item.fecha_vencimiento ? (
                                                <span className={`label label-inline font-weight-bold font-size-xs ${item.fecha_vencimiento >= 2050 ? "label-light-success"
                                                    : item.fecha_vencimiento <= 2026 ? "label-light-danger"
                                                        : "label-light-warning"
                                                    }`}>
                                                    {item.fecha_vencimiento}
                                                </span>
                                            ) : <span className="text-muted font-size-xs">—</span>}
                                        </td>
                                        <td><FuenteBadge fuente={item.fuente} /></td>
                                        <td className="text-right pr-7">
                                            {/* ← usa item.id (nota_id), NO item.docente_id */}
                                            <button className="btn btn-icon btn-light-danger btn-xs"
                                                title="Eliminar nota"
                                                onClick={() => eliminarNota(item.id, item.docente_nombre)}>
                                                <i className="fas fa-trash font-size-xs" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pages > 1 && (
                    <div className="d-flex align-items-center justify-content-between px-7 pt-5">
                        <span className="text-muted font-size-sm">
                            Página <strong>{page}</strong> de <strong>{pages}</strong> · {total} registros
                        </span>
                        <div className="d-flex" style={{ gap: 6 }}>
                            <button className="btn btn-light btn-sm font-weight-bold"
                                disabled={page <= 1 || cargando}
                                onClick={() => cargar(page - 1, q)}>
                                <i className="fas fa-chevron-left mr-1" />Anterior
                            </button>
                            {Array.from({ length: pages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                                .reduce((acc, p, idx, arr) => {
                                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === "..." ? (
                                        <span key={`sep-${i}`} className="btn btn-sm btn-light disabled">…</span>
                                    ) : (
                                        <button key={p}
                                            className={`btn btn-sm font-weight-bold ${page === p ? "btn-primary" : "btn-light"}`}
                                            onClick={() => cargar(p, q)} disabled={cargando}>
                                            {p}
                                        </button>
                                    )
                                )}
                            <button className="btn btn-light btn-sm font-weight-bold"
                                disabled={page >= pages || cargando}
                                onClick={() => cargar(page + 1, q)}>
                                Siguiente<i className="fas fa-chevron-right ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminNotasBilinguesPage;
