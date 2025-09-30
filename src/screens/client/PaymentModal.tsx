import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../App';
import { Appointment, IntegrationSettings } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, CheckCircleIcon, CalendarIcon } from '../../components/icons/OutlineIcons';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import * as api from '../../api';
import MockStripeElement from '../../components/MockStripeElement';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface PaymentModalProps {
  appointmentData: NewAppointmentData;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ appointmentData, onClose }) => {
  const { barbershops, addAppointment } = useContext(AppContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { service_name, price, barbershop_id } = appointmentData;
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const barbershop = barbershops.find(b => b.id === barbershop_id);
  const integrations = barbershop?.integrations as IntegrationSettings;
  const isStripeConnected = integrations?.stripeAccountId && integrations?.stripeAccountOnboarded;

  useEffect(() => {
    if (!isStripeConnected) {
      setError("Esta barbearia não está configurada para receber pagamentos online no momento.");
      return;
    }

    // Em uma aplicação real, aqui você faria uma chamada para o seu backend.
    // A função no `api.ts` simula essa chamada.
    api.createPaymentIntent(appointmentData, integrations.stripeAccountId!)
      .then(secret => {
        setClientSecret(secret);
      })
      .catch(err => {
        setError(err.message);
      });
  }, [appointmentData, isStripeConnected, integrations]);

  const handlePay = () => {
    if (!clientSecret) return;
    
    setIsProcessing(true);
    setError(null);
    
    // Simulação do `stripe.confirmPayment()`
    setTimeout(() => {
      // Após a confirmação bem-sucedida do Stripe (notificada via webhook no backend),
      // o frontend criaria o agendamento localmente.
      addAppointment({ ...appointmentData, status: 'paid' })
        .then(() => {
          setIsProcessing(false);
          setIsSuccess(true);
        })
        .catch((err) => {
          console.error("Failed to add appointment on payment:", err);
          setError("Falha ao salvar o agendamento pós-pagamento. Tente novamente.");
          setIsProcessing(false);
        });
    }, 2500); 
  };

  const handleAddToCalendar = () => {
    if (barbershop) {
      const url = generateGoogleCalendarLink(appointmentData as Appointment, barbershop);
      window.open(url, '_blank');
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-8 text-center">
          <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Pagamento Aprovado!</h2>
          <p className="text-gray-400 mb-6">Seu agendamento para {service_name} está confirmado.</p>
          <div className="space-y-3">
            <Button onClick={handleAddToCalendar} variant="secondary" className="flex items-center justify-center gap-2">
              <CalendarIcon className="w-5 h-5"/>
              Adicionar ao Google Agenda
            </Button>
            <Button onClick={onClose}>Ver Meus Agendamentos</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        {!isProcessing && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <XCircleIcon className="w-8 h-8" />
          </button>
        )}
        <h2 className="text-xl font-bold mb-2 text-center">Pagamento Seguro</h2>
        <p className="text-center text-gray-400 mb-6">Confirme seu agendamento para {service_name}.</p>
        
        <div className="bg-brand-secondary p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center">
                <span className="text-gray-300">Valor Total</span>
                <span className="font-bold text-lg">R$ {(price || 0).toFixed(2)}</span>
            </div>
        </div>
        
        {error && <p className="text-red-500 text-sm text-center my-4">{error}</p>}
        
        {!error && !clientSecret && (
          <div className="text-center text-gray-400">
            <p>Inicializando gateway de pagamento...</p>
          </div>
        )}

        {clientSecret && !error && (
            <MockStripeElement />
        )}

        <div className="mt-8">
          <Button onClick={handlePay} disabled={isProcessing || !clientSecret || !!error}>
            {isProcessing ? (
                <div className="flex items-center justify-center">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                </div>
            ) : `Pagar R$ ${(price || 0).toFixed(2)}`}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
