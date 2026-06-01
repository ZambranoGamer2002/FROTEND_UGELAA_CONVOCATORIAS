/**
 * getFolderColor.js
 * Utilidades para resolver el color real del folder de una especialidad.
 *
 * Lógica de resolución (en orden):
 *  1. Usa color_folder_hex si existe y no es null/vacío
 *  2. Busca en FOLDER_COLORS_FALLBACK por el nombre en color_folder
 *  3. Devuelve azul por defecto (#3699FF)
 */

// ── Mapa de colores por nombre de folder ─────────────────────────────────────
// Cubre los colores más comunes usados en carpetas del MINEDU
export const FOLDER_COLORS_FALLBACK = {
  'AMARILLO': '#FFC107',
  'ROJO': '#F64E60',
  'AZUL': '#3699FF',
  'ROSADO': '#FF69B4',
  'GRIS': '#B5B5C3',
  'FUCSIA': '#E91E8C',
  'VERDE OSCURO': '#1B5E20',
  'VERDE LIMON': '#8BC34A',
  'MARRON': '#795548',
  'BLANCO': '#ECEFF1',
  'VERDE NEON': '#76FF03',
  'TURQUEZA': '#00BCD4',
  'TURQUESA': '#00BCD4',
  'LILA': '#CE93D8',
  'NEGRO': '#212121',
  'CELESTE BEBE': '#B3E5FC',
  'CELESTE': '#29B6F6',
  'ANARANJADO': '#FF9800',
  'NARANJA': '#FF9800',
  'CREMA': '#FFF8E1',
  'MANILA': '#FFF8E1',
  'MORADO': '#9C27B0',
  'PLOMO': '#90A4AE',
  'BEIGE': '#F5F0E8',
}

/**
 * Resuelve el color hex del folder de una especialidad.
 *
 * @param {object|null} especialidad - Objeto especialidad del catálogo
 * @returns {string} Color en formato hex, ej: "#FF69B4"
 *
 * @example
 * getFolderColor({ color_folder_hex: '#FF69B4' })   // → '#FF69B4'
 * getFolderColor({ color_folder: 'ROSADO' })         // → '#FF69B4'
 * getFolderColor({ color_folder: 'CREMA - MANILA' }) // → '#FFF8E1'
 * getFolderColor(null)                               // → '#3699FF'
 */
export const getFolderColor = (especialidad) => {
  if (!especialidad) return '#3699FF'

  // 1. Usar hex directo si está disponible
  if (especialidad.color_folder_hex) return especialidad.color_folder_hex

  // 2. Buscar por nombre (normalizado a mayúsculas, sin espacios extra)
  const nombre = (especialidad.color_folder || '').toUpperCase().trim()
  if (!nombre) return '#3699FF'

  // Búsqueda exacta primero
  if (FOLDER_COLORS_FALLBACK[nombre]) return FOLDER_COLORS_FALLBACK[nombre]

  // Búsqueda parcial (ej: "CREMA - MANILA" contiene "CREMA")
  for (const key of Object.keys(FOLDER_COLORS_FALLBACK)) {
    if (nombre.includes(key)) return FOLDER_COLORS_FALLBACK[key]
  }

  // 3. Fallback por defecto
  return '#3699FF'
}

/**
 * Calcula si el texto encima del color debe ser blanco o negro
 * según la luminancia del color de fondo (fórmula WCAG).
 *
 * @param {string} hexColor - Color en formato hex, ej: "#FF69B4"
 * @returns {string} '#ffffff' o '#212121'
 *
 * @example
 * getFolderTextColor('#FFC107') // → '#212121' (amarillo → texto negro)
 * getFolderTextColor('#1B5E20') // → '#ffffff' (verde oscuro → texto blanco)
 */
export const getFolderTextColor = (hexColor) => {
  if (!hexColor) return '#ffffff'
  const hex = hexColor.replace('#', '')
  if (hex.length < 6) return '#ffffff'
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#212121' : '#ffffff'
}