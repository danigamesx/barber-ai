import React, { useContext, useState } from 'react';
import Button from '../../components/Button';
import { AppContext } from '../../App';
import PlansModal from './PlansModal';

// The App component now controls the plan purchase flow
declare global {
  interface Window {
    setPurchaseIntent: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  }
}

const TrialExpiredScreen: React.FC = () => {
    const { logout } = useContext(AppContext);
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

    // FIX: Added handler for the onInitiatePurchase prop required by PlansModal.
    const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
        setIsPlansModalOpen(false);
        if (window.setPurchaseIntent) {
            window.setPurchaseIntent(planId, billingCycle);
        } else {
            alert(`Iniciando compra do plano ${planId} (${billingCycle}). Esta função deve ser implementada no componente pai.`);
        }
    };

    return (
        <>
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-dark text-center">
                <h1 className="text-3xl font-bold text-brand-primary mb-4">Seu Período de Teste Terminou</h1>
                <p className="text-gray-300 max-w-md mb-8">
                    Para continuar utilizando todas as funcionalidades do BarberAI, como a agenda e o marketing, por favor, entre em contato com nosso suporte para contratar um plano.
                </p>
                <div className="w-full max-w-xs space-y-4">
                    <Button onClick={() => setIsPlansModalOpen(true)}>Ver Planos</Button>
                    <Button variant="secondary" onClick={logout}>Sair</Button>
                </div>
            </div>
            {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
        </>
    );
};

export default TrialExpiredScreen;