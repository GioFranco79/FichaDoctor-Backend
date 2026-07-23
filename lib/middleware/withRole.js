const { error } = require('../utils/responseHelper');

/**
 * Middleware de autorización por rol (Higher-Order Function)
 * Recibe un array de roles permitidos y valida que req.user.role esté en la lista.
 * Debe usarse DESPUÉS de withAuth, por lo que req.user siempre estará disponible.
 *
 * Matriz de permisos:
 * - Admin: puede gestionar usuarios, NO accede a Fichas ni Recetas
 * - Doctor: accede a todo lo relacionado con sus pacientes
 * - Secretaria: gestiona agenda/citas del doctor asignado, NO accede a Fichas ni Recetas
 * - Paciente: accede solo a sus propios datos
 *
 * @param {string[]} allowedRoles - Array de roles permitidos para el endpoint
 * @returns {Function} HOF que envuelve el handler con validación de rol
 *
 * @example
 * // Uso en un endpoint:
 * withRole(['Doctor'])(handler)
 * withRole(['Admin'])(handler)
 * withRole(['Doctor', 'Secretaria'])(handler)
 */
function withRole(allowedRoles) {
  return function (handler) {
    return async (req, res) => {
      const userRole = req.user && req.user.role;

      // Verificar que el rol del usuario está en la lista de roles permitidos
      if (!userRole || !allowedRoles.includes(userRole)) {
        return error(
          res,
          'FORBIDDEN',
          'No tiene permisos para acceder a este recurso',
          403
        );
      }

      return handler(req, res);
    };
  };
}

module.exports = withRole;
