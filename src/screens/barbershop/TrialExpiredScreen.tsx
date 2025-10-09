import React, { useContext, useState } from 'react';
import Button from '../../components/Button';
import { AppContext } from '../../App';
import PlansModal from './PlansModal';

const TrialExpiredScreen: React.FC = () => {
    const { logout, setPurchaseIntent } = useContext(AppContext);
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

    const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
        setPurchaseIntent({ planId, billingCycle });
        setIsPlansModalOpen(false);
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
            {/* FIX: Passed the required onInitiatePurchase prop to PlansModal */}
            {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
        </>
    );
};

export default TrialExpiredScreen;