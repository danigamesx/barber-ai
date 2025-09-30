import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../App';
import { Appointment, OpeningHours, BlockedTimeSlot, Service, DayOpeningHours } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface EditAppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({ appointment, onClose }) => {
  const { barbershopData, allAppointments, updateAppointment } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(appointment.start_time));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const service = useMemo(() => {
    const services = Array.isArray(barbershopData?.services) ? barbershopData.services as Service[] : [];
    return services.find(s => s.id === appointment.service_id);
  }, [barbershopData, appointment]);

  const availableTimeSlots = useMemo(() => {
    if (!service || !barbershopData) return [];

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
    const dateString = localDate.toISOString().split('T')[0];
    if (barbershopData.blocked_dates?.includes(dateString)) return [];
    
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()];
    const hours = (barbershopData.opening_hours as OpeningHours || {})[dayOfWeek] as DayOpeningHours | null;
    
    if (!hours) return [];

    const potentialSlots: Date[] = [];
    const duration = service.duration;

    const generateSlotsForPeriod = (open: string, close: string) => {
        let currentTime = new Date(`${selectedDate.toDateString()} ${open}`);
        const closeTime = new Date(`${selectedDate.toDateString()} ${close}`);
        while (currentTime < closeTime) {
            potentialSlots.push(new Date(currentTime));
            currentTime.setMinutes(currentTime.getMinutes() + 15);
        }
    };
    
    generateSlotsForPeriod(hours.morning_open, hours.morning_close);
    generateSlotsForPeriod(hours.afternoon_open, hours.afternoon_close);
    
    const otherAppointments = allAppointments.filter(app => 
        app.id !== appointment.id &&
        app.barber_id === appointment.barber_id &&
        (app.status === 'confirmed' || app.status === 'paid') &&
        new Date(app.start_time).toDateString() === selectedDate.toDateString()
    );

    const validTimeBlocksOnDay = (Array.isArray(barbershopData.blocked_time_slots) ? barbershopData.blocked_time_slots as BlockedTimeSlot[] : [])
        .map(block => ({ start: new Date(block.start), end: new Date(block.end) }))
        .filter(block => block.start.toDateString() === selectedDate.toDateString());

    const availableSlots = potentialSlots.filter(slotStartTime => {
        if (isToday && slotStartTime < now) return false;

        const slotEndTime = new Date(slotStartTime.getTime() + duration * 60000);

        const morningClose = new Date(`${selectedDate.toDateString()} ${hours.morning_close}`);
        const afternoonOpen = new Date(`${selectedDate.toDateString()} ${hours.afternoon_open}`);
        const afternoonClose = new Date(`${selectedDate.toDateString()} ${hours.afternoon_close}`);

        const isInMorning = slotStartTime < morningClose && slotEndTime <= morningClose;
        const isInAfternoon = slotStartTime >= afternoonOpen && slotEndTime <= afternoonClose;

        if (!isInMorning && !isInAfternoon) return false;

        const isOverlappingAppointment = otherAppointments.some(app => 
            (slotStartTime < app.end_time) && (slotEndTime > app.start_time)
        );
        if (isOverlappingAppointment) return false;

        const isOverlappingBlock = validTimeBlocksOnDay.some(block => 
            (slotStartTime < block.end) && (slotEndTime > block.start)
        );
        if (isOverlappingBlock) return false;

        return true;
    });

    return availableSlots.map(time => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [selectedDate, service, barbershopData, allAppointments, appointment.id, appointment.barber_id]);

  const handleSave = async () => {
    if (!selectedTime || !service) {
      alert("Por favor, selecione um novo horário.");
      return;
    }
    setIsLoading(true);

    const [hours, minutes] = selectedTime.split(':');
    const newStartTime = new Date(selectedDate);
    newStartTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const newEndTime = new Date(newStartTime.getTime() + service.duration * 60000);

    try {
      await updateAppointment(appointment.id, { start_time: newStartTime, end_time: newEndTime });
      onClose();
    } catch (error) {
      console.error("Failed to update appointment:", error);
      alert("Ocorreu um erro ao atualizar o agendamento.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Editar Agendamento</h2>
        <p className="text-center text-gray-400 mb-6">{appointment.client_name} - {appointment.service_name}</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Nova Data</label>
            <input
              type="date"
              className="w-full p-2 bg-brand-secondary border border-gray-600 rounded-lg"
              value={new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
              min={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(new Date(e.target.value + 'T00:00:00'));
                setSelectedTime(null);
              }}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Novos Horários Disponíveis</label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableTimeSlots.length > 0 ? (
                availableTimeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-2 rounded-lg text-sm ${selectedTime === time ? 'bg-brand-primary text-brand-dark' : 'bg-brand-secondary'}`}
                  >
                    {time}
                  </button>
                ))
              ) : (
                <div className="col-span-3 text-center text-gray-400 py-4">
                  <p>Nenhum horário disponível para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading || !selectedTime}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditAppointmentModal;