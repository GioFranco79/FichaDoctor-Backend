/**
 * Slot Calculator - Calculador de slots de disponibilidad
 *
 * Calcula los slots de tiempo disponibles para un doctor en un rango de fechas,
 * considerando la configuración de horarios, días libres y citas ya existentes.
 *
 * Duraciones válidas de slot: 15, 20 o 30 minutos.
 * Los días de trabajo usan convención JS: 0=Dom, 1=Lun, ..., 6=Sáb.
 */

const VALID_DURATIONS = [15, 20, 30];

/**
 * Valida que la duración del slot sea válida (15, 20 o 30 minutos)
 * @param {number} duration - Duración en minutos
 * @returns {boolean} true si la duración es válida
 */
function isValidDuration(duration) {
  return VALID_DURATIONS.includes(duration);
}

/**
 * Convierte un string de hora "HH:mm" a minutos desde medianoche
 * @param {string} timeStr - Hora en formato HH:mm
 * @returns {number} Minutos desde medianoche
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos desde medianoche a string "HH:mm"
 * @param {number} minutes - Minutos desde medianoche
 * @returns {string} Hora en formato HH:mm
 */
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Genera todos los slots posibles para un día dado
 * @param {string} date - Fecha (YYYY-MM-DD)
 * @param {string} startTime - Hora inicio (HH:mm)
 * @param {string} endTime - Hora fin (HH:mm)
 * @param {number} duration - Duración del slot en minutos
 * @returns {Object[]} Array de slots {date, startTime, endTime}
 */
function generateDaySlots(date, startTime, endTime, duration) {
  if (!isValidDuration(duration)) {
    return [];
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const slots = [];

  let current = startMinutes;
  while (current + duration <= endMinutes) {
    slots.push({
      date,
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + duration)
    });
    current += duration;
  }

  return slots;
}

/**
 * Verifica si dos rangos de tiempo se solapan
 * @param {number} start1 - Inicio del primer rango (minutos)
 * @param {number} end1 - Fin del primer rango (minutos)
 * @param {number} start2 - Inicio del segundo rango (minutos)
 * @param {number} end2 - Fin del segundo rango (minutos)
 * @returns {boolean} true si hay solapamiento
 */
function timesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

/**
 * Verifica si un slot específico está disponible
 * @param {Object} slot - Slot a verificar {date, startTime, endTime}
 * @param {Object[]} existingAppointments - Citas existentes [{date, start_time, end_time} or {appointment_date, start_time, end_time}]
 * @param {string[]} daysOff - Días libres (YYYY-MM-DD)
 * @returns {boolean} true si el slot está disponible
 */
function isSlotAvailable(slot, existingAppointments, daysOff) {
  // Verificar si el día es un día libre
  if (daysOff && daysOff.includes(slot.date)) {
    return false;
  }

  // Verificar solapamiento con citas existentes
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  for (const appointment of existingAppointments) {
    // Soportar ambos formatos: appointment_date o date
    const appointmentDate = appointment.appointment_date || appointment.date;
    if (appointmentDate !== slot.date) {
      continue;
    }

    const apptStart = timeToMinutes(appointment.start_time);
    const apptEnd = timeToMinutes(appointment.end_time);

    if (timesOverlap(slotStart, slotEnd, apptStart, apptEnd)) {
      return false;
    }
  }

  return true;
}

/**
 * Obtiene el día de la semana para una fecha dada (0=Dom, 1=Lun, ..., 6=Sáb)
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {number} Día de la semana (0-6)
 */
function getDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

/**
 * Genera un array de fechas entre startDate y endDate (inclusive)
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @returns {string[]} Array de fechas en formato YYYY-MM-DD
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Calcula los slots de tiempo disponibles para un doctor en un rango de fechas
 * @param {Object} config - Configuración de horarios del doctor
 * @param {string} config.startTime - Hora de inicio (HH:mm)
 * @param {string} config.endTime - Hora de fin (HH:mm)
 * @param {number} config.slotDuration - Duración en minutos (15, 20 o 30)
 * @param {number[]} config.workDays - Días de trabajo (0=Dom, 1=Lun, ..., 6=Sáb)
 * @param {string[]} daysOff - Array de fechas con día libre (YYYY-MM-DD)
 * @param {Object[]} existingAppointments - Citas ya agendadas [{date, start_time, end_time}]
 * @param {string} startDate - Fecha inicio del rango (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin del rango (YYYY-MM-DD)
 * @returns {Object[]} Array de slots disponibles {date, startTime, endTime}
 */
function calculateAvailableSlots(config, daysOff, existingAppointments, startDate, endDate) {
  if (!config || !isValidDuration(config.slotDuration)) {
    return [];
  }

  const { startTime, endTime, slotDuration, workDays } = config;
  const daysOffList = daysOff || [];
  const appointments = existingAppointments || [];
  const availableSlots = [];

  const dates = getDateRange(startDate, endDate);

  for (const date of dates) {
    // Verificar si es un día de trabajo
    const dayOfWeek = getDayOfWeek(date);
    if (!workDays || !workDays.includes(dayOfWeek)) {
      continue;
    }

    // Verificar si es un día libre
    if (daysOffList.includes(date)) {
      continue;
    }

    // Generar todos los slots posibles para este día
    const daySlots = generateDaySlots(date, startTime, endTime, slotDuration);

    // Filtrar slots que no se solapan con citas existentes
    for (const slot of daySlots) {
      if (isSlotAvailable(slot, appointments, daysOffList)) {
        availableSlots.push(slot);
      }
    }
  }

  return availableSlots;
}

module.exports = {
  calculateAvailableSlots,
  generateDaySlots,
  isSlotAvailable,
  isValidDuration,
  timeToMinutes,
  minutesToTime,
  VALID_DURATIONS
};
