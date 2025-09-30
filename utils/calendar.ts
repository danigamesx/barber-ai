import { Appointment, Barbershop, Address } from '../types';

/**
 * Formats a Date object into a string suitable for Google Calendar URLs (YYYYMMDDTHHmmssZ).
 * @param date The date to format.
 * @returns The formatted UTC date string.
 */
const formatGoogleCalendarDate = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '');
};

/**
 * Generates a URL for adding an appointment to Google Calendar.
 * @param appointment The appointment details.
 * @param barbershop The barbershop details.
 * @returns A fully formed URL string.
 */
export const generateGoogleCalendarLink = (appointment: Appointment, barbershop: Barbershop): string => {
  const title = encodeURIComponent(`${appointment.service_name} na ${barbershop.name}`);
  
  const startTime = formatGoogleCalendarDate(appointment.start_time);
  const endTime = formatGoogleCalendarDate(appointment.end_time);
  const dates = `${startTime}/${endTime}`;

  const address = barbershop.address as Address;
  const location = address 
    ? encodeURIComponent(`${address.street}, ${address.number} - ${address.city}, ${address.state}`)
    : encodeURIComponent(barbershop.name);
  
  const details = encodeURIComponent(
    `Seu agendamento para ${appointment.service_name} com ${appointment.barber_name}.\n\n` +
    `Local: ${barbershop.name}\nEndereço: ${location}\n\n` +
    `Observações: ${appointment.notes || 'Nenhuma'}`
  );

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};
