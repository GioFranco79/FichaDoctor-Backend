const supabaseAdmin = require('../supabaseAdmin');
const { isSlotAvailable } = require('../utils/slotCalculator');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, AuthorizationError, ConflictError, AppError } = require('../errors');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

/**
 * Verifica que una Secretaria está asignada al doctor especificado.
 * @param {string} secretariaId - ID de la secretaria
 * @param {string} doctorId - ID del doctor
 * @throws {AuthorizationError} Si la Secretaria no está asignada al doctor
 */
async function verifySecretaryAssignment(secretariaId, doctorId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('doctor_id')
    .eq('id', secretariaId)
    .single();

  if (error || !data) {
    throw new AuthorizationError('No se pudo verificar la asignación de la secretaria');
  }

  if (data.doctor_id !== doctorId) {
    throw new AuthorizationError('La secretaria no está asignada a este doctor');
  }
}

/**
 * Obtiene la configuración de agenda del doctor y verifica disponibilidad del slot.
 * @param {string} doctorId - ID del doctor
 * @param {string} appointmentDate - Fecha de la cita (YYYY-MM-DD)
 * @param {string} startTime - Hora de inicio (HH:mm)
 * @param {string|null} excludeAppointmentId - ID de cita a excluir de la verificación (para updates)
 * @throws {AppError} Si el horario no está dentro de la disponibilidad del doctor
 * @throws {ConflictError} Si el horario ya está ocupado por otra cita
 */
async function verifySlotAvailability(doctorId, appointmentDate, startTime, excludeAppointmentId = null) {
  // Obtener configuración de agenda del doctor
  const { data: config, error: configError } = await supabaseAdmin
    .from('schedule_config')
    .select('*')
    .eq('doctor_id', doctorId)
    .single();

  if (configError || !config) {
    throw new AppError('El doctor aún no ha configurado su horario de atención. Intenta más tarde.', 400, 'NO_SCHEDULE_CONFIG');
  }

  // Calcular end_time basado en la duración del slot
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + config.slot_duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

  // Verificar que el día de la cita es un día de trabajo
  const [year, month, day] = appointmentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();

  if (!config.work_days || !config.work_days.includes(dayOfWeek)) {
    throw new AppError('El horario solicitado no está dentro de la disponibilidad del doctor', 400, 'SLOT_NOT_AVAILABLE');
  }

  // Verificar que el slot está dentro del rango horario del doctor
  const configStartMinutes = timeToMinutes(config.start_time);
  const configEndMinutes = timeToMinutes(config.end_time);

  if (startMinutes < configStartMinutes || endMinutes > configEndMinutes) {
    throw new AppError('El horario solicitado no está dentro de la disponibilidad del doctor', 400, 'SLOT_NOT_AVAILABLE');
  }

  // Obtener días libres para esta fecha
  const { data: daysOff } = await supabaseAdmin
    .from('days_off')
    .select('date')
    .eq('doctor_id', doctorId)
    .eq('date', appointmentDate);

  const daysOffList = (daysOff || []).map((d) => d.date);

  // Obtener citas existentes para esta fecha (pendientes o confirmadas)
  let appointmentsQuery = supabaseAdmin
    .from('appointments')
    .select('id, appointment_date, start_time, end_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', appointmentDate)
    .in('status', ['pendiente', 'confirmada']);

  if (excludeAppointmentId) {
    appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
  }

  const { data: existingAppointments } = await appointmentsQuery;

  // Verificar disponibilidad con isSlotAvailable
  const slot = { date: appointmentDate, startTime, endTime: endTime };
  const available = isSlotAvailable(slot, existingAppointments || [], daysOffList);

  if (!available) {
    // Determinar si es por día libre o por conflicto con otra cita
    if (daysOffList.includes(appointmentDate)) {
      throw new AppError('El horario solicitado no está dentro de la disponibilidad del doctor', 400, 'SLOT_NOT_AVAILABLE');
    }
    throw new ConflictError('El horario solicitado ya está ocupado por otra cita');
  }

  return { endTime, slotDuration: config.slot_duration };
}

/**
 * Helper para convertir HH:mm a minutos desde medianoche
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Crea una nueva cita médica.
 * Solo Paciente o Secretaria pueden crear citas.
 * Verifica disponibilidad del horario y asignación de secretaria.
 *
 * @param {Object} user - Usuario autenticado {id, role}
 * @param {Object} data - Datos de la cita {doctor_id, appointment_date, start_time, notes}
 * @returns {Object} Cita creada
 * @throws {AuthorizationError} Si la secretaria no está asignada al doctor
 * @throws {AppError} Si el horario no está disponible
 * @throws {ConflictError} Si hay conflicto de horario
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
async function create(user, data) {
  const { doctor_id, appointment_date, start_time, notes } = data;

  // Si es Secretaria, verificar que está asignada al doctor
  if (user.role === 'Secretaria') {
    await verifySecretaryAssignment(user.id, doctor_id);
  }

  // Verificar disponibilidad del slot
  const { endTime } = await verifySlotAvailability(doctor_id, appointment_date, start_time);

  // Determinar patient_id: si es Paciente, es el mismo usuario; si es Secretaria, necesita patient_id del body
  let patient_id;
  if (user.role === 'Paciente') {
    patient_id = user.id;
  } else if (user.role === 'Secretaria') {
    patient_id = data.patient_id || user.id;
  } else {
    patient_id = data.patient_id || user.id;
  }

  // Crear la cita con estado 'pendiente'
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      doctor_id,
      patient_id,
      created_by: user.id,
      appointment_date,
      start_time,
      end_time: endTime,
      status: 'pendiente',
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear la cita: ${error.message}`);
  }

  // Notificar al doctor y al paciente (no-crítico, no interrumpe el flujo principal)
  try {
    await notificationService.notifyAppointmentCreated(appointment);
  } catch (notifError) {
    logger.logError(notifError, 'warn');
  }

  return appointment;
}

/**
 * Actualiza una cita existente.
 * Verifica que la cita no esté completada, que el usuario sea dueño o secretaria asignada,
 * y que el nuevo horario esté disponible.
 *
 * @param {string} appointmentId - ID de la cita
 * @param {Object} user - Usuario autenticado {id, role}
 * @param {Object} data - Datos a actualizar {appointment_date, start_time, notes}
 * @returns {Object} Cita actualizada
 * @throws {NotFoundError} Si la cita no existe
 * @throws {AppError} Si la cita está completada
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 * @throws {ConflictError} Si hay conflicto de horario
 *
 * Validates: Requirements 11.1, 11.3, 11.4
 */
async function update(appointmentId, user, data) {
  // Obtener la cita existente
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError('Cita');
  }

  // Rechazar modificación de citas completadas
  if (existing.status === 'completada') {
    throw new AppError('No se puede modificar una cita completada', 400, 'APPOINTMENT_COMPLETED');
  }

  // Verificar permisos: el paciente dueño o secretaria asignada al doctor
  await verifyAppointmentAccess(user, existing);

  // Preparar campos a actualizar
  const updateFields = {};
  const appointmentDate = data.appointment_date || existing.appointment_date;
  const startTime = data.start_time || existing.start_time;

  // Si se cambia fecha u hora, verificar disponibilidad del nuevo slot
  if (data.appointment_date || data.start_time) {
    const { endTime } = await verifySlotAvailability(
      existing.doctor_id,
      appointmentDate,
      startTime,
      appointmentId
    );
    updateFields.appointment_date = appointmentDate;
    updateFields.start_time = startTime;
    updateFields.end_time = endTime;
  }

  if (data.notes !== undefined) {
    updateFields.notes = data.notes;
  }

  updateFields.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('appointments')
    .update(updateFields)
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error al actualizar la cita: ${updateError.message}`);
  }

  return updated;
}

/**
 * Cancela una cita existente (cambia estado a 'cancelada').
 * Verifica que el usuario sea dueño de la cita o secretaria asignada al doctor.
 *
 * @param {string} appointmentId - ID de la cita
 * @param {Object} user - Usuario autenticado {id, role}
 * @returns {Object} Cita cancelada
 * @throws {NotFoundError} Si la cita no existe
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 *
 * Validates: Requirements 11.2, 11.3
 */
async function cancel(appointmentId, user) {
  // Obtener la cita existente
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError('Cita');
  }

  // Verificar permisos
  await verifyAppointmentAccess(user, existing);

  // Cambiar estado a cancelada
  const { data: cancelled, error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelada', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error al cancelar la cita: ${updateError.message}`);
  }

  // Notificar a las partes afectadas (no-crítico, no interrumpe el flujo principal)
  try {
    await notificationService.notifyAppointmentCancelled(cancelled);
  } catch (notifError) {
    logger.logError(notifError, 'warn');
  }

  return cancelled;
}

/**
 * Lista citas con filtros según el rol del usuario.
 * - Doctor: ve sus propias citas
 * - Paciente: ve sus propias citas
 * - Secretaria: ve las citas del doctor asignado
 *
 * Soporta filtros por fecha, estado y paginación.
 *
 * @param {Object} user - Usuario autenticado {id, role}
 * @param {Object} filters - Filtros opcionales {date, status, doctor_id, patient_id, page, limit}
 * @returns {Object} Resultado paginado {data, pagination}
 * @throws {AuthorizationError} Si la secretaria no tiene doctor asignado
 *
 * Validates: Requirements 12.1, 12.2, 12.4
 */
async function list(user, filters = {}) {
  const { from, to, page, limit } = paginate(filters.page, filters.limit);

  let query = supabaseAdmin
    .from('appointments')
    .select('*, doctor:doctor_id(id, first_name, last_name, especialidad, direccion, comuna, region), patient:patient_id(id, first_name, last_name, email, rut)', { count: 'exact' });

  // Filtrar por rol del usuario
  if (user.role === 'Doctor') {
    query = query.eq('doctor_id', user.id);
  } else if (user.role === 'Paciente') {
    query = query.eq('patient_id', user.id);
  } else if (user.role === 'Secretaria') {
    // Obtener el doctor asignado a la secretaria
    const { data: secretariaData, error: secError } = await supabaseAdmin
      .from('users')
      .select('doctor_id')
      .eq('id', user.id)
      .single();

    if (secError || !secretariaData || !secretariaData.doctor_id) {
      throw new AuthorizationError('La secretaria no tiene un doctor asignado');
    }

    query = query.eq('doctor_id', secretariaData.doctor_id);
  }

  // Aplicar filtros opcionales
  if (filters.date) {
    query = query.eq('appointment_date', filters.date);
  }

  if (filters.startDate) {
    query = query.gte('appointment_date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('appointment_date', filters.endDate);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.doctor_id && user.role !== 'Doctor') {
    query = query.eq('doctor_id', filters.doctor_id);
  }

  if (filters.patient_id && user.role !== 'Paciente') {
    query = query.eq('patient_id', filters.patient_id);
  }

  // Ordenar por fecha y hora
  query = query.order('appointment_date', { ascending: true })
    .order('start_time', { ascending: true });

  // Aplicar paginación
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Error al listar citas: ${error.message}`);
  }

  return {
    data: data || [],
    pagination: buildPaginationMeta(count || 0, page, limit),
  };
}

/**
 * Cambia el estado de una cita. Solo el Doctor puede cambiar estados.
 * Verifica que la cita pertenece al doctor solicitante.
 *
 * @param {string} appointmentId - ID de la cita
 * @param {Object} user - Usuario autenticado {id, role}
 * @param {string} newStatus - Nuevo estado (pendiente, confirmada, completada, cancelada)
 * @returns {Object} Cita actualizada
 * @throws {NotFoundError} Si la cita no existe
 * @throws {AuthorizationError} Si el usuario no es Doctor o la cita no le pertenece
 *
 * Validates: Requirements 12.3
 */
async function changeStatus(appointmentId, user, newStatus) {
  // Solo Doctor puede cambiar el estado
  if (user.role !== 'Doctor') {
    throw new AuthorizationError('Solo el doctor puede cambiar el estado de la cita');
  }

  // Obtener la cita
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (fetchError || !existing) {
    throw new NotFoundError('Cita');
  }

  // Verificar que la cita pertenece al doctor
  if (existing.doctor_id !== user.id) {
    throw new AuthorizationError('No autorizado para cambiar el estado de esta cita');
  }

  // Actualizar estado
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('appointments')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Error al cambiar el estado de la cita: ${updateError.message}`);
  }

  return updated;
}

/**
 * Verifica que el usuario tiene acceso a la cita.
 * - Paciente: debe ser el patient_id de la cita
 * - Secretaria: debe estar asignada al doctor de la cita
 * - Doctor: debe ser el doctor_id de la cita
 *
 * @param {Object} user - Usuario autenticado {id, role}
 * @param {Object} appointment - Cita a verificar
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 */
async function verifyAppointmentAccess(user, appointment) {
  if (user.role === 'Paciente') {
    if (appointment.patient_id !== user.id) {
      throw new AuthorizationError('No autorizado para modificar esta cita');
    }
    return;
  }

  if (user.role === 'Doctor') {
    if (appointment.doctor_id !== user.id) {
      throw new AuthorizationError('No autorizado para modificar esta cita');
    }
    return;
  }

  if (user.role === 'Secretaria') {
    await verifySecretaryAssignment(user.id, appointment.doctor_id);
    return;
  }

  throw new AuthorizationError('No autorizado para modificar esta cita');
}

module.exports = {
  create,
  update,
  cancel,
  list,
  changeStatus,
};
