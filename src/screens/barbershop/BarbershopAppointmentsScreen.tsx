import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { Appointment, IntegrationSettings, User, Service, Barber, OpeningHours, DayOpeningHours } from '../../types';
import { XCircleIcon, PencilIcon, CheckCircleIcon, TrashIcon, ClockIcon } from '../../components/icons/OutlineIcons';
import EditAppointmentModal from './EditAppointmentModal';
import * as api from '../../api';

// --- SUB-COMPONENTS ---

const AppointmentRequestCard: React.FC<{ appointment: Appointment }> = ({ appointment }) => {
  const { users, barbershopData, updateAppointmentStatus } = useContext(AppContext);
  
  const handleAccept = () => {
    updateAppointmentStatus(appointment, 'confirmed');

    if ((barbershopData?.integrations as IntegrationSettings)?.whatsapp) {
        const client = users.find(u => u.id === appointment.client_id);
        if (client?.phone) {
            const message = `Olá, ${appointment.client_name}! Seu agendamento na ${barbershopData!.name} para ${appointment.service_name} no dia ${appointment.start_time.toLocaleDateString()} às ${appointment.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} foi CONFIRMADO. Estamos te esperando!`;
            const whatsappUrl = `https://wa.me/${client.phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    }
  };
  
  const handleDecline = () => {
    updateAppointmentStatus(appointment, 'declined');
  };

  return (
    <div className="bg-brand-secondary p-4 rounded-lg">
      <div className="mb-3">
        <p className="font-bold text-lg text-brand-light">{appointment.client_name}</p>
        <p className="text-sm text-gray-300">{appointment.start_time.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</p>
      </div>
      <div className="bg-brand-dark p-3 rounded-md mb-3 text-sm">
        <p><strong>Serviço:</strong> {appointment.service_name} (R$ {(appointment.price || 0).toFixed(2)})</p>
        <p><strong>Barbeiro:</strong> {appointment.barber_name}</p>
        {appointment.notes && <p className="mt-2 text-gray-400 italic"><strong>Observações:</strong> "{appointment.notes}"</p>}
      </div>
      <div className="flex gap-4">
        <Button onClick={handleAccept}>Aceitar</Button>
        <Button variant="danger" onClick={handleDecline}>Recusar</Button>
      </div>
    </div>
  );
};

const AppointmentActionModal: React.FC<{
    appointment: Appointment;
    onClose: () => void;
    onEdit: () => void;
}> = ({ appointment, onClose, onEdit }) => {
    const { updateAppointmentStatus, users, barbershopData, patchUser } = useContext(AppContext);
    const [client, setClient] = useState<User | null>(null);
    const [isLoadingClient, setIsLoadingClient] = useState(true);

    useEffect(() => {
        const findAndSetClient = async () => {
            setIsLoadingClient(true);
            const localClient = users.find(u => u.id === appointment.client_id);

            if (localClient && localClient.phone) {
                setClient(localClient);
                setIsLoadingClient(false);
                return;
            }

            try {
                const fullClientProfile = await api.getUserProfile(appointment.client_id);
                if (fullClientProfile) {
                    patchUser(fullClientProfile); 
                    setClient(fullClientProfile);
                } else {
                    setClient(localClient || null); 
                }
            } catch (error: any) {
                let errorMessage = "Erro desconhecido ao buscar perfil do cliente.";
                if (error) {
                    if (error.message) {
                        errorMessage = `Erro do Supabase: ${error.message}`;
                        if (error.details) errorMessage += ` Detalhes: ${error.details}`;
                        if (error.hint) errorMessage += ` Dica: ${error.hint}`;
                    } else {
                        errorMessage = JSON.stringify(error);
                    }
                }
                console.error("Failed to fetch client profile:", errorMessage);
                setClient(localClient || null);
            } finally {
                setIsLoadingClient(false);
            }
        };

        findAndSetClient();
    }, [appointment.client_id, users, patchUser]);


    const handleStatusChange = (status: 'completed' | 'cancelled') => {
        updateAppointmentStatus(appointment, status);
        onClose();
    };

    const handleSendReminder = () => {
        if (isLoadingClient) {
            alert("Carregando dados do cliente, por favor aguarde...");
            return;
        }

        const integrations = barbershopData?.integrations as IntegrationSettings;
        if (!integrations?.whatsapp) {
            alert("As notificações por WhatsApp não estão ativadas para esta barbearia.");
            return;
        }
        
        if (!client || !client.phone) {
            alert("Este cliente não possui um número de telefone cadastrado.");
            return;
        }

        const cleanPhone = "55" + client.phone.replace(/\D/g, '');
        const message = `Olá, ${appointment.client_name}! 👋 Este é um lembrete do seu agendamento na ${barbershopData!.name} hoje às ${appointment.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Estamos te esperando!`;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XCircleIcon className="w-8 h-8" /></button>
                <div className="text-center">
                    <h2 className="text-xl font-bold">{appointment.client_name}</h2>
                    <p className="text-gray-400">{appointment.service_name}</p>
                    <p className="text-brand-primary font-semibold">{appointment.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {appointment.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="mt-6 space-y-3">
                    <Button onClick={() => handleStatusChange('completed')} className="bg-green-600 hover:bg-green-700 focus:ring-green-500">Marcar como Concluído</Button>
                    <Button onClick={onEdit} variant="secondary">Editar Agendamento</Button>
                    <Button onClick={handleSendReminder} disabled={isLoadingClient} variant="secondary" className="bg-green-800/50 hover:bg-green-700/50">
                        {isLoadingClient ? 'Carregando...' : 'Enviar Lembrete WhatsApp'}
                    </Button>
                    <Button onClick={() => handleStatusChange('cancelled')} variant="danger">Cancelar Agendamento</Button>
                </div>
            </div>
        </div>
    );
};

const NewAppointmentModal: React.FC<{
    onClose: () => void;
    selectedDate: Date;
    selectedTime: string;
}> = ({ onClose, selectedDate, selectedTime }) => {
    const { barbershopData, users, addAppointment, user } = useContext(AppContext);
    
    const clients = useMemo(() => users.filter(u => u.user_type === 'CLIENT' && u.name !== 'Cliente de Balcão'), [users]);
    const services = useMemo(() => Array.isArray(barbershopData?.services) ? barbershopData.services as Service[] : [], [barbershopData]);
    const barbers = useMemo(() => Array.isArray(barbershopData?.barbers) ? barbershopData.barbers as Barber[] : [], [barbershopData]);

    const [clientNameInput, setClientNameInput] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedBarberId, setSelectedBarberId] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const clientOptions = useMemo(() => clients.map(c => c.name), [clients]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!clientNameInput.trim() || !selectedServiceId || !selectedBarberId) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            setIsLoading(false);
            return;
        }

        try {
            const existingClient = users.find(u => u.user_type === 'CLIENT' && u.name.trim().toLowerCase() === clientNameInput.trim().toLowerCase());
            
            let finalClientId: string;

            if (existingClient) {
                finalClientId = existingClient.id;
            } else {
                if (!user || user.user_type !== 'BARBERSHOP') {
                    throw new Error("Não foi possível identificar o proprietário da barbearia para criar um agendamento de balcão.");
                }
                finalClientId = user.id;
            }

            const service = services.find(s => s.id === selectedServiceId);
            const barber = barbers.find(b => b.id === selectedBarberId);

            if (!service || !barber || !barbershopData) {
                alert('Ocorreu um erro ao encontrar os dados. Tente novamente.');
                setIsLoading(false);
                return;
            }

            const [hours, minutes] = selectedTime.split(':');
            const startTime = new Date(selectedDate);
            startTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            const endTime = new Date(startTime.getTime() + service.duration * 60000);

            await addAppointment({
                client_id: finalClientId,
                client_name: clientNameInput.trim(),
                barbershop_id: barbershopData.id,
                barber_id: barber.id,
                barber_name: barber.name,
                service_id: service.id,
                service_name: service.name,
                price: service.price,
                start_time: startTime,
                end_time: endTime,
                notes,
                status: 'confirmed',
                is_reward: false,
                cancellation_fee: null,
                commission_amount: null,
                review_id: null,
                // FIX: Added missing properties to satisfy the Appointment type.
                package_usage_id: null,
                subscription_usage_id: null,
            });
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(`Falha ao criar agendamento: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSave} className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
                 <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XCircleIcon className="w-8 h-8" /></button>
                 <h2 className="text-xl font-bold mb-4 text-center">Novo Agendamento</h2>
                 <p className="text-center text-gray-400 -mt-2 mb-6">{selectedDate.toLocaleDateString()} às {selectedTime}</p>
                 <div className="space-y-4">
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Cliente</label>
                         <input 
                            type="text" 
                            value={clientNameInput}
                            onChange={e => setClientNameInput(e.target.value)}
                            list="client-options"
                            placeholder="Selecione ou digite o nome do cliente..."
                            className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg"
                        />
                        <datalist id="client-options">
                            {clientOptions.map(name => <option key={name} value={name} />)}
                        </datalist>
                     </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Serviço</label>
                        <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg">
                            <option value="">Selecione um serviço...</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - R${s.price}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-sm text-gray-400 mb-1 block">Barbeiro</label>
                        <select value={selectedBarberId} onChange={e => setSelectedBarberId(e.target.value)} className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg">
                            <option value="">Selecione um barbeiro...</option>
                            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                     </div>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações (opcional)" rows={2} className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" />
                 </div>
                 <div className="mt-6">
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Agendamento'}</Button>
                 </div>
            </form>
        </div>
    );
};


const PastAppointmentDetailsModal: React.FC<{
    appointment: Appointment;
    onClose: () => void;
}> = ({ appointment, onClose }) => {
    const statusInfo = {
        completed: { text: 'Concluído', color: 'text-green-400' },
        cancelled: { text: 'Cancelado', color: 'text-red-400' },
    }[appointment.status as 'completed' | 'cancelled'] || { text: appointment.status, color: 'text-gray-400' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XCircleIcon className="w-8 h-8" /></button>
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">{appointment.client_name}</h2>
                    <p className={`font-bold ${statusInfo.color}`}>{statusInfo.text}</p>
                </div>
                <div className="space-y-2 text-sm bg-brand-secondary p-4 rounded-lg">
                    <p><strong>Serviço:</strong> {appointment.service_name}</p>
                    <p><strong>Barbeiro:</strong> {appointment.barber_name}</p>
                    <p><strong>Data:</strong> {appointment.start_time.toLocaleDateString()}</p>
                    <p><strong>Horário:</strong> {appointment.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {appointment.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>Valor:</strong> R$ {(appointment.price || 0).toFixed(2)}</p>
                    {appointment.notes && <p className="mt-2 pt-2 border-t border-gray-700"><strong>Observações:</strong> "{appointment.notes}"</p>}
                </div>
                <div className="mt-6">
                    <Button variant="secondary" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </div>
    )
};

// --- MAIN COMPONENT ---
const BarbershopAppointmentsScreen: React.FC = () => {
    const { barbershopData, appointments } = useContext(AppContext);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
    const [newBookingTime, setNewBookingTime] = useState<string | null>(null);
    const [viewingPastAppointment, setViewingPastAppointment] = useState<Appointment | null>(null);


    const pendingAppointments = useMemo(() => {
        return appointments
            .filter(a => a.barbershop_id === barbershopData?.id && a.status === 'pending')
            .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
    }, [appointments, barbershopData]);

    const appointmentsByDay = useMemo(() => {
        const datesWithAppointments = new Set<string>();
        appointments.forEach(app => {
            if (app.barbershop_id === barbershopData?.id && (app.status === 'confirmed' || app.status === 'paid' || app.status === 'completed')) {
                datesWithAppointments.add(new Date(app.start_time).toDateString());
            }
        });
        return datesWithAppointments;
    }, [appointments, barbershopData]);

    const appointmentsForSelectedDay = useMemo(() => {
        return appointments
            .filter(app => 
                app.barbershop_id === barbershopData?.id &&
                new Date(app.start_time).toDateString() === selectedDate.toDateString() &&
                (app.status === 'confirmed' || app.status === 'paid')
            )
            .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
    }, [appointments, barbershopData, selectedDate]);
    
    const completedAppointmentsToday = useMemo(() => {
        return appointments
            .filter(app => 
                app.barbershop_id === barbershopData?.id &&
                new Date(app.start_time).toDateString() === selectedDate.toDateString() &&
                app.status === 'completed'
            )
            .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
    }, [appointments, barbershopData, selectedDate]);

    const cancelledAppointmentsToday = useMemo(() => {
        return appointments
            .filter(app => 
                app.barbershop_id === barbershopData?.id &&
                new Date(app.start_time).toDateString() === selectedDate.toDateString() &&
                app.status === 'cancelled'
            )
            .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
    }, [appointments, barbershopData, selectedDate]);
    
    // Calendar logic
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const days = [];
        const startDayOfWeek = firstDayOfMonth.getDay();
        for (let i = startDayOfWeek; i > 0; i--) {
            days.push(new Date(year, month, 1 - i));
        }
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        const endDayOfWeek = lastDayOfMonth.getDay();
        for (let i = 1; i < 7 - endDayOfWeek; i++) {
            days.push(new Date(year, month + 1, i));
        }
        return days;
    }, [currentMonth]);

    const handleMonthChange = (offset: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };
    
    // Daily schedule logic
    const dailyScheduleItems = useMemo(() => {
        if (!barbershopData) return [];
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()];
        const hours = (barbershopData.opening_hours as OpeningHours || {})[dayOfWeek] as DayOpeningHours | null;
        if (!hours) return [{ type: 'closed', message: 'Fechado neste dia.' }];
    
        const items: any[] = [];
    
        const processTimeBlock = (start: string, end: string) => {
            let currentTime = new Date(`${selectedDate.toDateString()} ${start}`);
            const endTime = new Date(`${selectedDate.toDateString()} ${end}`);
    
            while (currentTime < endTime) {
                const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                const appointmentAtThisTime = appointmentsForSelectedDay.find(app =>
                    app.start_time.getHours() === currentTime.getHours() &&
                    app.start_time.getMinutes() === currentTime.getMinutes()
                );
    
                if (appointmentAtThisTime) {
                    items.push({ type: 'appointment', data: appointmentAtThisTime });
                    const duration = (appointmentAtThisTime.end_time.getTime() - appointmentAtThisTime.start_time.getTime()) / (1000 * 60);
                    currentTime.setMinutes(currentTime.getMinutes() + duration);
                } else {
                    items.push({ type: 'free', time: timeString });
                    currentTime.setMinutes(currentTime.getMinutes() + 30);
                }
            }
        };
    
        processTimeBlock(hours.morning_open, hours.morning_close);
        items.push({ type: 'break', start: hours.morning_close, end: hours.afternoon_open });
        processTimeBlock(hours.afternoon_open, hours.afternoon_close);
    
        return items;
    }, [selectedDate, barbershopData, appointmentsForSelectedDay]);


    return (
        <>
            <div className="p-4 space-y-6">
                <h1 className="text-2xl font-bold text-brand-light">Agenda</h1>

                <section>
                    <h2 className="text-lg font-semibold text-amber-400 mb-3">Confirmações Pendentes ({pendingAppointments.length})</h2>
                    <div className="space-y-4">
                        {pendingAppointments.length > 0 ? (
                            pendingAppointments.map(app => <AppointmentRequestCard key={app.id} appointment={app} />)
                        ) : (
                            <p className="text-gray-400 text-sm">Nenhuma solicitação pendente.</p>
                        )}
                    </div>
                </section>
                
                <section className="bg-brand-secondary p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-gray-700">&lt;</button>
                        <h3 className="font-bold text-lg capitalize">{currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-gray-700">&gt;</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, index) => {
                            const isSelected = day.toDateString() === selectedDate.toDateString();
                            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                            const hasAppointments = appointmentsByDay.has(day.toDateString());

                            return (
                                <button
                                    key={index}
                                    onClick={() => setSelectedDate(day)}
                                    className={`h-10 text-sm rounded-lg flex items-center justify-center relative
                                        ${isCurrentMonth ? 'text-white hover:bg-gray-700' : 'text-gray-600'}
                                        ${isSelected ? 'bg-brand-primary text-brand-dark font-bold' : ''}
                                    `}
                                >
                                    {day.getDate()}
                                    {hasAppointments && !isSelected && <div className="absolute bottom-1 w-1.5 h-1.5 bg-brand-primary rounded-full"></div>}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-brand-primary mb-3">Agenda do Dia: {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h2>
                    <div className="bg-brand-secondary p-4 rounded-lg space-y-2 max-h-96 overflow-y-auto">
                        {dailyScheduleItems.map((item, index) => {
                            if (item.type === 'appointment') {
                                const app = item.data;
                                return (
                                    <div key={app.id} onClick={() => setSelectedAppointment(app)} className="bg-brand-dark p-3 rounded-lg cursor-pointer hover:bg-gray-800 flex gap-4">
                                        <div className="text-right text-sm text-gray-400 w-16">
                                            <p>{app.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p>{app.end_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <div className="border-l-4 border-brand-accent pl-3">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-white">{app.client_name}</p>
                                                {app.status === 'paid' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Pago</span>}
                                                {app.status === 'confirmed' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">A Pagar</span>}
                                            </div>
                                            <p className="text-xs text-gray-300">{app.service_name} com {app.barber_name}</p>
                                        </div>
                                    </div>
                                );
                            }
                            if (item.type === 'free') {
                                return (
                                    <div key={`free-${index}`} className="flex items-center gap-4 group">
                                         <p className="text-right text-sm text-gray-600 w-16">{item.time}</p>
                                         <div className="border-l-4 border-transparent pl-3 w-full">
                                            <button onClick={() => { setNewBookingTime(item.time); setIsNewBookingModalOpen(true); }} className="text-left text-sm text-gray-500 hover:text-brand-primary w-full">
                                                + Agendar horário
                                            </button>
                                         </div>
                                    </div>
                                );
                            }
                             if (item.type === 'break') {
                                return (
                                    <div key="break" className="flex items-center gap-4">
                                        <p className="text-right text-sm text-gray-600 w-16">{item.start}</p>
                                        <div className="border-l-4 border-transparent pl-3 w-full text-center bg-brand-dark/50 py-2 rounded-md">
                                            <p className="text-sm font-semibold text-gray-400">Pausa para Almoço</p>
                                        </div>
                                    </div>
                                );
                            }
                            if (item.type === 'closed') {
                                return <p key="closed" className="text-center text-gray-400 py-8">{item.message}</p>;
                            }
                            return null;
                        })}
                    </div>
                </section>

                 <section>
                    <h2 className="text-lg font-semibold text-green-400 mb-3">Concluídos no Dia ({completedAppointmentsToday.length})</h2>
                    <div className="bg-brand-secondary p-4 rounded-lg space-y-2">
                        {completedAppointmentsToday.length > 0 ? (
                            completedAppointmentsToday.map(app => (
                                <div key={app.id} onClick={() => setViewingPastAppointment(app)} className="bg-brand-dark p-3 rounded-lg flex justify-between items-center opacity-70 cursor-pointer hover:bg-gray-800">
                                    <div>
                                        <p className="font-semibold text-white">{app.client_name}</p>
                                        <p className="text-xs text-gray-300">{app.service_name}</p>
                                    </div>
                                    <span className="text-sm text-gray-400">{app.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-400 text-sm text-center py-4">Nenhum agendamento concluído hoje.</p>
                        )}
                    </div>
                </section>

                 <section>
                    <h2 className="text-lg font-semibold text-red-400 mb-3">Cancelados no Dia ({cancelledAppointmentsToday.length})</h2>
                     <div className="bg-brand-secondary p-4 rounded-lg space-y-2">
                        {cancelledAppointmentsToday.length > 0 ? (
                            cancelledAppointmentsToday.map(app => (
                                <div key={app.id} onClick={() => setViewingPastAppointment(app)} className="bg-brand-dark p-3 rounded-lg flex justify-between items-center opacity-50 cursor-pointer hover:bg-gray-800">
                                    <div>
                                        <p className="font-semibold text-white line-through">{app.client_name}</p>
                                        <p className="text-xs text-gray-300 line-through">{app.service_name}</p>
                                    </div>
                                    <span className="text-sm text-gray-400 line-through">{app.start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-400 text-sm text-center py-4">Nenhum agendamento cancelado hoje.</p>
                        )}
                    </div>
                </section>

            </div>
            {selectedAppointment && (
                <AppointmentActionModal 
                    appointment={selectedAppointment} 
                    onClose={() => setSelectedAppointment(null)}
                    onEdit={() => {
                        setEditingAppointment(selectedAppointment);
                        setSelectedAppointment(null);
                    }} 
                />
            )}
            {editingAppointment && (
                <EditAppointmentModal 
                    appointment={editingAppointment}
                    onClose={() => setEditingAppointment(null)}
                />
            )}
            {isNewBookingModalOpen && newBookingTime && (
                <NewAppointmentModal 
                    onClose={() => setIsNewBookingModalOpen(false)} 
                    selectedDate={selectedDate}
                    selectedTime={newBookingTime}
                />
            )}
            {viewingPastAppointment && (
                <PastAppointmentDetailsModal
                    appointment={viewingPastAppointment}
                    onClose={() => setViewingPastAppointment(null)}
                />
            )}
        </>
    );
};

export default BarbershopAppointmentsScreen;
