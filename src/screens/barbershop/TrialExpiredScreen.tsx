import React, { useContext, useState } from 'react';
import Button from '../../components/Button';
// FIX: Corrected import path to point to src/App.tsx instead of a non-existent root App.tsx
import { AppContext } from '../../App';
import PlansModal from './PlansModal';

const TrialExpiredScreen: React.FC = () => {
    // FIX: Destructure setPurchaseIntent from AppContext to handle plan purchases.
    const { logout, setPurchaseIntent } = useContext(AppContext);
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

    // FIX: Create a handler to set the purchase intent, which will be passed to the PlansModal.
    const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
        if (setPurchaseIntent) {
            setPurchaseIntent({ planId, billingCycle });
        }
        setIsPlansModalOpen(false);
    };

    return (
        <>
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-dark text-center">
                <h1 className="text-3xl font-bold text-brand-primary mb-4">Seu Período de Teste Terminou</h1>
                <p className="text-gray-300 max-w-md mb-8">
                    Para continuar utilizando todas as funcionalidades do BarberAI, por favor, entre em contato com nosso suporte para contratar um plano.
                </p>
                <div className="w-full max-w-xs space-y-4">
                    <Button onClick={() => setIsPlansModalOpen(true)}>Ver Planos</Button>
                    <Button variant="secondary" onClick={logout}>Sair</Button>
                </div>
            </div>
            {/* FIX: Passed the required onInitiatePurchase prop to PlansModal */}
            {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
        </>
    );
};

export default TrialExpiredScreen;