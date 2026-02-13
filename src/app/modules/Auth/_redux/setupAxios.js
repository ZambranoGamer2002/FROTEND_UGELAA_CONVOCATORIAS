/**
 * setupAxios.js
 * Configura interceptores de Axios para enviar el token JWT
 * automáticamente en todas las peticiones.
 * Se llama UNA VEZ desde src/index.js
 */
export default function setupAxios(axios, store) {
  // INTERCEPTOR DE REQUEST: agrega el token en cada petición
  axios.interceptors.request.use(
    (config) => {
      // 1. Intentar token desde Redux store
      const { auth: { authToken } } = store.getState()

      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`
      } else {
        // 2. Fallback: desde localStorage
        const localToken = localStorage.getItem("access_token")
        if (localToken) {
          config.headers.Authorization = `Bearer ${localToken}`
        }
      }

      return config
    },
    (err) => Promise.reject(err)
  )

  // INTERCEPTOR DE RESPONSE: manejar errores globales
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const isLoginRequest = error.config?.url?.includes("/auth/login")
        if (!isLoginRequest) {
          localStorage.removeItem("access_token")
          localStorage.removeItem("refresh_token")
        }
      }
      return Promise.reject(error)
    }
  )
}