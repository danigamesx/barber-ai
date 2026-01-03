import React, { useState, useContext, useEffect } from 'react';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import * as api from '../../api';
import { PLANS } from '../../constants';
import { AppContext } from '../../App';
import Button from '../../components/Button';

declare global {
    interface Window {
        MercadoPago: any;
    }
}

interface PlanPaymentModalProps {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  onClose: () => void;
}

const PlanPaymentBrick: React.FC<{ preferenceId: string; publicKey: string }> = ({ preferenceId, publicKey }) => {
    useEffect(() => {
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();
        let paymentBrickController: any = null;

        const renderBrick = async () => {
            const settings = {
                initialization: { preferenceId: preferenceId },
                customization: {
                    visual: { style: { theme: 'dark' } },
                    paymentMethods: { creditCard: 'all', debitCard: 'all', pix: 'all' },
                },
                callbacks: {
                    onReady: () => {},
                    onError: (error: any) => { console.error("Plan Payment Brick Error:", error); },
                },
            };
            
            const container = document.getElementById('plan-payment-brick-container');
            if (container) {
                container.innerHTML = '';
                paymentBrickController = await bricksBuilder.create('payment', 'plan-payment-brick-container', settings);
            }
        };
        
        renderBrick();

        return () => {
             if (paymentBrickController) {
                try {
                     paymentBrickController.unmount();
                } catch (e) { console.error("Error unmounting plan brick:", e); }
             }
        }
    }, [preferenceId, publicKey]);

    return <div id="plan-payment-brick-container" />;
};


const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({ planId, billingCycle, onClose }) => {
    const { barbershopData } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);

    const plan = PLANS.find(p => p.id === planId);
    const price = billingCycle === 'annual' ? plan?.priceAnnual : plan?.priceMonthly;

    useEffect(() => {
        if (!barbershopData) return;
        
        api.createPlanPreference(planId, billingCycle, barbershopData.id)
            .then(({ preferenceId, publicKey }) => {
                setPreferenceId(preferenceId);
                setPublicKey(publicKey);
            })
            .catch(err => {
                setError(err.message || "Erro ao iniciar assinatura.");
            })
            .finally(() => setIsLoading(false));
    }, [planId, billingCycle, barbershopData]);

    if (!plan) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                    <XCircleIcon className="w-8 h-8" />
                </button>
                
                <div className="flex-shrink-0">
                    <h2 className="text-xl font-bold mb-2 text-center">Assinar Plano</h2>
                    <p className="text-center text-gray-400 mb-6">Você escolheu o plano <strong>{plan.name}</strong>.</p>
                </div>
                
                <div className="flex-grow overflow-y-auto -mx-2 px-2">
                    <div className="bg-brand-secondary p-4 rounded-lg mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">Ciclo {billingCycle === 'annual' ? 'Anual' : 'Mensal'}</span>
                            <span className="font-bold text-lg text-green-400">R$ {(price || 0).toFixed(2).replace('.',',')}</span>
                        </div>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                    
                    {isLoading && (
                        <div className="text-center text-gray-400 my-4">
                            <p>Carregando pagamento...</p>
                        </div>
                    )}
                    
                    {!isLoading && !error && preferenceId && publicKey && (
                        <PlanPaymentBrick preferenceId={preferenceId} publicKey={publicKey} />
                    )}
                </div>
                 <p className="text-xs text-gray-500 text-center mt-4 flex-shrink-0">Processado de forma segura pelo Mercado Pago.</p>
            </div>
        </div>
    );
};

export default PlanPaymentModal;