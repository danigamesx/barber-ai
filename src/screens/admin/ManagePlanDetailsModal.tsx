import React, { useState, useEffect } from 'react';
import { SubscriptionPlanDetails } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface ManagePlanDetailsModalProps {
  plan: SubscriptionPlanDetails | null;
  onClose: () => void;
  onSave: (plan: SubscriptionPlanDetails) => void;
}

const emptyPlan: SubscriptionPlanDetails = {
    id: `custom_${Date.now()}`,
    name: '',
    description: '',
    priceMonthly: 0,
    priceAnnual: 0,
    maxBarbers: 1,
    features: {
        analytics: false,
        marketing: false,
        googleCalendar: false,
        onlinePayments: false,
        packagesAndSubscriptions: false,
    },
};

const ManagePlanDetailsModal: React.FC<ManagePlanDetailsModalProps> = ({ plan, onClose, onSave }) => {
  const [formData, setFormData] = useState<SubscriptionPlanDetails>(emptyPlan);

  useEffect(() => {
    if (plan) {
      setFormData(plan);
    } else {
      setFormData(emptyPlan);
    }
  }, [plan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFeatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [name]: checked },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const renderFeatureToggle = (name: keyof SubscriptionPlanDetails['features'], label: string) => (
    <label className="flex items-center justify-between bg-brand-dark p-3 rounded-md">
        <span>{label}</span>
        <input
            type="checkbox"
            name={name}
            checked={formData.features[name]}
            onChange={handleFeatureChange}
            className="toggle-checkbox"
        />
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-lg rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-center">{plan ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome do Plano" className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" required />
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descrição do Plano" rows={2} className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" name="priceMonthly" value={formData.priceMonthly} onChange={handleChange} placeholder="Preço Mensal (R$)" className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" />
            <input type="number" name="priceAnnual" value={formData.priceAnnual} onChange={handleChange} placeholder="Preço Anual (R$)" className="w-full px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-400">Máximo de Barbeiros (use 999 para ilimitado)</label>
            <input type="number" name="maxBarbers" value={formData.maxBarbers === Infinity ? 999 : formData.maxBarbers} onChange={(e) => setFormData(prev => ({...prev, maxBarbers: parseInt(e.target.value) === 999 ? Infinity : parseInt(e.target.value) || 1}))} className="w-full mt-1 px-4 py-2 bg-brand-secondary border border-gray-600 rounded-lg" />
          </div>

          <div>
            <h3 className="font-semibold mb-2">Recursos Habilitados</h3>
            <div className="space-y-2 text-sm">
                {renderFeatureToggle('analytics', 'Análises de Desempenho')}
                {renderFeatureToggle('marketing', 'Ferramentas de Marketing')}
                {renderFeatureToggle('googleCalendar', 'Integração Google Agenda')}
                {renderFeatureToggle('onlinePayments', 'Pagamentos Online')}
                {renderFeatureToggle('packagesAndSubscriptions', 'Pacotes e Assinaturas')}
            </div>
          </div>

           <style>{`
            .toggle-checkbox { appearance: none; width: 3.5rem; height: 1.75rem; background-color: #374151; border-radius: 9999px; position: relative; cursor: pointer; transition: background-color 0.2s ease-in-out; }
            .toggle-checkbox::before { content: ''; width: 1.5rem; height: 1.5rem; background-color: white; border-radius: 9999px; position: absolute; top: 0.125rem; left: 0.125rem; transition: transform 0.2s ease-in-out; }
            .toggle-checkbox:checked { background-color: #FBBF24; }
            .toggle-checkbox:checked::before { transform: translateX(1.75rem); }
            `}</style>
        
            <div className="pt-4 flex gap-4">
                <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
                <Button type="submit">Salvar Plano</Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ManagePlanDetailsModal;
