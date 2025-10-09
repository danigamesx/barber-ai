import React, { useState } from 'react';
import Button from './Button';
import PlansModal from '../screens/barbershop/PlansModal';

// The App component now controls the plan purchase flow
declare global {
  interface Window {
    setPurchaseIntent: (planId: string, billingCycle: 'monthly' | 'annual') => void;
  }
}

const InactivePlanBanner: React.FC = () => {
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

    const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
        setIsPlansModalOpen(false);
        window.setPurchaseIntent(planId, billingCycle);
    };
    
    return (
        <>
            <div className="bg-red-900/50 border-t-4 border-red-500 text-red-300 px-4 py-3 shadow-md" role="alert">
                <div className="flex items-center justify-center flex-wrap max-w-7xl mx-auto">
                    <div className="py-1 flex-grow">
                        <p className="font-bold text-center md:text-left">Assinatura Expirada</p>
                        <p className="text-sm text-center md:text-left">Seu acesso está limitado. Renove seu plano para reativar todas as funcionalidades.</p>
                    </div>
                    <div className="ml-auto mt-2 md:mt-0 flex-shrink-0">
                        <Button onClick={() => setIsPlansModalOpen(true)} className="py-2 px-4 text-sm w-auto bg-red-600 hover:bg-red-700 text-white">Renovar Plano</Button>
                    </div>
                </div>
            </div>
            {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
        </>
    )
}

export default InactivePlanBanner;