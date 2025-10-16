import React, { useState, useContext } from 'react';
import Button from './Button';
import PlansModal from '../screens/barbershop/PlansModal';
// FIX: Import AppContext to access the global purchase intent setter.
import { AppContext } from '../App';

interface TrialBannerProps {
  trialEndDate: Date;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ trialEndDate }) => {
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  // FIX: Get setPurchaseIntent from the context to initiate a purchase.
  const { setPurchaseIntent } = useContext(AppContext);
  const now = new Date();
  const remainingMilliseconds = trialEndDate.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24)));

  // FIX: Define a handler to set the purchase intent in the App's state.
  const handleInitiatePurchase = (planId: string, billingCycle: 'monthly' | 'annual') => {
    setPurchaseIntent({ planId, billingCycle });
    setIsPlansModalOpen(false);
  };

  return (
    <>
      <div className="bg-amber-500/20 border-t-4 border-amber-500 text-amber-300 px-4 py-3 shadow-md md:relative" role="alert">
        <div className="flex items-center justify-center flex-wrap max-w-7xl mx-auto">
          <div className="py-1 flex-grow">
            <p className="font-bold text-center md:text-left">Você está no período de teste gratuito!</p>
            <p className="text-sm text-center md:text-left">Restam {remainingDays} dia(s). Aproveite todos os recursos do plano Premium.</p>
          </div>
          <div className="ml-auto mt-2 md:mt-0 flex-shrink-0">
            <Button onClick={() => setIsPlansModalOpen(true)} className="py-2 px-4 text-sm w-auto">Ver Planos</Button>
          </div>
        </div>
      </div>
      {/* FIX: Pass the onInitiatePurchase prop to PlansModal to handle the purchase flow. */}
      {isPlansModalOpen && <PlansModal onClose={() => setIsPlansModalOpen(false)} onInitiatePurchase={handleInitiatePurchase} />}
    </>
  );
};

export default TrialBanner;
