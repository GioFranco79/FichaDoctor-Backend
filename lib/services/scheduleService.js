const supabaseAdmin = require('../supabaseAdmin');
const { calculateAvailableSlots } = require('../utils/slotCalculator');
const { NotFoundError, AuthorizationError } = require('../errors');

/**
 * Verifica que un usuario con rol Secretaria está asignado al doctor especificado.
 * Si el usuario es Doctor, verifica que sea el mismo doctor.
 * @param {Object} user - Usuario autenticado (req.user)
 * @param {string} doctorId - ID del doctor objetivo
 * @throws {AuthorizationError} Si la Secretaria no está asignada al doctor
 */
async function verifyDoctorAccess(user, doctorId) {
  if (user.role === 'Doctor') {
    if (user.id !== doctorId) {
      throw new AuthorizationError('No autorizado para gestionar la agenda de otro doctor');
    }
    return;
  }

  if (user.role === 'Secretaria') {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('doctor_id')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      throw new AuthorizationError('No se pudo verificar la asignación de la secretaria');
    }

    if (data.doctor_id !== doctorId) {
      throw new AuthorizationError('La secretaria no está asignada a este doctor');
    }
    return;
  }

  throw new AuthorizationError('No autorizado para gestionar agendas');
}

/**
 * Crea la configuración de disponibilidad de un doctor.
 * @param {string} doctorId - ID del doctor
 * @param {Object} configData - Datos de configuración {workDays, startTime, endTime, slotDuration}
 * @param {Object} user - Usuario autenticado que realiza la operación
 * @returns {Object} Configuración creada
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 * @throws {NotFoundError} Si hay error al crear la configuración
 *
 * Validates: Requirements 18.1, 18.5
 */
async function createConfig(doctorId, configData, user) {
  await verifyDoctorAccess(user, doctorId);

  const { workDays, startTime, endTime, slotDuration } = configData;

  // Check if config already exists for this doctor
  const { data: existing } = await supabaseAdmin
    .from('schedule_config')
    .select('id')
    .eq('doctor_id', doctorId)
    .single();

  let data, error;

  if (existing) {
    // Update existing config
    ({ data, error } = await supabaseAdmin
      .from('schedule_config')
      .update({
        work_days: workDays,
        start_time: startTime,
        end_time: endTime,
        slot_duration: slotDuration,
        updated_at: new Date().toISOString(),
      })
      .eq('doctor_id', doctorId)
      .select()
      .single());
  } else {
    // Insert new config
    ({ data, error } = await supabaseAdmin
      .from('schedule_config')
      .insert({
        doctor_id: doctorId,
        work_days: workDays,
        start_time: startTime,
        end_time: endTime,
        slot_duration: slotDuration,
      })
      .select()
      .single());
  }

  if (error) {
    throw new Error(`Error al guardar configuración de agenda: ${error.message}`);
  }

  return data;
}

/**
 * Actualiza la configuración de disponibilidad de un doctor.
 * @param {string} configId - ID de la configuración a actualizar
 * @param {Object} configData - Datos actualizados {workDays, startTime, endTime, slotDuration}
 * @param {Object} user - Usuario autenticado que realiza la operación
 * @returns {Object} Configuración actualizada
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 * @throws {NotFoundError} Si la configuración no existe
 *
 * Validates: Requirements 18.2
 */
async function updateConfig(configId, configData, user) {
  // Obtener la configuración existente para verificar ownership
  const { data: existingConfig, error: fetchError } = await supabaseAdmin
    .from('schedule_config')
    .select('doctor_id')
    .eq('id', configId)
    .single();

  if (fetchError || !existingConfig) {
    throw new NotFoundError('Configuración de agenda');
  }

  await verifyDoctorAccess(user, existingConfig.doctor_id);

  const updateFields = {};
  if (configData.workDays !== undefined) updateFields.work_days = configData.workDays;
  if (configData.startTime !== undefined) updateFields.start_time = configData.startTime;
  if (configData.endTime !== undefined) updateFields.end_time = configData.endTime;
  if (configData.slotDuration !== undefined) updateFields.slot_duration = configData.slotDuration;
  updateFields.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('schedule_config')
    .update(updateFields)
    .eq('id', configId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar configuración de agenda: ${error.message}`);
  }

  return data;
}

/**
 * Registra un día libre para un doctor.
 * @param {string} doctorId - ID del doctor
 * @param {string} date - Fecha del día libre (YYYY-MM-DD)
 * @param {string} reason - Motivo del día libre (opcional)
 * @param {Object} user - Usuario autenticado que realiza la operación
 * @returns {Object} Registro del día libre creado
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 *
 * Validates: Requirements 18.3
 */
async function addDayOff(doctorId, date, reason, user) {
  await verifyDoctorAccess(user, doctorId);

  const { data, error } = await supabaseAdmin
    .from('days_off')
    .insert({
      doctor_id: doctorId,
      date,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al registrar día libre: ${error.message}`);
  }

  return data;
}

/**
 * Calcula y retorna los slots de tiempo disponibles para un doctor en un rango de fechas.
 * Considera la configuración de horarios, días libres y citas ya agendadas.
 * @param {string} doctorId - ID del doctor
 * @param {string} startDate - Fecha de inicio del rango (YYYY-MM-DD)
 * @param {string} endDate - Fecha de fin del rango (YYYY-MM-DD)
 * @returns {Object[]} Array de slots disponibles {date, startTime, endTime}
 * @throws {NotFoundError} Si el doctor no tiene configuración de agenda
 *
 * Validates: Requirements 18.4
 */
async function getAvailability(doctorId, startDate, endDate) {
  // Obtener configuración de agenda del doctor
  const { data: config, error: configError } = await supabaseAdmin
    .from('schedule_config')
    .select('*')
    .eq('doctor_id', doctorId)
    .single();

  if (configError || !config) {
    throw new NotFoundError('Configuración de agenda del doctor');
  }

  // Obtener días libres en el rango
  const { data: daysOff, error: daysOffError } = await supabaseAdmin
    .from('days_off')
    .select('date')
    .eq('doctor_id', doctorId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (daysOffError) {
    throw new Error(`Error al obtener días libres: ${daysOffError.message}`);
  }

  // Obtener citas existentes en el rango (solo no canceladas)
  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from('appointments')
    .select('appointment_date, start_time, end_time')
    .eq('doctor_id', doctorId)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .neq('status', 'cancelada');

  if (appointmentsError) {
    throw new Error(`Error al obtener citas existentes: ${appointmentsError.message}`);
  }

  // Preparar datos para el calculador de slots
  const slotConfig = {
    startTime: config.start_time,
    endTime: config.end_time,
    slotDuration: config.slot_duration,
    workDays: config.work_days,
  };

  const daysOffList = (daysOff || []).map((d) => d.date);
  const existingAppointments = appointments || [];

  // Calcular slots disponibles
  const availableSlots = calculateAvailableSlots(
    slotConfig,
    daysOffList,
    existingAppointments,
    startDate,
    endDate
  );

  return availableSlots;
}

/**
 * Genera la vista semanal de la agenda de un doctor con el estado de cada celda.
 * 
 * Estados de celda:
 * - "verde" (available): Slot disponible, puede ser habilitado para citas
 * - "rojo" (booked): Slot con cita agendada por un paciente
 * - "gris" (unavailable): Slot no disponible (día libre, fuera de horario, o no habilitado)
 *
 * @param {string} doctorId - ID del doctor
 * @param {string} startDate - Fecha de inicio de la semana (YYYY-MM-DD, debe ser lunes)
 * @param {Object} user - Usuario autenticado
 * @returns {Object} Vista semanal con grilla de celdas
 * @throws {AuthorizationError} Si el usuario no tiene permisos
 * @throws {NotFoundError} Si el doctor no tiene configuración de agenda
 */
async function getWeeklyView(doctorId, startDate, user) {
  await verifyDoctorAccess(user, doctorId);

  // Obtener configuración de agenda del doctor
  const { data: config, error: configError } = await supabaseAdmin
    .from('schedule_config')
    .select('*')
    .eq('doctor_id', doctorId)
    .single();

  if (configError || !config) {
    throw new NotFoundError('Configuración de agenda del doctor');
  }

  // Calcular endDate (7 días desde startDate)
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  // Obtener días libres en el rango
  const { data: daysOff } = await supabaseAdmin
    .from('days_off')
    .select('date')
    .eq('doctor_id', doctorId)
    .gte('date', startDate)
    .lte('date', endDate);

  const daysOffList = (daysOff || []).map((d) => d.date);

  // Obtener citas existentes en el rango (no canceladas)
  const { data: appointments } = await supabaseAdmin
    .from('appointments')
    .select('id, appointment_date, start_time, end_time, status, paciente_id')
    .eq('doctor_id', doctorId)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate)
    .neq('status', 'cancelada');

  const existingAppointments = appointments || [];

  // Obtener nombres de pacientes para las citas agendadas
  const pacienteIds = [...new Set(existingAppointments.map(a => a.paciente_id).filter(Boolean))];
  let pacientesMap = {};
  if (pacienteIds.length > 0) {
    const { data: pacientes } = await supabaseAdmin
      .from('users')
      .select('id, nombre, apellido')
      .in('id', pacienteIds);
    
    if (pacientes) {
      pacientesMap = pacientes.reduce((map, p) => {
        map[p.id] = `${p.nombre} ${p.apellido}`;
        return map;
      }, {});
    }
  }

  // Generar la grilla semanal
  const { generateDaySlots, timeToMinutes, minutesToTime } = require('../utils/slotCalculator');
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const dayOfWeek = currentDate.getDay();

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const isWorkDay = config.work_days && config.work_days.includes(dayOfWeek);
    const isDayOff = daysOffList.includes(dateStr);

    const dayData = {
      date: dateStr,
      dayName: dayNames[dayOfWeek],
      dayOfWeek,
      isWorkDay,
      isDayOff,
      slots: []
    };

    // Generar todos los slots del día
    const allSlots = generateDaySlots(dateStr, config.start_time, config.end_time, config.slot_duration);

    for (const slot of allSlots) {
      const slotStartMinutes = timeToMinutes(slot.startTime);
      const slotEndMinutes = timeToMinutes(slot.endTime);

      // Determinar estado de la celda
      let status = 'verde'; // disponible por defecto
      let appointment = null;

      if (!isWorkDay || isDayOff) {
        // No es día de trabajo o es día libre → gris
        status = 'gris';
      } else {
        // Verificar si hay una cita agendada en este slot
        const matchingAppointment = existingAppointments.find(appt => {
          if (appt.appointment_date !== dateStr) return false;
          const apptStart = timeToMinutes(appt.start_time);
          const apptEnd = timeToMinutes(appt.end_time);
          // Verificar solapamiento
          return slotStartMinutes < apptEnd && apptStart < slotEndMinutes;
        });

        if (matchingAppointment) {
          status = 'rojo'; // cita agendada
          appointment = {
            id: matchingAppointment.id,
            paciente: pacientesMap[matchingAppointment.paciente_id] || 'Paciente',
            paciente_id: matchingAppointment.paciente_id,
            status: matchingAppointment.status
          };
        }
      }

      dayData.slots.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        status, // 'verde' | 'rojo' | 'gris'
        appointment
      });
    }

    weekDays.push(dayData);
  }

  return {
    doctorId,
    startDate,
    endDate,
    config: {
      startTime: config.start_time,
      endTime: config.end_time,
      slotDuration: config.slot_duration,
      workDays: config.work_days
    },
    weekDays
  };
}

module.exports = {
  createConfig,
  updateConfig,
  addDayOff,
  getAvailability,
  getWeeklyView,
  verifyDoctorAccess,
};
