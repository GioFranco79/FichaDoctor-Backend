const { validateRut } = require('../utils/rutValidator');
const supabaseAdmin = require('../supabaseAdmin');
const supabase = require('../supabaseClient');
const {
  ConflictError,
  AuthorizationError,
  AuthenticationError,
  AppError,
} = require('../errors');

/**
 * Servicio de Autenticación - authService
 *
 * Gestiona el registro, login, renovación de tokens, recuperación de contraseña
 * y registro de secretarias vinculadas a doctores.
 *
 * Usa supabaseAdmin para operaciones administrativas (crear usuarios)
 * y supabase (cliente público) para operaciones de auth del usuario.
 */

/**
 * Registra un nuevo usuario en el sistema.
 * - Valida el RUT con el algoritmo módulo 11
 * - Verifica que el email no esté duplicado (409)
 * - Rechaza registro con rol Admin (403)
 * - Crea usuario en Supabase Auth y perfil en tabla `users`
 *
 * @param {Object} data - Datos del registro
 * @param {string} data.email - Email del usuario
 * @param {string} data.password - Contraseña (min 8 caracteres)
 * @param {string} data.first_name - Nombre
 * @param {string} data.last_name - Apellido
 * @param {string} data.rut - RUT en formato XX.XXX.XXX-X
 * @param {string} data.role - Rol (Doctor, Paciente, Secretaria)
 * @returns {Object} Datos del usuario creado
 *
 * Requerimientos: 4.1, 4.2, 4.3, 4.4
 */
async function register(data) {
  const { email, password, first_name, last_name, rut, role, direccion, region, comuna, especialidad, fecha_nacimiento } = data;

  // Rechazar registro con rol Admin
  if (role === 'Admin') {
    throw new AuthorizationError(
      'No está permitido registrarse con rol de Administrador'
    );
  }

  // Validar RUT
  if (!validateRut(rut)) {
    throw new AppError(
      'El RUT proporcionado no es válido',
      400,
      'INVALID_RUT'
    );
  }

  // Verificar email duplicado
  const { data: existingUsers, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (lookupError) {
    throw new AppError(
      'Error al verificar disponibilidad del email',
      500,
      'INTERNAL_ERROR'
    );
  }

  if (existingUsers && existingUsers.length > 0) {
    throw new ConflictError('El email ya está registrado en el sistema');
  }

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    // Si Supabase reporta email duplicado a nivel de Auth
    if (
      authError.message &&
      authError.message.toLowerCase().includes('already')
    ) {
      throw new ConflictError('El email ya está registrado en el sistema');
    }
    throw new AppError(
      'Error al crear la cuenta de usuario',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Insertar perfil en tabla users
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      first_name,
      last_name,
      rut,
      role,
      direccion,
      region,
      comuna,
      fecha_nacimiento: fecha_nacimiento || null,
      ...(role === 'Doctor' && especialidad ? { especialidad } : {}),
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    // Intentar limpiar el usuario de Auth si falla la inserción del perfil
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError(
      'Error al crear el perfil de usuario',
      500,
      'INTERNAL_ERROR'
    );
  }

  return userProfile;
}

/**
 * Autentica un usuario con email y contraseña.
 * - Verifica credenciales via Supabase Auth
 * - Verifica que la cuenta esté activa (is_active)
 * - No revela si el email existe o no en mensajes de error
 *
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Object} Datos de sesión (tokens + perfil del usuario)
 *
 * Requerimientos: 5.1, 5.2, 5.3
 */
async function login(email, password) {
  // Autenticar con Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    throw new AuthenticationError('Credenciales inválidas');
  }

  // Verificar que la cuenta esté activa
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !userProfile) {
    throw new AuthenticationError('Credenciales inválidas');
  }

  if (!userProfile.is_active) {
    throw new AuthorizationError(
      'La cuenta está inactiva. Contacte al administrador.'
    );
  }

  return {
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
    },
    user: userProfile,
  };
}

/**
 * Renueva el par de tokens (access + refresh) usando un refresh token válido.
 *
 * @param {string} refreshToken - Refresh token actual
 * @returns {Object} Nuevo par de tokens
 *
 * Requerimientos: 6.1, 6.2
 */
async function refreshTokenFn(refreshToken) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    throw new AuthenticationError(
      'Token de renovación inválido o expirado'
    );
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
  };
}

/**
 * Envía un email de recuperación de contraseña.
 * Siempre retorna éxito (200) sin revelar si el email existe.
 *
 * @param {string} email - Email del usuario
 * @returns {Object} Mensaje de confirmación
 *
 * Requerimientos: 7.1, 7.2
 */
async function forgotPassword(email) {
  // Siempre intentar enviar, nunca revelar si el email existe
  await supabase.auth.resetPasswordForEmail(email);

  return {
    message:
      'Si el email está registrado, recibirás un enlace de recuperación.',
  };
}

/**
 * Restablece la contraseña de un usuario usando un token de recuperación.
 *
 * @param {string} token - Token de recuperación recibido por email
 * @param {string} newPassword - Nueva contraseña (min 8 caracteres)
 * @returns {Object} Confirmación de restablecimiento
 *
 * Requerimientos: 7.3
 */
async function resetPassword(token, newPassword) {
  // Verificar token de recuperación usando la sesión
  const { data: verifyData, error: verifyError } =
    await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

  if (verifyError || !verifyData.user) {
    throw new AuthenticationError(
      'Token de recuperación inválido o expirado'
    );
  }

  // Actualizar contraseña del usuario
  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(verifyData.user.id, {
      password: newPassword,
    });

  if (updateError) {
    throw new AppError(
      'Error al restablecer la contraseña',
      500,
      'INTERNAL_ERROR'
    );
  }

  return { message: 'Contraseña restablecida exitosamente' };
}

/**
 * Registra una secretaria vinculada a un doctor.
 * - Verifica que el doctor no tenga ya 2 secretarias activas (máx. 2)
 * - Crea el usuario con rol 'Secretaria' y doctor_id vinculado
 *
 * @param {string} doctorId - ID del doctor que registra la secretaria
 * @param {Object} data - Datos de la secretaria
 * @param {string} data.email - Email de la secretaria
 * @param {string} data.password - Contraseña
 * @param {string} data.first_name - Nombre
 * @param {string} data.last_name - Apellido
 * @param {string} data.rut - RUT en formato XX.XXX.XXX-X
 * @returns {Object} Datos de la secretaria creada
 *
 * Requerimientos: 19.1, 19.2
 */
async function registerSecretary(doctorId, data) {
  const { email, password, first_name, last_name, rut } = data;

  // Verificar límite de 2 secretarias activas por doctor
  const { data: existingSecretaries, error: countError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('role', 'Secretaria')
    .eq('is_active', true);

  if (countError) {
    throw new AppError(
      'Error al verificar secretarias existentes',
      500,
      'INTERNAL_ERROR'
    );
  }

  if (existingSecretaries && existingSecretaries.length >= 2) {
    throw new AppError(
      'Se alcanzó el límite máximo de 2 secretarias por doctor',
      400,
      'SECRETARY_LIMIT'
    );
  }

  // Validar RUT
  if (!validateRut(rut)) {
    throw new AppError(
      'El RUT proporcionado no es válido',
      400,
      'INVALID_RUT'
    );
  }

  // Verificar email duplicado
  const { data: existingUsers, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (lookupError) {
    throw new AppError(
      'Error al verificar disponibilidad del email',
      500,
      'INTERNAL_ERROR'
    );
  }

  if (existingUsers && existingUsers.length > 0) {
    throw new ConflictError('El email ya está registrado en el sistema');
  }

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    if (
      authError.message &&
      authError.message.toLowerCase().includes('already')
    ) {
      throw new ConflictError('El email ya está registrado en el sistema');
    }
    throw new AppError(
      'Error al crear la cuenta de secretaria',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Insertar perfil con rol Secretaria y doctor_id vinculado
  const { data: secretaryProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      first_name,
      last_name,
      rut,
      role: 'Secretaria',
      doctor_id: doctorId,
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    // Limpiar usuario de Auth si falla la inserción del perfil
    console.error('[registerSecretary] Profile insert error:', profileError);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError(
      `Error al crear el perfil de secretaria: ${profileError.message}`,
      500,
      'INTERNAL_ERROR'
    );
  }

  return secretaryProfile;
}

module.exports = {
  register,
  login,
  refreshToken: refreshTokenFn,
  forgotPassword,
  resetPassword,
  registerSecretary,
};
