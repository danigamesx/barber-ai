import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../App';
import { Appointment, IntegrationSettings } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, CheckCircleIcon, CalendarIcon } from '../../components/icons/OutlineIcons';
import { generateGoogleCalendarLink } from '../../utils/calendar';
import * as api from '../../api';

// Declarar o objeto MercadoPago no escopo global para o TypeScript
declare global {
    interface Window {
        MercadoPago: any;
    }
}

// FIX: Added manual type declarations for import.meta.env to use Vite environment variables correctly.
interface ImportMetaEnv {
    readonly VITE_MERCADOPAGO_PUBLIC_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface PaymentModalProps {
  appointmentData: NewAppointmentData;
  onClose: () => void;
}


// Este componente renderiza o "Payment Brick" do Mercado Pago
const MercadoPagoPayment: React.FC<{
    preferenceId: string;
    appointmentData: NewAppointmentData;
}> = ({ preferenceId, appointmentData }) => {

    useEffect(() => {
        // FIX: Changed process.env to import.meta.env for Vite client-side environment variables.
        const mp = new window.MercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, {
            locale: 'pt-BR'
        });
        const bricksBuilder = mp.bricks();

        const renderPaymentBrick = async () => {
            const settings = {
                initialization: {
                    amount: appointmentData.price,
                    preferenceId: preferenceId,
                },
                customization: {
                    visual: {
                        style: {
                            theme: 'dark',
                        }
                    },
                    paymentMethods: {
                        creditCard: 'all',
                        debitCard: 'all',
                        pix: 'all',
                    },
                },
                callbacks: {
                    onReady: () => {
                        /* Brick pronto para ser usado */
                    },
                    onSubmit: () => {
                        // O Brick já lida com a submissão.
                        // O webhook cuidará da confirmação final.
                        // Aqui, podemos mostrar um loading para o usuário.
                        return new Promise(() => {});
                    },
                    onError: (error: any) => {
                        console.error(error);
                    },
                },
            };
            
            const container = document.getElementById('payment-brick-container');
            if (container) {
                container.innerHTML = '';
            }
            
            // Await a criação do brick
            await bricksBuilder.create('payment', 'payment-brick-container', settings);
        };
        
        renderPaymentBrick();
    }, [preferenceId, appointmentData]);

    return <div id="payment-brick-container"></div>;
};

const PaymentModal: React.FC<PaymentModalProps> = ({ appointmentData, onClose }) => {
    const { barbershops } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);

    const { service_name, price, barbershop_id } = appointmentData;
    const barbershop = barbershops.find(b => b.id === barbershop_id);
    const integrations = barbershop?.integrations as IntegrationSettings;
    
    // Agora verificamos a conexão do Mercado Pago
    const isMercadoPagoConnected = integrations?.mercadopagoPublicKey && integrations?.mercadopagoAccessToken;

    useEffect(() => {
        if (!isMercadoPagoConnected) {
            setError("Esta barbearia não está configurada para receber pagamentos online.");
            setIsLoading(false);
            return;
        }

        api.createMercadoPagoPreference(appointmentData)
            .then(id => {
                setPreferenceId(id);
            })
            .catch(err => {
                setError(err.message || "Falha ao criar a preferência de pagamento.");
            })
            .finally(() => setIsLoading(false));

    }, [appointmentData, isMercadoPagoConnected]);

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
                    <p className="text-gray-400 mb-6">Seu agendamento para {service_name} está confirmado. O status será atualizado em breve.</p>
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
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                <h2 className="text-xl font-bold mb-2 text-center">Pagamento Seguro</h2>
                <p className="text-center text-gray-400 mb-6">Confirme seu agendamento para {service_name}.</p>
                
                <div className="bg-brand-secondary p-4 rounded-lg mb-6">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">Valor Total</span>
                        <span className="font-bold text-lg">R$ {(price || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                {error && <p className="text-red-500 text-sm text-center my-4">{error}</p>}
                
                {isLoading && !error && (
                    <div className="text-center text-gray-400 my-4 flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p>Inicializando pagamento...</p>
                    </div>
                )}

                {preferenceId && !error && (
                    <MercadoPagoPayment
                        preferenceId={preferenceId}
                        appointmentData={appointmentData}
                    />
                )}
                 <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2 mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Pagamento seguro processado pelo Mercado Pago.
                </p>
            </div>
        </div>
    );
};

export default PaymentModal;