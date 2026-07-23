const supabaseAdmin = require('../supabaseAdmin');

/**
 * Registra una acción en el log de auditoría.
 * @param {string} userId - ID del usuario que realiza la acción
 * @param {string} action - Tipo de acción ('READ', 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} resourceType - Tipo de recurso (e.g., 'medical_record', 'prescription')
 * @param {string|null} resourceId - ID del recurso afectado (UUID, nullable)
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @param {object|null} details - Detalles adicionales en formato JSON (nullable)
 * @returns {Promise<object>} Registro de auditoría creado
 */
async function log(userId, action, resourceType, resourceId, ipAddress, details = null) {
  const record = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    ip_address: ipAddress || null,
    details: details || null,
  };

  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .insert(record)
    .select()
    .single();

  if (error) {
    // Log the error but don't throw - audit failures shouldn't break the main flow
    console.error('[AuditService] Error registrando auditoría:', error.message);
    return null;
  }

  return data;
}

/**
 * Registra un acceso a datos clínicos en el log de auditoría.
 * Wrapper específico para accesos a datos clínicos que cumple con la Ley 19.628 y Ley 20.584.
 * @param {string} userId - ID del usuario que accede a los datos
 * @param {string} action - Tipo de operación ('READ', 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} resourceType - Tipo de recurso clínico ('medical_record', 'prescription')
 * @param {string|null} resourceId - ID del recurso clínico
 * @param {string|null} ipAddress - Dirección IP del cliente
 * @returns {Promise<object>} Registro de auditoría creado
 */
async function logClinicalAccess(userId, action, resourceType, resourceId, ipAddress) {
  return log(userId, action, resourceType, resourceId, ipAddress, {
    clinical_access: true,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  log,
  logClinicalAccess,
};
