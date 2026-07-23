/**
 * RUT Validator - Validador de RUT chileno
 *
 * El RUT (Rol Único Tributario) es el identificador único de personas en Chile.
 * Formato válido: XX.XXX.XXX-X (e.g., "12.345.678-5")
 *
 * El dígito verificador se calcula mediante el algoritmo módulo 11:
 * 1. Tomar el número del RUT (sin DV)
 * 2. Multiplicar cada dígito (de derecha a izquierda) por 2, 3, 4, 5, 6, 7, 2, 3, ... cíclicamente
 * 3. Sumar todos los productos
 * 4. Calcular: 11 - (suma % 11)
 * 5. Si resultado es 11 → DV es '0', si resultado es 10 → DV es 'K', sino DV es el resultado como string
 */

/**
 * Calcula el dígito verificador de un RUT
 * @param {number} rutNumber - Número del RUT sin DV
 * @returns {string} Dígito verificador ('0'-'9' o 'K')
 */
function calculateVerificationDigit(rutNumber) {
  let sum = 0;
  let multiplier = 2;
  let num = Math.abs(Math.floor(rutNumber));

  while (num > 0) {
    sum += (num % 10) * multiplier;
    num = Math.floor(num / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);

  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Normaliza un RUT removiendo puntos y guión
 * @param {string} rut - RUT en cualquier formato
 * @returns {string} RUT normalizado (sin puntos ni guión)
 */
function normalizeRut(rut) {
  if (typeof rut !== 'string') return '';
  return rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
}

/**
 * Valida formato y dígito verificador del RUT chileno
 * @param {string} rut - RUT en formato XX.XXX.XXX-X
 * @returns {boolean} true si el RUT es válido
 */
function validateRut(rut) {
  if (typeof rut !== 'string') return false;

  // Validar formato estricto: XX.XXX.XXX-X
  // Permite de 1 a 2 dígitos antes del primer punto, luego grupos de 3 dígitos separados por puntos, y DV después del guión
  const formatRegex = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;
  if (!formatRegex.test(rut)) return false;

  // Extraer número y dígito verificador
  const normalized = normalizeRut(rut);
  const dv = normalized.charAt(normalized.length - 1);
  const rutNumber = parseInt(normalized.slice(0, -1), 10);

  // Validar que el número sea positivo
  if (isNaN(rutNumber) || rutNumber <= 0) return false;

  // Calcular y comparar dígito verificador
  const calculatedDv = calculateVerificationDigit(rutNumber);
  return dv === calculatedDv;
}

module.exports = { validateRut, calculateVerificationDigit, normalizeRut };
