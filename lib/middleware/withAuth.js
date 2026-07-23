const supabase = require('../supabaseClient');
const supabaseAdmin = require('../supabaseAdmin');
const { error } = require('../utils/responseHelper');

/**
 * Middleware de autenticación (Higher-Order Function)
 * Verifica el JWT del header Authorization usando Supabase Auth.
 * Si el token es válido, adjunta los datos del usuario a req.user.
 * Si el token es inválido, expirado o ausente, rechaza con 401.
 *
 * @param {Function} handler - El handler de la ruta a proteger
 * @returns {Function} Handler envuelto con verificación de autenticación
 */
function withAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'AUTH_ERROR', 'Token de autenticación requerido', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return error(res, 'AUTH_ERROR', 'Token de autenticación requerido', 401);
    }

    try {
      // Verificar el token con Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return error(res, 'AUTH_ERROR', 'Token inválido o expirado', 401);
      }

      // Intentar obtener el rol del usuario desde la tabla users
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, email, role, first_name, last_name, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        // Si no hay perfil en la tabla users, usar metadata del JWT
        req.user = {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || null,
        };
      } else {
        // Verificar que la cuenta está activa
        if (!profile.is_active) {
          return error(res, 'AUTH_ERROR', 'Cuenta deshabilitada', 401);
        }

        req.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          first_name: profile.first_name,
          last_name: profile.last_name,
        };
      }

      return handler(req, res);
    } catch (err) {
      return error(res, 'AUTH_ERROR', 'Error de autenticación', 401);
    }
  };
}

module.exports = withAuth;
