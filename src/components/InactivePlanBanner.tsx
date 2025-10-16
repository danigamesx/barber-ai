import React, { useState, useContext } from 'react';
import Button from './Button';
import PlansModal from '../screens/barbershop/PlansModal';
import { AppContext } from '../App';

const InactivePlanBanner: React.FC = () => {
    // FIX: Destructured 'setPurchaseIntent' from context to handle purchase initiation.
    const { setPurchaseIntent } = useContext(AppContext);
    const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);

    // FIX: Created handler to set the purchase intent when a plan is selected.
    const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
        setPurchaseIntent({ planId, billingCycle });
        setIsPlansModalOpen(false);
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
                        <Button onClick={() => setIsPlansModalOpen(true)} className="py-2 px-4 text-sm w-auto bg-red-600 hover:bg-red-700 text-white">Ver Planos</Button>
                    </div>
                </div>
            </div>
            {/* FIX: Passed the required onInitiatePurchase prop to PlansModal */}
            {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
        </>
    )
}

export default InactivePlanBanner;