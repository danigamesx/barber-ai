
import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types';
import Button from '../../components/Button';
import { XCircleIcon, PlusCircleIcon, PencilIcon, TrashIcon } from '../../components/icons/OutlineIcons';

interface ManageSubscriptionsModalProps {
  currentSubscriptions: SubscriptionPlan[];
  onClose: () => void;
  onSave: (subscriptions: SubscriptionPlan[]) => void;
}

const emptySubscription: Omit<SubscriptionPlan, 'id'> = {
  name: '',
  price: 0,
  benefits: [''],
};

const ManageSubscriptionsModal: React.FC<ManageSubscriptionsModalProps> = ({ currentSubscriptions, onClose, onSave }) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionPlan[]>(currentSubscriptions);
  const [editingSubscription, setEditingSubscription] = useState<(Omit<SubscriptionPlan, 'id'> & { id?: string }) | null>(null);

  const handleSaveSubscription = () => {
    if (!editingSubscription) return;
    // Filter out empty benefits before saving
    const finalSubscription = {
      ...editingSubscription,
      benefits: editingSubscription.benefits.filter(b => b.trim() !== '')
    };

    let updatedSubscriptions;
    if (finalSubscription.id) {
      updatedSubscriptions = subscriptions.map(s => s.id === finalSubscription.id ? (finalSubscription as SubscriptionPlan) : s);
    } else {
      updatedSubscriptions = [...subscriptions, { ...finalSubscription, id: `sub_${Date.now()}` }];
    }
    setSubscriptions(updatedSubscriptions);
    setEditingSubscription(null);
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
  };
  
  const handleBenefitChange = (index: number, value: string) => {
      if (!editingSubscription) return;
      const newBenefits = [...editingSubscription.benefits];
      newBenefits[index] = value;
      setEditingSubscription({ ...editingSubscription, benefits: newBenefits });
  };
  
  const addBenefitField = () => {
      if (!editingSubscription) return;
      setEditingSubscription({ ...editingSubscription, benefits: [...editingSubscription.benefits, ''] });
  };
  
  const removeBenefitField = (index: number) => {
      if (!editingSubscription) return;
      const newBenefits = editingSubscription.benefits.filter((_, i) => i !== index);
      setEditingSubscription({ ...editingSubscription, benefits: newBenefits });
  };

  const renderSubscriptionForm = () => {
      if (!editingSubscription) return null;
      return (
          <div className="bg-brand-secondary p-4 rounded-lg mt-4 space-y-4">
              <h3 className="font-semibold text-lg">{editingSubscription.id ? 'Editar Assinatura' : 'Nova Assinatura'}</h3>
              <input type="text" placeholder="Nome da Assinatura" value={editingSubscription.name} onChange={e => setEditingSubscription({...editingSubscription, name: e.target.value})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
              <input type="number" placeholder="Preço Mensal (R$)" value={editingSubscription.price} onChange={e => setEditingSubscription({...editingSubscription, price: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 bg-brand-dark border border-gray-600 rounded-lg" />
              <div>
                  <h4 className="font-semibold mb-2">Benefícios</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {editingSubscription.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <input type="text" value={benefit} onChange={e => handleBenefitChange(index, e.target.value)} placeholder="Descreva um benefício" className="flex-grow px-3 py-2 bg-brand-dark border border-gray-600 rounded-lg text-sm" />
                              <button onClick={() => removeBenefitField(index)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                          </div>
                      ))}
                  </div>
                  <button onClick={addBenefitField} className="text-sm text-brand-primary mt-2 flex items-center gap-1"><PlusCircleIcon className="w-5 h-5"/> Adicionar benefício</button>
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
                        <p className="text-xs text-gray-400">R${sub.price}/mês</p>
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
