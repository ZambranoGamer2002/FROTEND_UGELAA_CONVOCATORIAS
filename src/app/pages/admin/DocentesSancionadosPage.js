/**
 * DocentesSancionadosPage.js — v2
 * Panel del Admin para gestionar docentes sancionados
 * MEJORAS v2:
 * - Paginación en la lista
 * - Contador de sanciones activas/levantadas en el header
 * - Banner amarillo para sanciones vencidas sin levantar
 * - Confirmación visual al levantar desde el formulario
 * - Búsqueda limpia con cancel token
 * - Mapeo Frontend ↔ Backend robusto
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import debounce from "lodash/debounce";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";
const PAGE_SIZE = 10;

// ─── Token ────────────────────────────────────────────────────────────────────
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

// ─── Mapeo Frontend ↔ Backend ─────────────────────────────────────────────────
const TIPO_MAP_TO_BACKEND = {
    PERMANENTE: "DESTITUCION",
    TEMPORAL: "CESE_TEMPORAL",
};
const TIPO_MAP_TO_FRONTEND = {
    DESTITUCION: "PERMANENTE",
    CESE_TEMPORAL: "TEMPORAL",
};
const TIPO_SANCION_OPTIONS = [
    { value: "PERMANENTE", label: "Permanente" },
    { value: "TEMPORAL", label: "Temporal" },
];
const SANCION_COLORS = {
    PERMANENTE: { bg: "#FFE2E5", text: "#F64E60" },
    TEMPORAL: { bg: "#FFF4DE", text: "#FFA800" },
};
const FORM_INICIAL = {
    dni: "",
    nombres: "",
    tipo_sancion: "",
    fecha_inicio: "",
    fecha_fin: "",
    motivo: "",
    activo: true,
};

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
const estaVencida = (item) => {
    if (!item?.activo) return false;
    if (item.tipo_sancion === "DESTITUCION") return false;
    if (!item.fecha_fin) return false;
    return new Date(item.fecha_fin) < new Date();
};

const formatFecha = (fecha) => {
    if (!fecha) return "—";
    return fecha.slice(0, 10);
};

// ─── Badges ───────────────────────────────────────────────────────────────────
const SancionBadge = ({ tipo }) => {
    const tipoFront = TIPO_MAP_TO_FRONTEND[tipo] || tipo;
    if (!tipoFront) return <span className="text-muted">—</span>;
    const c = SANCION_COLORS[tipoFront] || { bg: "#F3F6F9", text: "#7E8299" };
    return (
        <span
            className="label label-inline font-weight-bold"
            style={{ backgroundColor: c.bg, color: c.text, padding: "4px 12px" }}
        >
            {TIPO_SANCION_OPTIONS.find((o) => o.value === tipoFront)?.label || tipoFront}
        </span>
    );
};

const ActivoBadge = ({ activo, vencida = false }) => {
    if (vencida) {
        return (
            <span
                className="label label-inline font-weight-bold"
                style={{ backgroundColor: "#FFF4DE", color: "#FFA800", padding: "4px 10px" }}
            >
                <i className="fas fa-clock mr-1" style={{ fontSize: 9 }} />
                Vencida
            </span>
        );
    }
    return (
        <span
            className="label label-inline font-weight-bold"
            style={
                activo
                    ? { backgroundColor: "#FFE2E5", color: "#F64E60", padding: "4px 10px" }
                    : { backgroundColor: "#E8FFF3", color: "#1BC5BD", padding: "4px 10px" }
            }
        >
            {activo ? "Activo" : "Levantada"}
        </span>
    );
};

// ─── Paginación ───────────────────────────────────────────────────────────────
const Paginacion = ({ page, total, pageSize, onChange }) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;

    const pages = [];
    const delta = 1;
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);

    return (
        <div className="d-flex align-items-center justify-content-center mt-4" style={{ gap: 4 }}>
            <button
                className="btn btn-icon btn-sm btn-light"
                disabled={page === 1}
                onClick={() => onChange(page - 1)}
            >
                <i className="fas fa-chevron-left" style={{ fontSize: 11 }} />
            </button>
            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`e-${i}`} className="text-muted px-2" style={{ fontSize: 13 }}>…</span>
                ) : (
                    <button
                        key={p}
                        className={`btn btn-sm ${page === p ? "btn-danger" : "btn-light"}`}
                        style={{ minWidth: 34, fontWeight: page === p ? 700 : 400 }}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                className="btn btn-icon btn-sm btn-light"
                disabled={page === totalPages}
                onClick={() => onChange(page + 1)}
            >
                <i className="fas fa-chevron-right" style={{ fontSize: 11 }} />
            </button>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
const DocentesSancionadosPage = () => {
    const token = useToken();
    const tokenRef = useRef(token);
    useEffect(() => { tokenRef.current = token; }, [token]);

    const headers = () => ({ Authorization: `Bearer ${tokenRef.current}` });

    // ── Estado lista ──────────────────────────────────────────────────────────
    const [lista, setLista] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [stats, setStats] = useState({ activos: 0, levantados: 0, vencidos: 0 });
    const [cargandoLista, setCargandoLista] = useState(false);
    const [busqueda, setBusqueda] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [sinResultados, setSinResultados] = useState(false);

    // ── Estado formulario ─────────────────────────────────────────────────────
    const [seleccionado, setSeleccionado] = useState(null);
    const [modoCrear, setModoCrear] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);

    // ── Importación ───────────────────────────────────────────────────────────
    const [importando, setImportando] = useState(false);
    const fileInputRef = useRef(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Cargar lista con paginación
    // ─────────────────────────────────────────────────────────────────────────
    const cargarLista = useCallback(async (buscar = "", pagina = 1) => {
        setCargandoLista(true);
        try {
            const params = {
                solo_activas: false,
                page: pagina,
                limit: PAGE_SIZE,
            };
            if (buscar.trim().length >= 2) params.buscar = buscar.trim();

            const res = await axios.get(`${API_URL}/sanciones/`, { params, headers: headers() });
            const data = res.data;

            // Soporta respuesta paginada { items, total } o array plano
            const items = data?.items ?? data ?? [];
            const totalReg = data?.total ?? items.length;

            setLista(items);
            setTotal(totalReg);
            setSinResultados(items.length === 0 && buscar.trim().length >= 2);

            // ── Calcular stats desde los items de la página ───────────────
            const activos = items.filter((i) => i.activo && !estaVencida(i)).length;
            const vencidos = items.filter((i) => estaVencida(i)).length;
            const levantados = items.filter((i) => !i.activo).length;
            setStats({ activos, levantados, vencidos });

        } catch (err) {
            console.error("❌ Error cargando sancionados:", err);
            setLista([]);
            setTotal(0);
        } finally {
            setCargandoLista(false);
            setBuscando(false);
        }
    }, []); // eslint-disable-line

    useEffect(() => { cargarLista("", 1); }, [cargarLista]);

    // ─────────────────────────────────────────────────────────────────────────
    // Búsqueda debounced
    // ─────────────────────────────────────────────────────────────────────────
    const buscarDebounced = useRef(
        debounce((query) => {
            setPage(1);
            cargarLista(query, 1);
        }, 400)
    ).current;

    const handleBusqueda = (e) => {
        const value = e.target.value;
        setBusqueda(value);
        setBuscando(!!value);
        buscarDebounced(value);
    };

    const limpiarBusqueda = () => {
        setBusqueda("");
        setSinResultados(false);
        setBuscando(false);
        buscarDebounced.cancel();
        setPage(1);
        cargarLista("", 1);
    };

    const handlePageChange = (nuevaPagina) => {
        setPage(nuevaPagina);
        cargarLista(busqueda, nuevaPagina);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Seleccionar para editar
    // ─────────────────────────────────────────────────────────────────────────
    const seleccionarRegistro = (item) => {
        setSeleccionado(item);
        setModoCrear(false);
        setForm({
            dni: item.dni || "",
            nombres: item.apellidos_nombres || "",
            tipo_sancion: TIPO_MAP_TO_FRONTEND[item.tipo_sancion] || "",
            fecha_inicio: item.fecha_resolucion ? item.fecha_resolucion.slice(0, 10) : "",
            fecha_fin: item.fecha_fin ? item.fecha_fin.slice(0, 10) : "",
            motivo: item.observaciones || "",
            activo: item.activo ?? true,
        });
    };

    const iniciarCrear = () => {
        setSeleccionado(null);
        setModoCrear(true);
        setForm(FORM_INICIAL);
    };

    const limpiarPanel = () => {
        setSeleccionado(null);
        setModoCrear(false);
        setForm(FORM_INICIAL);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Guardar (crear / actualizar)
    // ─────────────────────────────────────────────────────────────────────────
    const guardar = async () => {
        if (!form.dni.trim()) {
            Swal.fire({ icon: "warning", title: "Campo requerido", text: "El DNI es obligatorio.", confirmButtonColor: "#F64E60" });
            return;
        }
        if (!form.nombres.trim()) {
            Swal.fire({ icon: "warning", title: "Campo requerido", text: "El nombre es obligatorio.", confirmButtonColor: "#F64E60" });
            return;
        }
        if (!form.tipo_sancion) {
            Swal.fire({ icon: "warning", title: "Campo requerido", text: "Selecciona el tipo de sanción.", confirmButtonColor: "#F64E60" });
            return;
        }
        if (!form.fecha_inicio) {
            Swal.fire({ icon: "warning", title: "Campo requerido", text: "La fecha de resolución es obligatoria.", confirmButtonColor: "#F64E60" });
            return;
        }

        setGuardando(true);
        try {
            const payload = {
                dni: form.dni.trim(),
                apellidos_nombres: form.nombres.trim(),
                tipo_sancion: TIPO_MAP_TO_BACKEND[form.tipo_sancion],
                fecha_resolucion: form.fecha_inicio || null,
                fecha_fin: form.tipo_sancion === "PERMANENTE" ? null : (form.fecha_fin || null),
                observaciones: form.motivo.trim() || null,
                activo: form.activo,
            };

            let cuentaDesactivada = false;
            let cuentaReactivada = false;

            if (seleccionado) {
                // ── Actualizar sanción existente ──────────────────────────────
                await axios.put(
                    `${API_URL}/sanciones/${seleccionado.id}`,
                    payload,
                    { headers: headers() }
                );
            } else {
                // ── Crear nueva sanción ───────────────────────────────────────
                const res = await axios.post(
                    `${API_URL}/sanciones/`,
                    payload,
                    { headers: headers() }
                );
                cuentaDesactivada = res.data?.cuenta_desactivada ?? false;
            }

            // ── Swal de éxito con aviso de cuenta si aplica ───────────────────
            const esNuevo = !seleccionado;

            await Swal.fire({
                icon: "success",
                title: seleccionado ? "Registro actualizado" : "Sanción registrada",
                html: `
                <p style="margin-bottom:${(esNuevo && cuentaDesactivada) ? "12px" : "0"}">
                    <strong>${form.nombres}</strong> fue
                    ${seleccionado ? "actualizado" : "registrado"} correctamente.
                </p>
                ${esNuevo && cuentaDesactivada ? `
                    <div style="
                        background: #FFF4DE;
                        border: 1px solid #FFA800;
                        border-radius: 8px;
                        padding: 10px 14px;
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                        text-align: left;
                        font-size: 13px;
                    ">
                        <i class="fas fa-user-lock" style="color:#FFA800; margin-top:2px; flex-shrink:0"></i>
                        <div>
                            <strong style="color:#856404; display:block; margin-bottom:2px">
                                Cuenta desactivada automáticamente
                            </strong>
                            <span style="color:#856404">
                                El docente no podrá iniciar sesión hasta que se levante la sanción.
                            </span>
                        </div>
                    </div>
                ` : ""}
            `,
                confirmButtonColor: "#3699FF",
                confirmButtonText: "Entendido",
            });

            limpiarPanel();
            cargarLista(busqueda, page);

        } catch (err) {
            const detail = err.response?.data?.detail;

            // El backend puede devolver detail como string u objeto
            const msg = typeof detail === "string"
                ? detail
                : typeof detail === "object" && detail?.mensaje
                    ? detail.mensaje
                    : "Error al guardar el registro.";

            Swal.fire({
                icon: "error",
                title: "Error",
                text: msg,
                confirmButtonColor: "#F64E60",
            });
        } finally {
            setGuardando(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Levantar sanción
    // ─────────────────────────────────────────────────────────────────────────
    const levantarSancion = async (item) => {
        const { value: motivo, isConfirmed } = await Swal.fire({
            title: "Levantar sanción",
            html: `
                <p class="text-muted mb-3">
                    Docente: <strong>${item.apellidos_nombres}</strong>
                </p>
                <textarea
                    id="swal-motivo"
                    class="swal2-textarea"
                    placeholder="Motivo del levantamiento (requerido)..."
                    style="height:100px"
                ></textarea>
            `,
            showCancelButton: true,
            confirmButtonText: "Confirmar levantamiento",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#1BC5BD",
            preConfirm: () => {
                const val = document.getElementById("swal-motivo").value.trim();
                if (!val) {
                    Swal.showValidationMessage("Debes ingresar el motivo del levantamiento.");
                    return false;
                }
                return val;
            },
        });

        if (!isConfirmed || !motivo) return;

        try {
            await axios.patch(
                `${API_URL}/sanciones/${item.id}/levantar`,
                null,
                { params: { observacion: motivo }, headers: headers() }
            );
            await Swal.fire({
                icon: "success",
                title: "Sanción levantada",
                text: `La sanción de ${item.apellidos_nombres} fue levantada correctamente.`,
                confirmButtonColor: "#3699FF",
            });
            limpiarPanel();
            cargarLista(busqueda, page);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "No se pudo levantar la sanción.",
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Eliminar
    // ─────────────────────────────────────────────────────────────────────────
    const eliminar = async (item) => {
        const confirm = await Swal.fire({
            icon: "warning",
            title: "¿Eliminar registro?",
            text: `Se eliminará permanentemente la sanción de ${item.apellidos_nombres} (DNI: ${item.dni}).`,
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#F64E60",
        });
        if (!confirm.isConfirmed) return;

        try {
            await axios.delete(`${API_URL}/sanciones/${item.id}`, { headers: headers() });
            Swal.fire({ icon: "success", title: "Registro eliminado", confirmButtonColor: "#3699FF" });
            if (seleccionado?.id === item.id) limpiarPanel();
            cargarLista(busqueda, page);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.response?.data?.detail || "No se pudo eliminar.",
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Importar Excel
    // ─────────────────────────────────────────────────────────────────────────
    const importarExcel = async (e) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;

        const confirm = await Swal.fire({
            icon: "question",
            title: "¿Importar lista?",
            text: `Se importará: ${archivo.name}`,
            showCancelButton: true,
            confirmButtonText: "Sí, importar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3699FF",
        });
        if (!confirm.isConfirmed) {
            fileInputRef.current.value = "";
            return;
        }

        setImportando(true);
        try {
            const formData = new FormData();
            formData.append("file", archivo);

            const res = await axios.post(
                `${API_URL}/sanciones/importar-excel`,
                formData,
                { headers: { ...headers(), "Content-Type": "multipart/form-data" } }
            );

            const { insertados = 0, omitidos = 0, errores = [] } = res.data;
            await Swal.fire({
                icon: "success",
                title: "Importación completada",
                html: `
                    <p><strong>${insertados}</strong> sanciones importadas</p>
                    <p><strong>${omitidos}</strong> omitidas (duplicadas)</p>
                    ${errores.length
                        ? `<p>⚠️ <strong>${errores.length}</strong> filas con error</p>`
                        : ""}
                `,
                confirmButtonColor: "#3699FF",
            });
            cargarLista(busqueda, 1);
            setPage(1);
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error en importación",
                text: err.response?.data?.detail || "No se pudo importar el archivo.",
            });
        } finally {
            setImportando(false);
            fileInputRef.current.value = "";
        }
    };

    // ════════════════════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════════════════════
    return (
        <div className="container-fluid px-0">

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div
                className="card card-custom mb-7"
                style={{ background: "linear-gradient(135deg, #7B1E1E 0%, #F64E60 100%)", border: "none" }}
            >
                <div className="card-body py-8 px-8">
                    <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 12 }}>

                        {/* Título + stats */}
                        <div className="d-flex align-items-center">
                            <div
                                className="d-flex align-items-center justify-content-center rounded mr-5"
                                style={{ width: 56, height: 56, backgroundColor: "rgba(255,255,255,0.15)" }}
                            >
                                <i className="fas fa-user-slash text-white" style={{ fontSize: 26 }} />
                            </div>
                            <div>
                                <h2 className="text-white font-weight-bolder mb-1">
                                    Docentes Sancionados
                                </h2>
                                <p className="text-white mb-2" style={{ opacity: 0.8 }}>
                                    Gestiona el registro de docentes impedidos de postular.
                                </p>
                                {/* Stats rápidos */}
                                <div className="d-flex" style={{ gap: 8 }}>
                                    <span
                                        className="label label-inline font-weight-bold"
                                        style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
                                    >
                                        <i className="fas fa-ban mr-1" style={{ fontSize: 10 }} />
                                        {stats.activos} activos
                                    </span>
                                    {stats.vencidos > 0 && (
                                        <span
                                            className="label label-inline font-weight-bold"
                                            style={{ backgroundColor: "#FFA800", color: "#fff" }}
                                        >
                                            <i className="fas fa-clock mr-1" style={{ fontSize: 10 }} />
                                            {stats.vencidos} vencidos
                                        </span>
                                    )}
                                    <span
                                        className="label label-inline font-weight-bold"
                                        style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }}
                                    >
                                        <i className="fas fa-unlock mr-1" style={{ fontSize: 10 }} />
                                        {stats.levantados} levantados
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="d-flex" style={{ gap: 10 }}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx,.xls"
                                style={{ display: "none" }}
                                onChange={importarExcel}
                            />
                            <button
                                className="btn btn-light-warning font-weight-bolder px-5"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importando}
                            >
                                {importando
                                    ? <span className="spinner-border spinner-border-sm mr-2" />
                                    : <i className="fas fa-file-excel mr-2" />}
                                Importar Excel
                            </button>
                            <button
                                className="btn btn-light font-weight-bolder px-6"
                                onClick={iniciarCrear}
                            >
                                <i className="fas fa-plus mr-2" />
                                Nuevo registro
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">

                {/* ── PANEL IZQUIERDO — Lista ─────────────────────────────────── */}
                <div className="col-xl-5 col-lg-5 mb-7">
                    <div className="card card-custom h-100">
                        <div className="card-header border-0 pt-6">
                            <h5 className="card-title font-weight-bolder text-dark">
                                <i className="fas fa-list text-danger mr-2" />
                                Listado de Sancionados
                            </h5>
                            {total > 0 && (
                                <div className="card-toolbar">
                                    <span className="text-muted font-size-sm">
                                        {total} registro{total !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="card-body pt-2">

                            {/* Búsqueda */}
                            <div className="position-relative mb-4">
                                <span
                                    className="position-absolute"
                                    style={{ left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 1 }}
                                >
                                    {buscando
                                        ? <span className="spinner-border spinner-border-sm text-danger" />
                                        : <i className="fas fa-search text-muted" />}
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar por nombre o DNI..."
                                    value={busqueda}
                                    onChange={handleBusqueda}
                                    style={{ paddingLeft: 40 }}
                                />
                                {busqueda && (
                                    <button
                                        className="btn btn-icon btn-xs position-absolute"
                                        style={{ right: 8, top: "50%", transform: "translateY(-50%)" }}
                                        onClick={limpiarBusqueda}
                                    >
                                        <i className="fas fa-times text-muted" />
                                    </button>
                                )}
                            </div>

                            {/* Estados de carga / vacío */}
                            {cargandoLista && (
                                <div className="d-flex justify-content-center py-8">
                                    <span className="spinner-border text-danger" />
                                </div>
                            )}

                            {!cargandoLista && sinResultados && (
                                <div className="text-center py-6">
                                    <i className="fas fa-search text-muted mb-3" style={{ fontSize: 32 }} />
                                    <p className="text-muted font-weight-bold mb-0">Sin resultados</p>
                                    <span className="text-muted font-size-xs">
                                        Intenta con otro nombre o DNI
                                    </span>
                                </div>
                            )}

                            {!cargandoLista && !sinResultados && lista.length === 0 && (
                                <div className="text-center py-6">
                                    <i className="fas fa-user-check text-muted mb-3" style={{ fontSize: 32 }} />
                                    <p className="text-muted font-weight-bold mb-0">
                                        No hay docentes sancionados
                                    </p>
                                </div>
                            )}

                            {/* Items */}
                            {!cargandoLista && lista.length > 0 && (
                                <>
                                    <div className="border rounded" style={{ maxHeight: 480, overflowY: "auto" }}>
                                        {lista.map((item) => {
                                            const isSelected = seleccionado?.id === item.id;
                                            const vencida = estaVencida(item);
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="d-flex align-items-center p-4 border-bottom"
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "background 0.15s",
                                                        backgroundColor: isSelected ? "#FFF5F8" : "transparent",
                                                        borderLeft: isSelected
                                                            ? "3px solid #F64E60"
                                                            : vencida
                                                                ? "3px solid #FFA800"
                                                                : "3px solid transparent",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected)
                                                            e.currentTarget.style.backgroundColor = "#F3F6F9";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected)
                                                            e.currentTarget.style.backgroundColor = "transparent";
                                                    }}
                                                    onClick={() => seleccionarRegistro(item)}
                                                >
                                                    {/* Avatar */}
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                        style={{
                                                            width: 38,
                                                            height: 38,
                                                            flexShrink: 0,
                                                            backgroundColor: vencida
                                                                ? "#FFF4DE"
                                                                : item.activo ? "#FFE2E5" : "#F3F6F9",
                                                        }}
                                                    >
                                                        <i
                                                            className="fas fa-user-slash"
                                                            style={{
                                                                color: vencida
                                                                    ? "#FFA800"
                                                                    : item.activo ? "#F64E60" : "#B5B5C3",
                                                                fontSize: 14,
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                        <p className="font-weight-bold text-dark mb-0 font-size-sm text-truncate">
                                                            {item.apellidos_nombres}
                                                        </p>
                                                        <span className="text-muted font-size-xs">
                                                            DNI: {item.dni}
                                                        </span>
                                                        <div className="mt-1 d-flex align-items-center flex-wrap" style={{ gap: 4 }}>
                                                            <SancionBadge tipo={item.tipo_sancion} />
                                                            <ActivoBadge activo={item.activo} vencida={vencida} />
                                                        </div>
                                                        {item.fecha_fin && (
                                                            <span className="text-muted font-size-xs d-block mt-1">
                                                                <i className="fas fa-calendar-times mr-1" />
                                                                Vence: {formatFecha(item.fecha_fin)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Acciones */}
                                                    <div
                                                        className="d-flex flex-column align-items-center ml-2"
                                                        style={{ gap: 4 }}
                                                    >
                                                        <button
                                                            className="btn btn-icon btn-xs btn-light-primary"
                                                            title="Editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                seleccionarRegistro(item);
                                                            }}
                                                        >
                                                            <i className="fas fa-edit" style={{ fontSize: 11 }} />
                                                        </button>
                                                        {item.activo && (
                                                            <button
                                                                className="btn btn-icon btn-xs btn-light-success"
                                                                title="Levantar sanción"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    levantarSancion(item);
                                                                }}
                                                            >
                                                                <i className="fas fa-unlock" style={{ fontSize: 11 }} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn btn-icon btn-xs btn-light-danger"
                                                            title="Eliminar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                eliminar(item);
                                                            }}
                                                        >
                                                            <i className="fas fa-trash" style={{ fontSize: 11 }} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Paginación */}
                                    <Paginacion
                                        page={page}
                                        total={total}
                                        pageSize={PAGE_SIZE}
                                        onChange={handlePageChange}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── PANEL DERECHO — Formulario ──────────────────────────────── */}
                <div className="col-xl-7 col-lg-7 mb-7">
                    <div className="card card-custom h-100">
                        <div className="card-header border-0 pt-6">
                            <h5 className="card-title font-weight-bolder text-dark">
                                <i className="fas fa-edit text-danger mr-2" />
                                {seleccionado ? "Editar Sanción" : modoCrear ? "Nuevo Registro" : "Detalle"}
                            </h5>
                            {(seleccionado || modoCrear) && (
                                <div className="card-toolbar d-flex" style={{ gap: 8 }}>
                                    {seleccionado && seleccionado.activo && (
                                        <button
                                            className="btn btn-light-success btn-sm font-weight-bold"
                                            onClick={() => levantarSancion(seleccionado)}
                                        >
                                            <i className="fas fa-unlock mr-2" />
                                            Levantar sanción
                                        </button>
                                    )}
                                    {seleccionado && (
                                        <button
                                            className="btn btn-light-danger btn-sm font-weight-bold"
                                            onClick={() => eliminar(seleccionado)}
                                        >
                                            <i className="fas fa-trash mr-2" />
                                            Eliminar
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-light btn-sm font-weight-bold"
                                        onClick={limpiarPanel}
                                    >
                                        <i className="fas fa-times mr-2" />
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="card-body pt-2">

                            {/* ── Estado vacío ── */}
                            {!seleccionado && !modoCrear && (
                                <div
                                    className="d-flex flex-column align-items-center justify-content-center"
                                    style={{ minHeight: 360 }}
                                >
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-circle mb-5"
                                        style={{ width: 80, height: 80, backgroundColor: "#FFF5F8" }}
                                    >
                                        <i className="fas fa-user-slash" style={{ fontSize: 32, color: "#F64E60" }} />
                                    </div>
                                    <p className="font-weight-bolder text-dark mb-2">
                                        Selecciona un registro
                                    </p>
                                    <p className="text-muted text-center mb-6" style={{ maxWidth: 280 }}>
                                        Elige un docente de la lista para editar su sanción,
                                        o crea un nuevo registro.
                                    </p>
                                    <button
                                        className="btn btn-light-danger font-weight-bold"
                                        onClick={iniciarCrear}
                                    >
                                        <i className="fas fa-plus mr-2" />
                                        Nuevo registro
                                    </button>
                                </div>
                            )}

                            {/* ── Formulario ── */}
                            {(seleccionado || modoCrear) && (
                                <div>

                                    {/* Alerta: sanción ya levantada */}
                                    {seleccionado && !seleccionado.activo && (
                                        <div className="alert alert-custom alert-light-success mb-5">
                                            <div className="alert-icon">
                                                <i className="fas fa-unlock text-success" />
                                            </div>
                                            <div className="alert-text font-weight-bold">
                                                Esta sanción ya fue levantada por un administrador.
                                            </div>
                                        </div>
                                    )}

                                    {/* Alerta: sanción temporal vencida sin levantar */}
                                    {seleccionado && estaVencida(seleccionado) && (
                                        <div className="alert alert-custom alert-light-warning mb-5">
                                            <div className="alert-icon">
                                                <i className="fas fa-exclamation-triangle text-warning" />
                                            </div>
                                            <div className="alert-text">
                                                <span className="font-weight-bolder d-block">
                                                    Sanción vencida — pendiente de revisión
                                                </span>
                                                <span className="font-size-sm">
                                                    La fecha de término ({formatFecha(seleccionado.fecha_fin)}) ya
                                                    pasó, pero el docente sigue bloqueado hasta que levantes la
                                                    sanción manualmente.
                                                </span>
                                                <div className="mt-2">
                                                    <button
                                                        className="btn btn-warning btn-sm font-weight-bold"
                                                        onClick={() => levantarSancion(seleccionado)}
                                                    >
                                                        <i className="fas fa-unlock mr-2" />
                                                        Levantar ahora
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="row">
                                        {/* DNI */}
                                        <div className="col-md-4 mb-5">
                                            <label className="font-weight-bold text-dark">DNI *</label>
                                            <input
                                                type="text"
                                                className="form-control mt-1"
                                                placeholder="Ej: 45678901"
                                                maxLength={20}
                                                value={form.dni}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((p) => ({ ...p, dni: val }));
                                                }}
                                            />
                                        </div>
                                        {/* Nombres */}
                                        <div className="col-md-8 mb-5">
                                            <label className="font-weight-bold text-dark">
                                                Nombres y Apellidos *
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control mt-1"
                                                placeholder="Ej: PÉREZ GARCÍA, JUAN"
                                                value={form.nombres}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((p) => ({ ...p, nombres: val }));
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Tipo de sanción */}
                                    <div className="form-group mb-5">
                                        <label className="font-weight-bold text-dark d-block">
                                            Tipo de Sanción *
                                        </label>
                                        <div className="d-flex mt-2" style={{ gap: 12 }}>
                                            {TIPO_SANCION_OPTIONS.map((op) => (
                                                <div
                                                    key={op.value}
                                                    className="d-flex align-items-center border rounded p-4 flex-grow-1"
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "all 0.15s",
                                                        borderColor: form.tipo_sancion === op.value
                                                            ? SANCION_COLORS[op.value]?.text : "#EBEDF3",
                                                        backgroundColor: form.tipo_sancion === op.value
                                                            ? SANCION_COLORS[op.value]?.bg : "#fff",
                                                    }}
                                                    onClick={() => {
                                                        const tipo = op.value;
                                                        setForm((p) => ({
                                                            ...p,
                                                            tipo_sancion: tipo,
                                                            fecha_fin: tipo === "PERMANENTE" ? "" : p.fecha_fin,
                                                        }));
                                                    }}
                                                >
                                                    <div
                                                        className="d-flex align-items-center justify-content-center rounded-circle mr-3"
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            flexShrink: 0,
                                                            border: `2px solid ${form.tipo_sancion === op.value
                                                                ? SANCION_COLORS[op.value]?.text : "#EBEDF3"}`,
                                                            backgroundColor: form.tipo_sancion === op.value
                                                                ? SANCION_COLORS[op.value]?.text : "transparent",
                                                        }}
                                                    >
                                                        {form.tipo_sancion === op.value && (
                                                            <i className="fas fa-check text-white" style={{ fontSize: 10 }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span
                                                            className="font-weight-bolder font-size-sm d-block"
                                                            style={{
                                                                color: form.tipo_sancion === op.value
                                                                    ? SANCION_COLORS[op.value]?.text : "#3F4254",
                                                            }}
                                                        >
                                                            {op.label}
                                                        </span>
                                                        <span className="text-muted font-size-xs">
                                                            {op.value === "PERMANENTE"
                                                                ? "Sin fecha de término"
                                                                : "Con fecha de término"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="row">
                                        {/* Fecha resolución */}
                                        <div className="col-md-6 mb-5">
                                            <label className="font-weight-bold text-dark">
                                                Fecha de Resolución *
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control mt-1"
                                                value={form.fecha_inicio}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((p) => ({ ...p, fecha_inicio: val }));
                                                }}
                                            />
                                        </div>
                                        {/* Fecha fin */}
                                        <div className="col-md-6 mb-5">
                                            <label className="font-weight-bold text-dark">
                                                Fecha de Término
                                                <span className="text-muted font-weight-normal ml-2 font-size-sm">
                                                    (vacío = indefinida)
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                className="form-control mt-1"
                                                value={form.fecha_fin}
                                                disabled={form.tipo_sancion === "PERMANENTE"}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setForm((p) => ({ ...p, fecha_fin: val }));
                                                }}
                                            />
                                            {form.tipo_sancion === "PERMANENTE" && (
                                                <span className="text-muted font-size-xs mt-1 d-block">
                                                    <i className="fas fa-info-circle mr-1" />
                                                    Las sanciones permanentes no tienen fecha de término
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Motivo */}
                                    <div className="form-group mb-5">
                                        <label className="font-weight-bold text-dark">
                                            Motivo
                                            <span className="text-muted font-weight-normal ml-2 font-size-sm">
                                                (opcional)
                                            </span>
                                        </label>
                                        <textarea
                                            className="form-control mt-1"
                                            rows={3}
                                            placeholder="Describe el motivo de la sanción..."
                                            value={form.motivo}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setForm((p) => ({ ...p, motivo: val }));
                                            }}
                                        />
                                    </div>

                                    {/* Estado */}
                                    <div className="form-group mb-5">
                                        <label className="font-weight-bold text-dark d-block">Estado</label>
                                        <div
                                            className="d-flex align-items-center border rounded p-3 mt-1"
                                            style={{
                                                cursor: "pointer",
                                                maxWidth: 160,
                                                borderColor: form.activo ? "#1BC5BD" : "#EBEDF3",
                                                backgroundColor: form.activo ? "#E8FFF3" : "#F3F6F9",
                                            }}
                                            onClick={() => setForm((p) => ({ ...p, activo: !p.activo }))}
                                        >
                                            <div
                                                className="d-flex align-items-center justify-content-center rounded-circle mr-2"
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    flexShrink: 0,
                                                    border: `2px solid ${form.activo ? "#1BC5BD" : "#EBEDF3"}`,
                                                    backgroundColor: form.activo ? "#1BC5BD" : "transparent",
                                                }}
                                            >
                                                {form.activo && (
                                                    <i className="fas fa-check text-white" style={{ fontSize: 10 }} />
                                                )}
                                            </div>
                                            <span
                                                className="font-weight-bold font-size-sm"
                                                style={{ color: form.activo ? "#1BC5BD" : "#7E8299" }}
                                            >
                                                {form.activo ? "Activo" : "Levantada"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Botón guardar */}
                                    <div className="d-flex justify-content-end mt-2">
                                        <button
                                            className="btn btn-danger font-weight-bolder px-8 py-4"
                                            onClick={guardar}
                                            disabled={guardando}
                                        >
                                            {guardando ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm mr-2" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-save mr-2" />
                                                    {seleccionado ? "Actualizar registro" : "Registrar sanción"}
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

export default DocentesSancionadosPage;
