import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// ===================== ENDPOINTS ACTUALES =====================

export const LOGIN_URL = `${API_BASE}/auth/login`;
export const INICIAR_REGISTRO_URL = `${API_BASE}/auth/iniciar-registro`;
export const VERIFICAR_CODIGO_URL = `${API_BASE}/auth/verificar-codigo`;
export const COMPLETAR_REGISTRO_URL = `${API_BASE}/auth/completar-registro`;
export const REENVIAR_CODIGO_URL = `${API_BASE}/auth/reenviar-codigo`;
export const RECORDAR_CREDENCIALES_URL = `${API_BASE}/auth/recordar-credenciales`;
export const ME_URL = `${API_BASE}/auth/me`;
export const LOGOUT_URL = `${API_BASE}/auth/logout`;

// ===================== COMPATIBILIDAD METRONIC / LEGACY =====================
// Estos nombres antiguos se mantienen porque algunos mocks o archivos viejos
// de Metronic todavía los importan, aunque el flujo real ya use otros endpoints.

export const REGISTER_URL = INICIAR_REGISTRO_URL;
export const REQUEST_PASSWORD_URL = RECORDAR_CREDENCIALES_URL;

// ===================== LOGIN =====================

export function login(username, password) {
  return axios.post(LOGIN_URL, {
    username,
    password,
  });
}

// ===================== REGISTRO SIMPLIFICADO =====================

export function iniciarRegistro(datos) {
  return axios.post(INICIAR_REGISTRO_URL, datos);
}

export function verificarCodigo(email, codigo) {
  return axios.post(VERIFICAR_CODIGO_URL, {
    email,
    codigo,
  });
}

export function completarRegistro(email, password, confirmPassword) {
  return axios.post(COMPLETAR_REGISTRO_URL, {
    email,
    password,
    confirm_password: confirmPassword,
  });
}

export function reenviarCodigo(email) {
  return axios.post(REENVIAR_CODIGO_URL, {
    email,
  });
}

// ===================== RECORDAR CREDENCIALES =====================

export function requestPassword(email) {
  return axios.post(RECORDAR_CREDENCIALES_URL, {
    email,
  });
}

export function recordarCredenciales(email) {
  return requestPassword(email);
}

// ===================== USUARIO ACTUAL =====================

export function getUserByToken() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return Promise.reject(new Error("No hay token disponible"));
  }

  return axios.get(ME_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

// ===================== LOGOUT =====================

export function logout() {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return Promise.resolve();
  }

  return axios.post(
    LOGOUT_URL,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

// ===================== REGISTER LEGACY =====================
// Se mantiene para que imports antiguos no rompan.
// No es el flujo principal actual.

export function register(email, fullname, username, password) {
  return axios.post(INICIAR_REGISTRO_URL, {
    email,
    nombres: fullname,
    username,
    password,
  });
}