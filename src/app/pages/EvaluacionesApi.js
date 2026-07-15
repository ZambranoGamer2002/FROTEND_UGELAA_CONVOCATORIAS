import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const EvaluacionesApi = {
    getConvocatoriaActiva() {
        return axios.get(`${API_URL}/convocatorias/activa`)
    },

    getMiPostulacionPorConvocatoria(convocatoriaId) {
        return axios.get(
            `${API_URL}/postulaciones/convocatoria/${convocatoriaId}/mi-postulacion`
        )
    },

    getRequisitosDisponibles(postulacionId) {
        return axios.get(
            `${API_URL}/prelaciones/postulaciones/${postulacionId}/requisitos-disponibles`
        )
    },

    getRequisitosPostulacion(postulacionId) {
        return axios.get(
            `${API_URL}/prelaciones/postulaciones/${postulacionId}/requisito-registrado`
        )
    },

    crearRequisito(postulacionId, payload) {
        return axios.post(
            `${API_URL}/prelaciones/postulaciones/${postulacionId}/requisito`,
            payload
        )
    },

    revisarRequisito(registroId, payload) {
        return axios.put(
            `${API_URL}/prelaciones/admin/requisitos-formacion/${registroId}/revisar`,
            payload
        )
    },

    subirDocumento({ archivo, tipo_documento, categoria = 'PERMANENTE' }) {
        const formData = new FormData()

        formData.append('archivo', archivo)
        formData.append('tipo_documento', tipo_documento)
        formData.append('categoria', categoria)

        return axios.post(`${API_URL}/documentos/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
    },

    listarMisDocumentos(params = {}) {
        return axios.get(`${API_URL}/documentos/mis-documentos`, {
            params,
        })
    },

    eliminarDocumento(documentoId) {
        return axios.delete(`${API_URL}/documentos/${documentoId}`)
    },
}

export default EvaluacionesApi
