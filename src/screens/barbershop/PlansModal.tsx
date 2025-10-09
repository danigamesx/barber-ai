import React, { useState, useContext } from 'react';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import { PLANS } from '../../constants';
import { AppContext } from '../../App';

interface PlansModalProps {
  onClose: () => void;
  // FIX: Added required onInitiatePurchase prop to handle purchase logic in the parent component.
  onInitiatePurchase: (planId: string, billingCycle: 'monthly' | 'annual') => void;
}

const PlansModal: React.FC<PlansModalProps> = ({ onClose, onInitiatePurchase }) => {
  const { setPurchaseIntent } = useContext(AppContext);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handlePurchase = (planId: string, cycle: 'monthly' | 'annual') => {
    // FIX: Call the onInitiatePurchase prop instead of setting state directly.
    onInitiatePurchase(planId, cycle);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-4xl rounded-lg shadow-xl p-6 relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-2xl font-bold mb-2 text-center text-brand-primary">Nossos Planos</h2>
        <p className="text-center text-gray-400 text-sm mb-4">Escolha o plano ideal para o seu negócio.</p>

        <div className="flex justify-center my-4">
            <div className="bg-brand-secondary rounded-lg p-1 flex">
                <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-md font-semibold transition text-sm ${billingCycle === 'monthly' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}
                >
                    Mensal
                </button>
                <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-md font-semibold transition text-sm relative ${billingCycle === 'annual' ? 'bg-brand-primary text-brand-dark' : 'text-gray-300'}`}
                >
                    Anual
                    <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ECONOMIZE</span>
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.filter(p => p.id !== 'INACTIVE').map(plan => {
            const isAnnual = billingCycle === 'annual';
            const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
            const monthlyEquivalent = isAnnual ? price / 12 : price;
            const showOnlinePayments = plan.id === 'BASIC' ? (isAnnual || plan.features.onlinePayments) : plan.features.onlinePayments;

            return (
              <div key={plan.id} className={`bg-brand-secondary p-6 rounded-lg flex flex-col border-2 ${plan.id === 'PRO' ? 'border-brand-primary' : 'border-gray-700'} transition`}>
                <h3 className="font-bold text-2xl text-amber-300">{plan.name}</h3>
                <div className="my-4">
                    <p className="font-bold text-3xl text-white">R$ {monthlyEquivalent.toFixed(2).replace('.',',')}<span className="text-lg text-gray-400">/mês</span></p>
                    {isAnnual && <p className="text-xs text-gray-400">Cobrado R$ {price.toFixed(2).replace('.',',')} anualmente</p>}
                </div>
                
                <ul className="text-sm text-gray-300 space-y-2 flex-grow mb-6">
                  <li className="flex items-start gap-2"><span>✓</span> <span>Até {plan.maxBarbers === Infinity ? 'Ilimitados' : plan.maxBarbers} barbeiro(s)</span></li>
                  <li className={`flex items-start gap-2 ${plan.features.analytics ? '' : 'text-gray-500 line-through'}`}><span>{plan.features.analytics ? '✓' : '✕'}</span> <span>Análises de Desempenho</span></li>
                  <li className={`flex items-start gap-2 ${plan.features.marketing ? '' : 'text-gray-500 line-through'}`}><span>{plan.features.marketing ? '✓' : '✕'}</span> <span>Ferramentas de Marketing</span></li>
                  <li className={`flex items-start gap-2 ${plan.features.googleCalendar ? '' : 'text-gray-500 line-through'}`}><span>{plan.features.googleCalendar ? '✓' : '✕'}</span> <span>Integração Google Agenda</span></li>
                  <li className={`flex items-start gap-2 ${showOnlinePayments ? '' : 'text-gray-500 line-through'}`}>
                    <span className={`${plan.id === 'BASIC' && isAnnual ? 'text-green-400 font-bold' : ''}`}>{showOnlinePayments ? '✓' : '✕'}</span> 
                    <span>Pagamentos Online {plan.id === 'BASIC' && isAnnual ? '(Bônus Anual!)' : ''}</span>
                  </li>
                  <li className={`flex items-start gap-2 ${plan.features.packagesAndSubscriptions ? '' : 'text-gray-500 line-through'}`}><span>{plan.features.packagesAndSubscriptions ? '✓' : '✕'}</span> <span>Pacotes e Assinaturas</span></li>
                </ul>
                 <Button onClick={() => handlePurchase(plan.id, billingCycle)} variant={plan.id === 'PRO' ? 'primary' : 'secondary'} className="mt-auto">Contratar Plano</Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlansModal;