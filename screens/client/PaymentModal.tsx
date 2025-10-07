import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../App';
import { Appointment, IntegrationSettings } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import * as api from '../../api';

// Declarar o objeto MercadoPago no escopo global para o TypeScript
declare global {
    interface Window {
        MercadoPago: any;
    }
}

type NewAppointmentData = Omit<Appointment, 'id' | 'start_time' | 'end_time' | 'created_at'> & { start_time: Date, end_time: Date };

interface PaymentModalProps {
  appointmentData: NewAppointmentData;
  onClose: () => void;
}


// Componente isolado para renderizar o "Payment Brick" do Mercado Pago
// Isso evita que ele seja re-renderizado desnecessariamente, o que pode interromper o fluxo de pagamento.
const MercadoPagoPayment: React.FC<{
    preferenceId: string;
    publicKey: string;
    price: number;
}> = ({ preferenceId, publicKey, price }) => {
    useEffect(() => {
        if (!publicKey) {
            console.error("Public Key do Mercado Pago é necessária.");
            return;
        }

        const mp = new window.MercadoPago(publicKey, {
            locale: 'pt-BR'
        });
        const bricksBuilder = mp.bricks();
        let paymentBrickController: any = null;

        const renderPaymentBrick = async () => {
            const settings = {
                initialization: {
                    amount: price,
                    preferenceId: preferenceId,
                },
                customization: {
                    visual: { style: { theme: 'dark' } },
                    paymentMethods: { creditCard: 'all', debitCard: 'all', pix: 'all' },
                },
                callbacks: {
                    onReady: () => { /* Brick pronto */ },
                    onError: (error: any) => { console.error(error); },
                },
            };
            
            const container = document.getElementById('payment-brick-container');
            if (container) {
                container.innerHTML = ''; 
                paymentBrickController = await bricksBuilder.create('payment', 'payment-brick-container', settings);
            }
        };
        
        renderPaymentBrick();

        // Função de limpeza para desmontar o Brick ao fechar o modal
        return () => {
             if (paymentBrickController) {
                paymentBrickController.unmount();
             }
        }
    }, [preferenceId, publicKey, price]); // Dependências mínimas e estáveis

    return <div id="payment-brick-container"></div>;
};

const PaymentModal: React.FC<PaymentModalProps> = ({ appointmentData, onClose }) => {
    const { barbershops } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);

    const { service_name, price, barbershop_id } = appointmentData;
    const barbershop = barbershops.find(b => b.id === barbershop_id);
    const integrations = barbershop?.integrations as IntegrationSettings | undefined;
    
    const mpPublicKey = integrations?.mercadopagoPublicKey;
    const isMercadoPagoConnected = mpPublicKey && integrations?.mercadopagoAccessToken;

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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                
                <div className="flex-shrink-0">
                    <h2 className="text-xl font-bold mb-2 text-center">Pagamento Seguro</h2>
                    <p className="text-center text-gray-400 mb-6">Confirme seu agendamento para {service_name}.</p>
                </div>
                
                <div className="flex-grow overflow-y-auto -mx-2 px-2">
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

                    {preferenceId && !error && mpPublicKey && (
                        <MercadoPagoPayment
                            preferenceId={preferenceId}
                            publicKey={mpPublicKey}
                            price={price || 0}
                        />
                    )}
                </div>

                 <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2 mt-4 flex-shrink-0">
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
