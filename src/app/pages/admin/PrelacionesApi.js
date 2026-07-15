import axios from 'axios'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

const normalizarLista = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.items)) return data.items
    if (Array.isArray(data?.data)) return data.data
    if (Array.isArray(data?.matrices)) return data.matrices
    if (Array.isArray(data?.requisitos)) return data.requisitos
    return []
}

const PrelacionesApi = {
    normalizarLista,

    listarMatrices(params = {}) {
        return axios.get(`${API_URL}/prelaciones/matrices`, { params })
    },

    crearMatriz(payload) {
        return axios.post(`${API_URL}/prelaciones/matrices`, payload)
    },

    actualizarMatriz(matrizId, payload) {
        return axios.put(`${API_URL}/prelaciones/matrices/${matrizId}`, payload)
    },

    listarRequisitos(matrizId) {
        return axios.get(`${API_URL}/prelaciones/matrices/${matrizId}/requisitos`)
    },

    crearRequisito(matrizId, payload) {
        return axios.post(`${API_URL}/prelaciones/matrices/${matrizId}/requisitos`, payload)
    },

    actualizarRequisito(requisitoId, payload) {
        return axios.put(`${API_URL}/prelaciones/requisitos/${requisitoId}`, payload)
    },

    listarConvocatorias(params = {}) {
        return axios.get(`${API_URL}/convocatorias/`, { params })
    },

    obtenerCatalogoPlaza() {
        return axios.get(`${API_URL}/catalogo/plaza/cascada`)
    },

    obtenerCaracteristicas() {
        return axios.get(`${API_URL}/catalogo/caracteristicas?solo_docente=true`)
    },
}

export default PrelacionesApi
