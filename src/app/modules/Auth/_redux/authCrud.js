import axios from "axios";

export const LOGIN_URL = `${process.env.REACT_APP_API_URL}/auth/login`;
export const REGISTER_URL = `${process.env.REACT_APP_API_URL}/auth/registro`;
export const REQUEST_PASSWORD_URL = `${process.env.REACT_APP_API_URL}/auth/forgot-password`;
export const ME_URL = `${process.env.REACT_APP_API_URL}/auth/me`;

export function login(email, password) {
  return axios.post(LOGIN_URL, { email, password });
}

export function register(email, fullname, username, password) {
  return axios.post(REGISTER_URL, { email, fullname, username, password });
}

export function requestPassword(email) {
  return axios.post(REQUEST_PASSWORD_URL, { email });
}

export function getUserByToken() {
  // Leer el token directamente desde localStorage
  const token = localStorage.getItem("access_token");

  if (!token) {
    return Promise.reject(new Error("No hay token disponible"));
  }

  // Enviar el token en el header Authorization
  return axios.get(ME_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}