import React, { useState, useContext } from 'react';
import { Barbershop, IntegrationSettings, Json } from '../../types';
import { AppContext } from '../../App';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';
import { PLANS } from '../../constants';

interface ManagePlanModalProps {
  barbershop: Barbershop;
  onClose: () => void;
}

const ManagePlanModal: React.FC<ManagePlanModalProps> = ({ barbershop, onClose }) => {
  const { updateBarbershopData } = useContext(AppContext);
  const currentIntegrations = barbershop.integrations as IntegrationSettings;
  
  const [selectedPlan, setSelectedPlan] = useState<string>(currentIntegrations?.plan || 'BASIC');
  const [planType, setPlanType] = useState<'monthly' | 'annual'>(currentIntegrations?.plan_type || 'monthly');
  const [status, setStatus] = useState<'active' | 'suspended'>(currentIntegrations?.plan_status || 'active');

  const handleSave = () => {
    const currentIntegrationsData = (typeof currentIntegrations === 'object' && currentIntegrations !== null) ? currentIntegrations : {};
    let updatedIntegrations: IntegrationSettings;

    if (status === 'suspended') {
        updatedIntegrations = {
            ...currentIntegrationsData,
            plan: selectedPlan,
            plan_type: planType,
            plan_status: 'suspended',
            plan_expires_at: undefined,
        };
    } else { 
        const newExpiryDate = new Date();
        if (planType === 'monthly') {
          newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
        } else {
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        }
        updatedIntegrations = {
            ...currentIntegrationsData,
            plan: selectedPlan,
            plan_type: planType,
            plan_expires_at: newExpiryDate.toISOString(),
            plan_status: 'active',
        };
    }
    
    updateBarbershopData(barbershop.id, { 
        integrations: updatedIntegrations as Json,
        trial_ends_at: null 
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">Gerenciar Plano</h2>
        <p className="text-center text-lg font-semibold text-brand-primary mb-6">{barbershop.name}</p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="plan-select" className="block text-sm font-medium text-gray-400">Plano</label>
            <select
              id="plan-select"
              value={selectedPlan}
              onChange={e => setSelectedPlan(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {PLANS.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} (M: R${plan.priceMonthly.toFixed(2)} / A: R${plan.priceAnnual.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Tipo de Cobrança</label>
            <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 w-full bg-brand-secondary p-3 rounded-lg border-2 border-transparent has-[:checked]:border-brand-primary">
                    <input type="radio" name="planType" value="monthly" checked={planType === 'monthly'} onChange={() => setPlanType('monthly')} className="accent-brand-primary"/>
                    Mensal
                </label>
                <label className="flex items-center gap-2 w-full bg-brand-secondary p-3 rounded-lg border-2 border-transparent has-[:checked]:border-brand-primary">
                    <input type="radio" name="planType" value="annual" checked={planType === 'annual'} onChange={() => setPlanType('annual')} className="accent-brand-primary"/>
                    Anual
                </label>
            </div>
          </div>
           <div>
            <label htmlFor="status-select" className="block text-sm font-medium text-gray-400">Status da Assinatura</label>
            <select
              id="status-select"
              value={status}
              onChange={e => setStatus(e.target.value as 'active' | 'suspended')}
              className="w-full mt-1 px-4 py-3 bg-brand-secondary border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="active">Ativa</option>
              <option value="suspended">Suspensa</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
};

export default ManagePlanModal;
