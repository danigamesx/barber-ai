import React, { useState } from 'react';
import { PLANS } from '../../constants';
import Button from '../../components/Button';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '../../components/icons/OutlineIcons';
import ManagePlanDetailsModal from './ManagePlanDetailsModal';
import { SubscriptionPlanDetails } from '../../types';

const PlansManagement: React.FC = () => {
    // Em uma aplicação real, isso viria de uma API. 
    // Para esta simulação, vamos gerenciar o estado localmente.
    // As mudanças não persistirão após recarregar a página.
    const [plans, setPlans] = useState<SubscriptionPlanDetails[]>(PLANS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlanDetails | null>(null);

    const handleOpenModal = (plan: SubscriptionPlanDetails | null) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingPlan(null);
        setIsModalOpen(false);
    };

    const handleSavePlan = (planToSave: SubscriptionPlanDetails) => {
        // Simula o salvamento. A UI será atualizada, mas não persistirá.
        if (plans.some(p => p.id === planToSave.id)) {
            setPlans(plans.map(p => p.id === planToSave.id ? planToSave : p));
        } else {
            setPlans([...plans, planToSave]);
        }
        alert("Funcionalidade de salvar demonstrada. Para persistir as mudanças, seriam necessárias alterações no backend/banco de dados.");
        handleCloseModal();
    };

    const handleDeletePlan = (planId: string) => {
        if (window.confirm("Tem certeza que deseja remover este plano? Esta ação é uma demonstração.")) {
            setPlans(plans.filter(p => p.id !== planId));
            alert("Plano removido (demonstração).");
        }
    };

    return (
        <>
            <div className="bg-brand-secondary rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Planos de Assinatura</h2>
                    <Button onClick={() => handleOpenModal(null)} className="w-auto py-2 px-4 text-sm flex items-center gap-2">
                        <PlusCircleIcon className="w-5 h-5" />
                        Criar Novo Plano
                    </Button>
                </div>
                
                <div className="space-y-4">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-brand-dark p-4 rounded-lg flex flex-col md:flex-row justify-between md:items-center">
                            <div className="mb-4 md:mb-0">
                                <h3 className="text-lg font-bold text-brand-primary">{plan.name}</h3>
                                <p className="text-sm text-gray-400">{plan.description}</p>
                                <div className="flex gap-4 text-sm mt-2">
                                    <span>Mensal: <strong className="text-white">R${plan.priceMonthly.toFixed(2)}</strong></span>
                                    <span>Anual: <strong className="text-white">R${plan.priceAnnual.toFixed(2)}</strong></span>
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex gap-4">
                                <Button onClick={() => handleOpenModal(plan)} variant="secondary" className="w-auto py-2 px-4 text-sm">
                                    <PencilIcon className="w-4 h-4" />
                                </Button>
                                <Button onClick={() => handleDeletePlan(plan.id)} variant="danger" className="w-auto py-2 px-4 text-sm">
                                    <TrashIcon className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <ManagePlanDetailsModal
                    plan={editingPlan}
                    onClose={handleCloseModal}
                    onSave={handleSavePlan}
                />
            )}
        </>
    );
};

export default PlansManagement;
