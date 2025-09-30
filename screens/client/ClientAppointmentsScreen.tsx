
import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../App';
import { Appointment, WaitingListEntry, CancellationPolicy, Barbershop } from '../../types';
import Button from '../../components/Button';
import ReviewModal from './ReviewModal';
import BookingModal from './BookingModal';
import PaymentModal from './PaymentModal';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import { CalendarIcon } from '../../components/icons/OutlineIcons';

const statusTranslations: { [key in Appointment['status']]: string } = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  declined: 'Recusado',
  paid: 'Pago',
};

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

const AppointmentCard: React.FC<{ 
  appointment: Appointment;
  barbershop: Barbershop | undefined;
  onReview: () => void;
  onRebook: () => void;
  onCancel: () => void;
}> = ({ appointment, barbershop, onReview, onRebook, onCancel }) => {
  const { service_name, start_time, barber_name, status, review_id } = appointment;
  
  const statusClasses: { [key in Appointment['status']]: string } = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    confirmed: 'bg-green-500/20 text-green-400',
    completed: 'bg-blue-500/20 text-blue-400',
    cancelled: 'bg-red-500/20 text-red-400',
    declined: 'bg-red-500/20 text-red-400',
    paid: 'bg-indigo-500/20 text-indigo-400',
  };

  const isPast = ['completed', 'cancelled', 'declined'].includes(status);
  const isUpcoming = ['pending', 'confirmed', 'paid'].includes(status);

  const handleAddToCalendar = () => {
    if (barbershop) {
      const url = generateGoogleCalendarLink(appointment, barbershop);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="bg-brand-secondary p-4 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-lg text-brand-light">{service_name}</p>
          <p className="text-sm text-gray-400">com {barber_name} em {barbershop?.name || 'Barbearia'}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusClasses[status]}`}>
          {statusTranslations[status]}
        </span>
      </div>
      <div className="border-t border-gray-700 my-3"></div>
      <p className="text-sm text-brand-light">{start_time.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>

      {isUpcoming && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" className="py-2 text-sm flex items-center justify-center gap-2" onClick={handleAddToCalendar}>
                  <CalendarIcon className="w-5 h-5" />
                  Adicionar à Agenda
              </Button>
              <Button variant="danger" className="py-2 text-sm" onClick={onCancel}>Cancelar</Button>
          </div>
      )}

      {isPast && (
          <div className="mt-4 flex gap-2">
              {status === 'completed' && !review_id && <Button variant="secondary" className="py-2 text-sm" onClick={onReview}>Deixar Avaliação</Button>}
              <Button variant="secondary" className="py-2 text-sm" onClick={onRebook}>Agendar Novamente</Button>
          </div>
      )}
    </div>
  );
};

const ClientAppointmentsScreen: React.FC = () => {
  const { user, appointments, barbershops, updateAppointmentStatus, removeFromWaitingList } = useContext(AppContext);
  const [reviewingAppointment, setReviewingAppointment] = useState<Appointment | null>(null);
  const [rebookingAppointment, setRebookingAppointment] = useState<Appointment | null>(null);
  const [appointmentToPay, setAppointmentToPay] = useState<NewAppointmentData | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [showRebookPromptFor, setShowRebookPromptFor] = useState<Appointment | null>(null);

  const handleConfirmCancel = () => {
    if (!cancellingAppointment) return;
    updateAppointmentStatus(cancellingAppointment, 'cancelled');
    setShowRebookPromptFor(cancellingAppointment);
    setCancellingAppointment(null);
  };
  
  const handleStartRebooking = () => {
    if (!showRebookPromptFor) return;
    setRebookingAppointment(showRebookPromptFor);
    setShowRebookPromptFor(null);
  };
  
  const clientAppointments = useMemo(() => {
    return appointments
      .filter(a => a.client_id === user?.id)
      .sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
  }, [appointments, user]);

  const upcomingAppointments = clientAppointments.filter(a => ['pending', 'confirmed', 'paid'].includes(a.status));
  const pastAppointments = clientAppointments.filter(a => !['pending', 'confirmed', 'paid'].includes(a.status));

  const rebookingBarbershop = barbershops.find(b => b.id === rebookingAppointment?.barbershop_id) || null;

  const cancellationInfo = useMemo(() => {
    if (!cancellingAppointment) return null;
    const barbershop = barbershops.find(b => b.id === cancellingAppointment.barbershop_id);
    const policy = barbershop?.cancellation_policy as CancellationPolicy | undefined;
    if (!policy?.enabled) {
        return { showWarning: false, message: 'Tem certeza que deseja cancelar este agendamento?' };
    }

    const { feePercentage, timeLimitHours } = policy;
    const hoursUntilAppointment = (new Date(cancellingAppointment.start_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < timeLimitHours) {
        const feeAmount = ((cancellingAppointment.price || 0) * feePercentage) / 100;
        return {
            showWarning: true,
            message: `Atenção! Cancelar com menos de ${timeLimitHours} hora(s) de antecedência pode gerar uma taxa de ${feePercentage}% (R$${feeAmount.toFixed(2)}).`,
            fullMessage: `Deseja continuar com o cancelamento?`
        };
    }

    return { showWarning: false, message: 'Tem certeza que deseja cancelar este agendamento?' };
  }, [cancellingAppointment, barbershops]);

  const waitingLists = useMemo(() => {
      if(!user) return [];
      return barbershops.flatMap(shop => {
          const wl = shop.waiting_list as { [date: string]: WaitingListEntry[] } | null;
          if (!wl) return [];
          return Object.entries(wl)
            .filter(([, entries]) => Array.isArray(entries) && entries.some(e => e.clientId === user.id))
            .map(([date]) => ({
                barbershopId: shop.id,
                barbershopName: shop.name,
                date: date
            }));
      });
  }, [barbershops, user]);

  return (
    <>
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold text-brand-light">Meus Agendamentos</h1>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-brand-primary">Próximos</h2>
        <div className="space-y-4">
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map(app => (
              <AppointmentCard 
                key={app.id} 
                appointment={app} 
                barbershop={barbershops.find(b => b.id === app.barbershop_id)}
                onReview={() => {}} 
                onRebook={() => {}} 
                onCancel={() => setCancellingAppointment(app)}
              />
            ))
          ) : (
            <p className="text-gray-400">Você não tem agendamentos futuros.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 text-brand-primary">Minhas Listas de Espera</h2>
         <div className="space-y-4">
            {waitingLists.length > 0 ? (
                waitingLists.map(wl => (
                    <div key={`${wl.barbershopId}-${wl.date}`} className="bg-brand-secondary p-4 rounded-lg">
                        <p className="font-bold">{wl.barbershopName}</p>
                        <p className="text-sm text-gray-300">Aguardando por um horário em: {new Date(wl.date + 'T00:00:00').toLocaleDateString()}</p>
                        <Button variant="danger" className="w-full mt-3 py-2 text-sm" onClick={() => user && removeFromWaitingList(wl.barbershopId, wl.date, user.id)}>Sair da Lista</Button>
                    </div>
                ))
            ) : (
                 <p className="text-gray-400">Você não está em nenhuma lista de espera.</p>
            )}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-4 text-brand-primary">Histórico</h2>
        <div className="space-y-4">
          {pastAppointments.length > 0 ? (
            pastAppointments.map(app => (
                <AppointmentCard 
                    key={app.id} 
                    appointment={app} 
                    barbershop={barbershops.find(b => b.id === app.barbershop_id)}
                    onReview={() => setReviewingAppointment(app)}
                    onRebook={() => setRebookingAppointment(app)}
                    onCancel={() => {}}
                />
            ))
          ) : (
             <p className="text-gray-400">Nenhum agendamento passado encontrado.</p>
          )}
        </div>
      </div>
    </div>
    {reviewingAppointment && (
        <ReviewModal 
            appointment={reviewingAppointment}
            onClose={() => setReviewingAppointment(null)}
        />
    )}
    {rebookingAppointment && rebookingBarbershop && (
        <BookingModal 
          barbershop={rebookingBarbershop} 
          onClose={() => setRebookingAppointment(null)}
          onInitiatePayment={(data) => {
              setAppointmentToPay(data);
              setRebookingAppointment(null);
          }}
          initialBarberId={rebookingAppointment.barber_id || undefined}
          initialServiceId={rebookingAppointment.service_id || undefined}
        />
    )}
    {appointmentToPay && (
        <PaymentModal
          appointmentData={appointmentToPay}
          onClose={() => setAppointmentToPay(null)}
        />
      )}
    
    {cancellingAppointment && cancellationInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 text-center">
                <h2 className="text-xl font-bold mb-4">Confirmar Cancelamento</h2>
                <p className={`text-gray-300 mb-6 ${cancellationInfo.showWarning ? 'text-amber-400' : ''}`}>{cancellationInfo.message}</p>
                {cancellationInfo.showWarning && <p className="text-gray-300 mb-6">{cancellationInfo.fullMessage}</p>}
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setCancellingAppointment(null)}>Não, Manter</Button>
                    <Button variant="danger" onClick={handleConfirmCancel}>Sim, Cancelar</Button>
                </div>
            </div>
        </div>
    )}

    {showRebookPromptFor && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 text-center">
                <h2 className="text-xl font-bold mb-4">Agendamento Cancelado</h2>
                <p className="text-gray-300 mb-6">Deseja agendar um novo horário?</p>
                <div className="flex gap-4">
                    <Button variant="secondary" onClick={() => setShowRebookPromptFor(null)}>Não, Obrigado</Button>
                    <Button variant="primary" onClick={handleStartRebooking}>Sim, Reagendar</Button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ClientAppointmentsScreen;
    