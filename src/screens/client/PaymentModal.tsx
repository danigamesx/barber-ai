import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../App';
import { Appointment, IntegrationSettings } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, CheckCircleIcon, CalendarIcon } from '../../components/icons/OutlineIcons';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import * as api from '../../api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface PaymentModalProps {
  appointmentData: NewAppointmentData;
  onClose: () => void;
}

// Carrega a instância do Stripe com sua chave publicável.
// É importante que esta variável de ambiente VITE_STRIPE_PUBLISHABLE_KEY esteja configurada.
// FIX: Changed from import.meta.env to process.env to align with the Vite configuration update.
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444',
    },
  },
};

// Componente de formulário que usa os hooks do Stripe
const CheckoutForm: React.FC<{
  appointmentData: NewAppointmentData;
  clientSecret: string;
  onSuccess: () => void;
  isProcessing: boolean;
  onProcessing: (isProcessing: boolean) => void;
  onError: (errorMessage: string) => void;
}> = ({ appointmentData, clientSecret, onSuccess, isProcessing, onProcessing, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { addAppointment } = useContext(AppContext);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    onProcessing(true);
    onError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
        onError("Elemento de cartão não encontrado.");
        onProcessing(false);
        return;
    }

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: appointmentData.client_name || 'Cliente',
          },
        },
      });

      if (paymentError) {
        onError(paymentError.message || "Ocorreu um erro no pagamento.");
        onProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await addAppointment({ ...appointmentData, status: 'paid' });
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePay}>
        <div className="bg-brand-secondary p-4 rounded-lg">
            <label className="text-xs text-gray-400">Dados do Cartão</label>
            <div className="p-3 mt-1 bg-gray-700 rounded-md">
                <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
        </div>
        <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2 mt-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
           </svg>
            Pagamento seguro processado pela Stripe.
       </p>
       <div className="mt-8">
            <Button type="submit" disabled={!stripe || isProcessing}>
                {isProcessing ? 'Processando...' : `Pagar R$ ${(appointmentData.price || 0).toFixed(2)}`}
            </Button>
       </div>
    </form>
  )
}

const PaymentModal: React.FC<PaymentModalProps> = ({ appointmentData, onClose }) => {
  const { barbershops } = useContext(AppContext);
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
    
    setIsProcessing(true);
    api.createPaymentIntent(appointmentData, integrations.stripeAccountId!)
      .then(secret => {
        setClientSecret(secret);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setIsProcessing(false));
  }, [appointmentData, isStripeConnected, integrations]);


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
        
        {(isProcessing || !clientSecret) && !error && (
          <div className="text-center text-gray-400 my-4 flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>Inicializando gateway de pagamento...</p>
          </div>
        )}

        {clientSecret && !error && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm 
              appointmentData={appointmentData} 
              clientSecret={clientSecret}
              onSuccess={() => setIsSuccess(true)}
              isProcessing={isProcessing}
              onProcessing={setIsProcessing}
              onError={setError}
            />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;