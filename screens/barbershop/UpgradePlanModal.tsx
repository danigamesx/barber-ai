import React from 'react';
import Button from '../../components/Button';
import { XCircleIcon } from '../../components/icons/OutlineIcons';

interface UpgradePlanModalProps {
  featureName: string;
  requiredPlan: string;
  onClose: () => void;
}

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ featureName, requiredPlan, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-dark w-full max-w-sm rounded-lg shadow-xl p-6 text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <XCircleIcon className="w-8 h-8" />
        </button>
        <h2 className="text-2xl font-bold text-brand-primary mb-4">Recurso Bloqueado</h2>
        <p className="text-gray-300 mb-2">
          A funcionalidade <strong>{featureName}</strong> não está disponível no seu plano atual.
        </p>
        <p className="text-gray-300 mb-6">
          Para acessá-la, por favor, faça o upgrade para o plano <strong>{requiredPlan}</strong> ou superior.
        </p>
        <div className="space-y-3">
            <Button onClick={() => alert('Para fazer o upgrade, entre em contato com o suporte.')}>
                Fazer Upgrade
            </Button>
            <Button variant="secondary" onClick={onClose}>
                Fechar
            </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePlanModal;
