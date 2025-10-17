import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../App';
import { Barbershop, Barber, Service, Appointment, OpeningHours, BlockedTimeSlot, DayOpeningHours, UserPurchasedPackage, ServicePackage, UserActiveSubscription, SubscriptionPlan } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, CheckCircleIcon, CalendarIcon } from '../../components/icons/OutlineIcons';
import BarberProfileModal from './BarberProfileModal';
import { generateGoogleCalendarLink } from '../../utils/calendar';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface BookingModalProps {
  barbershop: Barbershop;
  onClose: () => void;
  onInitiatePayment: (appointmentData: NewAppointmentData) => void;
  initialBarberId?: string | null;
  initialServiceId?: string | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ barbershop, onClose, onInitiatePayment, initialBarberId, initialServiceId }) => {
  const { user, addAppointment, allAppointments, addToWaitingList } = useContext(AppContext);

  const services = Array.isArray(barbershop.services) ? barbershop.services as Service[] : [];
  const barbers = Array.isArray(barbershop.barbers) ? barbershop.barbers as Barber[] : [];

  const findInitialService = () => services.find(s => s.id === initialServiceId) || null;
  const findInitialBarber = () => barbers.find(b => b.id === initialBarberId) || null;
  
  const [step, setStep] = useState(initialServiceId && initialBarberId ? 3 : 1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(findInitialBarber());
  const [selectedService, setSelectedService] = useState<Service | null>(findInitialService());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isUsingReward, setIsUsingReward] = useState(false);
  const [viewingBarber, setViewingBarber] = useState<Barber | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ title: string; message: string; appointment: NewAppointmentData } | null>(null);
  const [selectedCredit, setSelectedCredit] = useState<{
      type: 'package' | 'subscription';
      usageId: string;
      planId: string;
    } | null>(null);


  const hasReward = (user?.rewards as any)?.[barbershop.id]?.hasReward;
  
  const availablePackageCredits = useMemo(() => {
    if (!user || !barbershop) return [];

    const userPackages = ((user.purchased_packages || []) as UserPurchasedPackage[])
        .filter(p => p.barbershopId === barbershop.id && p.remainingUses > 0);

    const allShopPackages = (barbershop.packages as ServicePackage[] || []);

    return userPackages.map(userPkg => {
        const pkgDetails = allShopPackages.find(p => p.id === userPkg.packageId);
        if (!pkgDetails) return null;
        return {
            ...userPkg,
            name: pkgDetails.name,
            serviceIds: pkgDetails.serviceIds,
        };
    }).filter((p): p is NonNullable<typeof p> => p !== null);
  }, [user, barbershop]);
  
  const availableSubscriptionCredits = useMemo(() => {
    if (!user || !barbershop) return [];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const userSubscriptions = ((user.active_subscriptions || []) as UserActiveSubscription[])
        .filter(s => s.barbershopId === barbershop.id && s.status === 'active');
        
    const allShopSubscriptions = (barbershop.subscriptions as SubscriptionPlan[] || []);

    return userSubscriptions.map(userSub => {
        const subDetails = allShopSubscriptions.find(s => s.id === userSub.subscriptionId);
        if (!subDetails) return null;

        const usesThisMonth = allAppointments.filter(app => 
            app.subscription_usage_id === userSub.id &&
            app.start_time >= startOfMonth &&
            app.start_time <= endOfMonth &&
            app.status !== 'cancelled' && app.status !== 'declined'
        ).length;

        const remainingUses = subDetails.usesPerMonth - usesThisMonth;
        
        if (remainingUses <= 0) return null;

        return {
            ...userSub,
            name: subDetails.name,
            serviceIds: subDetails.serviceIds,
            remainingUses,
        };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [user, barbershop, allAppointments]);


  const handleJoinWaitingList = () => {
    if (!user) {
        alert("Por favor, faça login ou crie uma conta para entrar na lista de espera.");
        return;
    };
    const dateString = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    addToWaitingList(barbershop.id, dateString);
    alert('Você foi adicionado à lista de espera! Nós te avisaremos se um horário vagar.');
    onClose();
  };

  const availableTimeSlots = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    const localDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000);
    const dateString = localDate.toISOString().split('T')[0];
    if (barbershop.blocked_dates?.includes(dateString)) return [];
    
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()];
    const hours = (barbershop.opening_hours as OpeningHours || {})[dayOfWeek] as DayOpeningHours | null;
    
    if (!hours || !selectedService || !selectedBarber) return [];

    const potentialSlots: Date[] = [];
    const duration = selectedService.duration;

    const generateSlotsForPeriod = (open: string, close: string) => {
        let currentTime = new Date(`${selectedDate.toDateString()} ${open}`);
        const closeTime = new Date(`${selectedDate.toDateString()} ${close}`);
        while (currentTime < closeTime) {
            potentialSlots.push(new Date(currentTime));
            currentTime.setMinutes(currentTime.getMinutes() + 15); // Check in 15-min increments
        }
    }

    generateSlotsForPeriod(hours.morning_open, hours.morning_close);
    generateSlotsForPeriod(hours.afternoon_open, hours.afternoon_close);
    
    const confirmedAndPaidAppointments = allAppointments.filter(app => 
        app.barber_id === selectedBarber.id &&
        (app.status === 'confirmed' || app.status === 'paid') &&
        new Date(app.start_time).toDateString() === selectedDate.toDateString()
    );

    const validTimeBlocksOnDay = (Array.isArray(barbershop.blocked_time_slots) ? barbershop.blocked_time_slots as BlockedTimeSlot[] : [])
        .map(block => {
            if (!block || !block.start || !block.end) return null;
            const start = new Date(block.start);
            const end = new Date(block.end);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
            return { start, end };
        })
        .filter((block): block is { start: Date; end: Date } =>
            block !== null && block.start.toDateString() === selectedDate.toDateString()
        );

    const availableSlots = potentialSlots.filter(slotStartTime => {
        if (isToday && slotStartTime < now) {
          return false;
        }

        const slotEndTime = new Date(slotStartTime.getTime() + duration * 60000);
        
        const morningClose = new Date(`${selectedDate.toDateString()} ${hours.morning_close}`);
        const afternoonOpen = new Date(`${selectedDate.toDateString()} ${hours.afternoon_open}`);
        const afternoonClose = new Date(`${selectedDate.toDateString()} ${hours.afternoon_close}`);

        // Check if the slot crosses the lunch break or ends after hours
        const isInMorning = slotStartTime < morningClose && slotEndTime <= morningClose;
        const isInAfternoon = slotStartTime >= afternoonOpen && slotEndTime <= afternoonClose;

        if (!isInMorning && !isInAfternoon) return false;


        const isOverlappingAppointment = confirmedAndPaidAppointments.some(app => {
            const appStart = new Date(app.start_time);
            const appEnd = new Date(app.end_time);
            return (slotStartTime < appEnd) && (slotEndTime > appStart);
        });
        if (isOverlappingAppointment) return false;

        const isOverlappingBlock = validTimeBlocksOnDay.some(block => 
            (slotStartTime < block.end) && (slotEndTime > block.start)
        );
        if (isOverlappingBlock) return false;

        return true;
    });

    return availableSlots.map(time => time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  }, [selectedDate, selectedService, selectedBarber, barbershop, allAppointments]);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const getAppointmentData = (): NewAppointmentData | null => {
      if (!user || !selectedBarber || !selectedService || !selectedTime) {
        return null;
      }
      
      const [hours, minutes] = selectedTime.split(/[:\s]/);
      const startTime = new Date(selectedDate);
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);

      return {
        client_id: user.id,
        client_name: user.name,
        barbershop_id: barbershop.id,
        barber_id: selectedBarber.id,
        barber_name: selectedBarber.name,
        service_id: selectedService.id,
        service_name: isUsingReward ? `(Recompensa) ${selectedService.name}` : selectedService.name,
        price: isUsingReward || selectedCredit ? 0 : selectedService.price, 
        start_time: startTime,
        end_time: endTime,
        notes,
        status: 'pending',
        is_reward: isUsingReward,
        cancellation_fee: null,
        commission_amount: null,
        review_id: null,
        package_usage_id: selectedCredit?.type === 'package' ? selectedCredit.usageId : null,
        subscription_usage_id: selectedCredit?.type === 'subscription' ? selectedCredit.usageId : null,
      };
  }

  const handleRequestAndPayLater = async () => {
    if (!user) {
        alert("Por favor, faça login ou crie uma conta para agendar um horário.");
        return;
    }
    const newAppointment = getAppointmentData();
    if (newAppointment) {
        try {
            const finalAppointment = await addAppointment(newAppointment);
            
            if (finalAppointment.status === 'confirmed') {
                setSuccessInfo({
                    title: "Agendamento Confirmado!",
                    message: "Seu horário foi agendado com sucesso e já está na agenda da barbearia.",
                    appointment: newAppointment
                });
            } else {
                setSuccessInfo({
                    title: "Agendamento Solicitado!",
                    message: "Sua solicitação foi enviada. Você será notificado quando a barbearia confirmar.",
                    appointment: newAppointment
                });
            }
        } catch (err) {
            console.error("Failed to add 'pay later' appointment", err);
            alert("Ocorreu um erro ao solicitar o agendamento. Tente novamente.");
        }
    } else {
        alert("Por favor, complete todos os passos.");
    }
  };
  
  const handlePayNow = () => {
    if (!user) {
        alert("Por favor, faça login ou crie uma conta para agendar um horário.");
        return;
    }
    const newAppointment = getAppointmentData();
    if(newAppointment) {
        onInitiatePayment(newAppointment);
    } else {
        alert("Por favor, complete todos os passos.");
    }
  };
  
  const handleAddToCalendar = (appointment: NewAppointmentData) => {
    const url = generateGoogleCalendarLink(appointment as Appointment, barbershop);
    window.open(url, '_blank');
  };

  if (successInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-8 text-center">
            <CheckCircleIcon className="w-20 h-20 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{successInfo.title}</h2>
            <p className="text-gray-400 mb-6">{successInfo.message}</p>
            <div className="space-y-3">
                <Button onClick={() => handleAddToCalendar(successInfo.appointment)} variant="secondary" className="flex items-center justify-center gap-2">
                    <CalendarIcon className="w-5 h-5"/>
                    Adicionar ao Google Agenda
                </Button>
                <Button onClick={onClose}>Fechar</Button>
            </div>
        </div>
      </div>
    );
  }
  
  const renderStepContent = () => {
    switch (step) {
      case 1: // Selecionar Barbeiro
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Selecione um Barbeiro</h3>
            <div className="grid grid-cols-2 gap-4">
              {barbers.map(barber => (
                <div key={barber.id} className={`p-2 border-2 rounded-lg text-center cursor-pointer ${selectedBarber?.id === barber.id ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-600'}`}>
                   <div onClick={() => { setSelectedBarber(barber); handleNext(); }}>
                    <img src={barber.avatarUrl} alt={barber.name} className="w-20 h-20 rounded-full mx-auto" />
                    <p className="mt-2 font-medium">{barber.name}</p>
                   </div>
                   <button onClick={() => setViewingBarber(barber)} className="text-xs text-brand-accent mt-1 hover:underline">Ver Perfil</button>
                </div>
              ))}
            </div>
          </div>
        );
      case 2: { // Selecionar Serviço
        const handleSelectCredit = (
            service: Service, 
            credit: { type: 'package' | 'subscription', usageId: string, planId: string }
        ) => {
            setSelectedService(service);
            setSelectedCredit(credit);
            setIsUsingReward(false);
            handleNext();
        };
    
        const handleSelectRegularService = (service: Service) => {
            setSelectedService(service);
            setSelectedCredit(null);
            setIsUsingReward(false);
            handleNext();
        };

        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Selecione um Serviço</h3>
            
            {(availablePackageCredits.length > 0 || availableSubscriptionCredits.length > 0) && (
                <div className="mb-6">
                    <h4 className="text-lg font-semibold text-brand-primary mb-2">Meus Pacotes e Assinaturas</h4>
                    <div className="space-y-3">
                        {availablePackageCredits.map(pkgCredit => (
                            <div key={pkgCredit.id} className="bg-gray-800 p-3 rounded-lg">
                                <p className="font-semibold">{pkgCredit.name} <span className="text-xs font-normal text-gray-400">({pkgCredit.remainingUses} usos restantes)</span></p>
                                <div className="mt-2 space-y-1">
                                    {pkgCredit.serviceIds.map(serviceId => {
                                        const service = services.find(s => s.id === serviceId);
                                        if (!service) return null;
                                        return (
                                            <button key={service.id} onClick={() => handleSelectCredit(service, { type: 'package', usageId: pkgCredit.id, planId: pkgCredit.packageId })} className="w-full text-left flex justify-between items-center bg-brand-dark p-2 rounded-md hover:bg-gray-700">
                                                <span>Usar: {service.name}</span>
                                                <span className="text-sm font-bold text-green-400">CRÉDITO</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {availableSubscriptionCredits.map(subCredit => (
                             <div key={subCredit.id} className="bg-gray-800 p-3 rounded-lg">
                                <p className="font-semibold">{subCredit.name} <span className="text-xs font-normal text-gray-400">({subCredit.remainingUses} usos este mês)</span></p>
                                <div className="mt-2 space-y-1">
                                    {subCredit.serviceIds.map(serviceId => {
                                        const service = services.find(s => s.id === serviceId);
                                        if (!service) return null;
                                        return (
                                            <button key={service.id} onClick={() => handleSelectCredit(service, { type: 'subscription', usageId: subCredit.id, planId: subCredit.subscriptionId })} className="w-full text-left flex justify-between items-center bg-brand-dark p-2 rounded-md hover:bg-gray-700">
                                                <span>Usar: {service.name}</span>
                                                <span className="text-sm font-bold text-green-400">CRÉDITO</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div>
                <h4 className="text-lg font-semibold text-brand-primary mb-2">Serviços Avulsos</h4>
                <div className="space-y-2">
                {hasReward && (
                    <div onClick={() => {
                        setIsUsingReward(!isUsingReward);
                        setSelectedCredit(null);
                    }} className={`flex justify-between p-3 border-2 rounded-lg cursor-pointer ${isUsingReward ? 'border-green-500 bg-green-500/10' : 'border-gray-600'}`}>
                        <div>
                            <p className="font-semibold text-green-400">Usar Recompensa</p>
                            <p className="text-sm text-gray-400">{(user?.rewards as any)?.[barbershop.id]?.rewardDescription}</p>
                        </div>
                        <input type="checkbox" checked={isUsingReward} readOnly className="w-5 h-5 rounded accent-green-500" />
                    </div>
                )}
                {services.map(service => (
                    <div key={service.id} onClick={() => handleSelectRegularService(service)} className={`flex justify-between p-3 border-2 rounded-lg cursor-pointer ${selectedService?.id === service.id && !selectedCredit && !isUsingReward ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-600'}`}>
                    <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-sm text-gray-400">{service.duration} min</p>
                    </div>
                    <p className="font-semibold">R${service.price.toFixed(2)}</p>
                    </div>
                ))}
                </div>
            </div>
          </div>
        );
      }
      case 3: // Selecionar Data e Hora
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Selecione Data e Hora</h3>
            <input 
              type="date"
              className="w-full p-2 bg-brand-secondary border border-gray-600 rounded-lg mb-4"
              value={new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
              min={new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
            />
            <div className="grid grid-cols-3 gap-2">
              {availableTimeSlots.length > 0 ? (
                availableTimeSlots.map(time => (
                  <button key={time} onClick={() => {setSelectedTime(time); handleNext();}} className={`p-2 rounded-lg ${selectedTime === time ? 'bg-brand-primary text-brand-dark' : 'bg-brand-secondary'}`}>
                    {time}
                  </button>
                ))
              ) : (
                <div className="col-span-3 text-center text-gray-400 py-4">
                    <p>Nenhum horário disponível para este dia.</p>
                    <Button variant="secondary" className="mt-4 py-2 text-sm" onClick={handleJoinWaitingList}>
                        Entrar na Lista de Espera
                    </Button>
                </div>
              )}
            </div>
          </div>
        );
      case 4: { // Confirmar
        const basePrice = isUsingReward || selectedCredit ? 0 : (selectedService?.price || 0);
        const debt = (user?.outstanding_debts as any)?.[barbershop.id] || 0;
        const credit = (user?.store_credits as any)?.[barbershop.id] || 0;
        const creditToApply = Math.min(credit, basePrice + debt);
        const finalPriceToPay = basePrice + debt - creditToApply;

        return (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">Confirmação</h3>
            <div className="bg-brand-secondary p-4 rounded-lg space-y-2 text-sm mb-4">
              <p><strong>Barbeiro:</strong> {selectedBarber?.name}</p>
              <p><strong>Serviço:</strong> {selectedService?.name}</p>
              <p><strong>Data:</strong> {selectedDate.toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {selectedTime}</p>
              {isUsingReward && <p className="font-bold text-green-400">Recompensa aplicada!</p>}
              {selectedCredit && <p className="font-bold text-green-400">Usando 1 crédito de {selectedCredit.type === 'package' ? 'pacote' : 'assinatura'}.</p>}
              <textarea 
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg mt-2" 
                rows={2} 
                placeholder="Observações (opcional)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
             <div className="border-t border-gray-700 pt-4">
                 <div className="space-y-1 text-sm mb-3">
                    <div className="flex justify-between">
                        <span>Serviço:</span>
                        <span>R${(basePrice).toFixed(2)}</span>
                    </div>
                    {debt > 0 && (
                        <div className="flex justify-between text-red-400">
                        <span>Taxa pendente:</span>
                        <span>+ R${debt.toFixed(2)}</span>
                        </div>
                    )}
                    {creditToApply > 0 && (
                        <div className="flex justify-between text-green-400">
                        <span>Crédito aplicado:</span>
                        <span>- R${creditToApply.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                 <div className="flex justify-between items-center text-lg font-bold border-t border-gray-600 pt-2">
                     <span>Total a Pagar:</span>
                     <span>R${finalPriceToPay.toFixed(2)}</span>
                 </div>
                 {finalPriceToPay > 0 && <p className="text-xs text-gray-400 mt-2 text-center">Pague agora para confirmar seu horário instantaneamente ou pague no local após o serviço.</p>}
             </div>
          </div>
        );
      }
      default:
        return null;
    }
  };
  
  const getConfirmationButtons = () => {
    const basePrice = isUsingReward || selectedCredit ? 0 : (selectedService?.price || 0);
    const debt = (user?.outstanding_debts as any)?.[barbershop.id] || 0;
    const credit = (user?.store_credits as any)?.[barbershop.id] || 0;
    const creditToApply = Math.min(credit, basePrice + debt);
    const finalPriceToPay = basePrice + debt - creditToApply;

    if (finalPriceToPay > 0) {
        return (
            <>
                <Button onClick={handlePayNow}>Pagar Agora e Confirmar</Button>
                <Button variant="secondary" onClick={handleRequestAndPayLater}>Agendar e Pagar no Local</Button>
            </>
        );
    }
    return <Button onClick={handleRequestAndPayLater}>Confirmar Agendamento</Button>;
  };


  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8"/>
        </button>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold">{barbershop.name}</h2>
          <div className="flex justify-center my-4 space-x-2">
              {[1,2,3,4].map(i => (
                  <div key={i} className={`w-1/4 h-1.5 rounded-full ${step >= i ? 'bg-brand-primary' : 'bg-brand-secondary'}`}></div>
              ))}
          </div>
        </div>
        <div className="flex-grow overflow-y-auto">
          {renderStepContent()}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {step > 1 && <Button variant="secondary" onClick={handleBack}>Voltar</Button>}
          {step === 4 ? (
            getConfirmationButtons()
          ) : (
            <Button onClick={handleNext} disabled={!selectedBarber || (step > 1 && !selectedService) || (step > 2 && !selectedTime)}>
              Próximo
            </Button>
          )}
        </div>
      </div>
    </div>
    {viewingBarber && (
        <BarberProfileModal 
            barber={viewingBarber} 
            barbershopId={barbershop.id} 
            onClose={() => setViewingBarber(null)} 
        />
    )}
    </>
  );
};

export default BookingModal;