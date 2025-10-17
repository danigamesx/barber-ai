

import React, { useState } from 'react';
import { SubscriptionPlan, Service } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons/OutlineIcons';

interface ManageSubscriptionsModalProps {
  currentSubscriptions: SubscriptionPlan[];
  availableServices: Service[];
  onClose: () => void;
  onSave: (subscriptions: SubscriptionPlan[]) => void;
}

const emptySubscription: Omit<SubscriptionPlan, 'id'> = {
  name: '',
  price: 0,
  serviceIds: [],
  usesPerMonth: 1,
};

const ManageSubscriptionsModal: React.FC<ManageSubscriptionsModalProps> = ({ currentSubscriptions, availableServices, onClose, onSave }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>(currentSubscriptions);
  const [editingSubscription, setEditingSubscription] = useState<(Omit<SubscriptionPlan, 'id'> & { id?: string }) | null>(null);

  const handleSaveSubscription = () => {
    if (!editingSubscription) return;
    
    let updatedSubscriptions;
    if (editingSubscription.id) {
      updatedSubscriptions = subscriptions.map(s => s.id === editingSubscription.id ? (editingSubscription as SubscriptionPlan) : s);
    } else {
      updatedSubscriptions = [...subscriptions, { ...editingSubscription, id: `sub_${Date.now()}` }];
    }
    setSubscriptions(updatedSubscriptions);
    setEditingSubscription(null);
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
  };
  
  const handleToggleServiceInSubscription = (serviceId: string) => {
    if (!editingSubscription) return;
    const currentIds = editingSubscription.serviceIds;
    const newIds = currentIds.includes(serviceId)
      ? currentIds.filter(id => id !== serviceId)
      : [...currentIds, serviceId];
    setEditingSubscription({ ...editingSubscription, serviceIds: newIds });
  };


  const renderSubscriptionForm = () => {
      if (!editingSubscription) return null;
      return (
          <div className="bg-brand-secondary p-4 rounded-lg mt-4 space-y-4">
              <h3 className="font-semibold text-lg">{editingSubscription.id ? 'Editar Assinatura' : 'Nova Assinatura'}</h3>
               <div>
                <label htmlFor="sub-name" className="block text-sm font-medium text-gray-400 mb-1">Nome da Assinatura</label>
                <input id="sub-name" type="text" placeholder="Ex: Clube BarberAI Mensal" value={editingSubscription.name} onChange={e => setEditingSubscription({...editingSubscription, name: e.target.value})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                    <label htmlFor="sub-price" className="block text-sm font-medium text-gray-400 mb-1">Preço Mensal (R$)</label>
                    <input id="sub-price" type="number" placeholder="99,90" value={editingSubscription.price} onChange={e => setEditingSubscription({...editingSubscription, price: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
                </div>
                 <div className="w-1/2">
                    <label htmlFor="sub-uses" className="block text-sm font-medium text-gray-400 mb-1">Usos por Mês</label>
                    <input id="sub-uses" type="number" placeholder="4" value={editingSubscription.usesPerMonth} onChange={e => setEditingSubscription({...editingSubscription, usesPerMonth: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
                </div>
              </div>
              <div>
                  <h4 className="font-semibold mb-2">Serviços Inclusos</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableServices.map(service => (
                          <label key={service.id} className="flex items-center gap-2 bg-brand-dark p-2 rounded-md">
                              <input type="checkbox" checked={editingSubscription.serviceIds.includes(service.id)} onChange={() => handleToggleServiceInSubscription(service.id)} className="accent-brand-primary w-5 h-5"/>
                              <span>{service.name}</span>
                          </label>
                      ))}
                  </div>
              </div>
              <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => setEditingSubscription(null)}>Cancelar</Button>
                  <Button onClick={handleSaveSubscription}>Salvar Assinatura</Button>
              </div>
          </div>
      )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-md rounded-lg shadow-xl p-6 relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Gerenciar Assinaturas</h2>
            <button onClick={() => setEditingSubscription(emptySubscription)} className="text-brand-primary"><PlusCircleIcon className="w-8 h-8"/></button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-2">
            {subscriptions.map(sub => (
                <div key={sub.id} className="bg-brand-secondary p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{sub.name}</p>
                        <p className="text-xs text-gray-400">{sub.usesPerMonth} uso(s)/mês por R${sub.price}</p>
                    </div>
                     <div className="flex gap-3">
                        <button onClick={() => setEditingSubscription(sub)} className="text-gray-400 hover:text-brand-primary"><PencilIcon className="w-5 h-5"/></button>
                        <button onClick={() => handleDeleteSubscription(sub.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            ))}
            {subscriptions.length === 0 && !editingSubscription && <p className="text-gray-400 text-center py-4">Nenhuma assinatura criada.</p>}
            {renderSubscriptionForm()}
        </div>

        <div className="mt-8">
          <Button onClick={() => onSave(subscriptions)}>Salvar Alterações e Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscriptionsModal;
