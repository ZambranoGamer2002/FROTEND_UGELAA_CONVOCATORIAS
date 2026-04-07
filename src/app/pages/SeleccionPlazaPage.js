import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";

// Opciones estáticas
const OPCIONES = {
    modalidad: ['EBR', 'EBA', 'EBE', 'ETP'],
    nivel: ['Inicial', 'Primaria', 'Secundaria'],
    especialidad: ['Comunicación', 'Matemática', 'Ciencias Sociales', 'EPT', 'Inglés'],
    folderColor: ['Amarillo', 'Rojo', 'Azul', 'Rosado', 'Gris', 'Fucsia'],
    caracteristica: ['Estatal', 'Bilingüe', 'Unidocente', 'Multigrado'],
};

const SeleccionPlazaPage = () => {
    const history = useHistory();
    const [formData, setFormData] = useState({
        modalidad: '',
        nivel: '',
        especialidad: '',
        folderColor: '',
        caracteristica: '',
        puntajeCaracteristica: 0,
    });

    const [loading, setLoading] = useState(false);

    // Esto cambiará el color del folder automáticamente cuando se seleccione una especialidad
    useEffect(() => {
        if (formData.especialidad) {
            // Aquí debes realizar una lógica que asigne automáticamente el color del folder dependiendo de la especialidad
            if (formData.especialidad === "Comunicación") {
                setFormData(prevData => ({ ...prevData, folderColor: 'Rojo' }));
            } else if (formData.especialidad === "Matemática") {
                setFormData(prevData => ({ ...prevData, folderColor: 'Azul' }));
            } else {
                setFormData(prevData => ({ ...prevData, folderColor: 'Gris' }));
            }
        }
    }, [formData.especialidad]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({ ...prevState, [name]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        // Aquí iría la lógica para guardar la selección de plaza y sus datos
        console.log("Datos guardados:", formData);
        setLoading(false);
        history.push('/postulaciones');  // Redirigir al flujo de postulaciones
    };

    return (
        <div className="container-fluid px-0">
            {/* Header */}
            <div className="card card-custom mb-7" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)', border: 'none' }}>
                <div className="card-body py-8 px-8">
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between">
                        <div>
                            <h2 className="text-white font-weight-bolder mb-2">Selección de Plaza</h2>
                            <p className="text-white opacity-75 mb-0">Llene la información y seleccione los parámetros correspondientes.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Formulario de Selección de Plaza */}
                <div className="col-xl-8 col-lg-7">
                    <div className="card card-custom">
                        <div className="card-body">
                            <div className="form-group">
                                <label className="font-weight-bold">Modalidad <span className="text-danger">*</span></label>
                                <select
                                    className="form-control form-control-lg"
                                    name="modalidad"
                                    value={formData.modalidad}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccione...</option>
                                    {OPCIONES.modalidad.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="font-weight-bold">Nivel <span className="text-danger">*</span></label>
                                <select
                                    className="form-control form-control-lg"
                                    name="nivel"
                                    value={formData.nivel}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccione...</option>
                                    {OPCIONES.nivel.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="font-weight-bold">Especialidad <span className="text-danger">*</span></label>
                                <select
                                    className="form-control form-control-lg"
                                    name="especialidad"
                                    value={formData.especialidad}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccione...</option>
                                    {OPCIONES.especialidad.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="font-weight-bold">Color de Folder <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-lg"
                                    value={formData.folderColor}
                                    disabled
                                />
                            </div>

                            <div className="form-group">
                                <label className="font-weight-bold">Características de la Plaza</label>
                                <select
                                    className="form-control form-control-lg"
                                    name="caracteristica"
                                    value={formData.caracteristica}
                                    onChange={handleChange}
                                >
                                    <option value="">Seleccione...</option>
                                    {OPCIONES.caracteristica.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="font-weight-bold">Puntaje de Característica</label>
                                <input
                                    type="number"
                                    className="form-control form-control-lg"
                                    name="puntajeCaracteristica"
                                    value={formData.puntajeCaracteristica}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="d-flex justify-content-between">
                                <button type="button" className="btn btn-light-primary font-weight-bold" disabled={loading}>
                                    {loading ? "Guardando..." : "Guardar"}
                                </button>
                                <button type="button" className="btn btn-primary font-weight-bold" onClick={handleSave}>
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeleccionPlazaPage;